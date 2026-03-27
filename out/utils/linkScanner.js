"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanInvalidLinks = scanInvalidLinks;
exports.scanAndGenerateReport = scanAndGenerateReport;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fileUtils_1 = require("./fileUtils");
/**
 * 从 Markdown 文档中提取所有链接
 */
function extractLinks(document) {
    const text = document.getText();
    const links = [];
    const filePath = document.uri.fsPath;
    // Standard Markdown links: ![alt](path) or [text](path)
    const linkPattern = /!?\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const linkText = match[1];
        const linkTarget = match[2].trim();
        const isImage = fullMatch.startsWith('!');
        const startOffset = match.index;
        const startPosition = document.positionAt(startOffset);
        links.push({
            text: linkText,
            target: linkTarget,
            isImage,
            line: startPosition.line + 1,
            filePath
        });
    }
    // Obsidian embed syntax: ![[filename]] or ![[filename|display]]
    const obsidianPattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    while ((match = obsidianPattern.exec(text)) !== null) {
        const filename = match[1].trim();
        const displayText = match[2] ? match[2].trim() : filename;
        // Determine if it's an image based on extension
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const IMAGE_EXTENSIONS = new Set([
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'apng'
        ]);
        const isImage = IMAGE_EXTENSIONS.has(ext);
        const startOffset = match.index;
        const startPosition = document.positionAt(startOffset);
        links.push({
            text: displayText,
            target: filename,
            isImage,
            line: startPosition.line + 1,
            filePath
        });
    }
    return links;
}
/**
 * 判断链接是否为网络链接
 */
function isWebLink(target) {
    return target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('ftp://');
}
/**
 * 判断链接是否为特殊链接
 */
function isSpecialLink(target) {
    return target.startsWith('#') ||
        target.startsWith('mailto:') ||
        target.startsWith('tel:') ||
        target.startsWith('vscode:');
}
/**
 * 判断目标是否为纯文件名（Obsidian embed 语法）
 */
function isPureFilename(target) {
    // 不包含路径分隔符，且有扩展名
    return !target.includes('/') &&
        !target.includes('\\') &&
        target.includes('.');
}
/**
 * 解析相对路径为绝对路径
 */
function resolveLinkPath(link, documentUri) {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        return undefined;
    }
    let targetPath = link.target;
    // 移除 URL 参数
    const hashIndex = targetPath.indexOf('#');
    if (hashIndex > 0) {
        targetPath = targetPath.substring(0, hashIndex);
    }
    const queryIndex = targetPath.indexOf('?');
    if (queryIndex > 0) {
        targetPath = targetPath.substring(0, queryIndex);
    }
    // 空路径
    if (!targetPath) {
        return undefined;
    }
    // 绝对路径（以 / 开头，相对于工作区根目录）
    if (targetPath.startsWith('/')) {
        return vscode.Uri.joinPath(workspaceRoot, targetPath.substring(1));
    }
    // Obsidian embed syntax: 纯文件名，在 assets 目录中查找
    if (isPureFilename(targetPath)) {
        const config = vscode.workspace.getConfiguration('mdAssetManager');
        const assetsRoot = config.get('assetsRoot', 'assets');
        const imagesSubdir = config.get('imagesSubdir', 'images');
        const filesSubdir = config.get('filesSubdir', 'files');
        // 根据是否为图片选择子目录
        const subdir = link.isImage ? imagesSubdir : filesSubdir;
        return vscode.Uri.joinPath(workspaceRoot, assetsRoot, subdir, targetPath);
    }
    // 相对于当前文档的路径
    const docDir = path.dirname(documentUri.fsPath);
    return vscode.Uri.file(path.resolve(docDir, targetPath));
}
/**
 * 检查链接是否有效
 */
async function checkLink(link, documentUri) {
    // 网络链接不检查
    if (isWebLink(link.target)) {
        return true;
    }
    // 特殊链接不检查
    if (isSpecialLink(link.target)) {
        return true;
    }
    // 解析路径
    const targetUri = resolveLinkPath(link, documentUri);
    if (!targetUri) {
        return false;
    }
    try {
        await vscode.workspace.fs.stat(targetUri);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * 扫描单个 Markdown 文件
 */
async function scanMarkdownFile(uri) {
    const document = await vscode.workspace.openTextDocument(uri);
    const links = extractLinks(document);
    const checkedLinks = [];
    for (const link of links) {
        const isValid = await checkLink(link, uri);
        if (!isValid && !isWebLink(link.target) && !isSpecialLink(link.target)) {
            checkedLinks.push(link);
        }
    }
    return checkedLinks;
}
/**
 * 获取工作区中所有 Markdown 文件
 */
async function getMarkdownFiles() {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        return [];
    }
    const files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**', undefined);
    return files;
}
/**
 * 扫描工作区所有 Markdown 文件的无效链接
 */
async function scanInvalidLinks() {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        throw new Error('No workspace folder open');
    }
    const markdownFiles = await getMarkdownFiles();
    let validCount = 0;
    let webLinksCount = 0;
    const invalidLinks = [];
    // 显示进度
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在扫描无效链接...',
        cancellable: false
    }, async (progress) => {
        for (let i = 0; i < markdownFiles.length; i++) {
            const file = markdownFiles[i];
            progress.report({
                message: `(${i + 1}/${markdownFiles.length}) ${path.basename(file.fsPath)}`,
                increment: (100 / markdownFiles.length)
            });
            const document = await vscode.workspace.openTextDocument(file);
            const links = extractLinks(document);
            for (const link of links) {
                if (isWebLink(link.target)) {
                    webLinksCount++;
                    continue;
                }
                if (isSpecialLink(link.target)) {
                    continue;
                }
                const isValid = await checkLink(link, file);
                if (isValid) {
                    validCount++;
                }
                else {
                    invalidLinks.push(link);
                }
            }
        }
    });
    return {
        validCount,
        invalidCount: invalidLinks.length,
        invalidLinks,
        webLinksCount,
        scannedFiles: markdownFiles.length
    };
}
/**
 * 生成报告内容
 */
function generateReport(result) {
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN');
    let report = `# 无效链接扫描报告\n\n`;
    report += `**扫描时间**: ${timestamp}\n\n`;
    report += `---\n\n`;
    report += `## 扫描统计\n\n`;
    report += `| 项目 | 数量 |\n`;
    report += `|:---|:---:|\n`;
    report += `| 扫描文件数 | ${result.scannedFiles} |\n`;
    report += `| 有效链接 | ${result.validCount} |\n`;
    report += `| 无效链接 | ${result.invalidCount} |\n`;
    report += `| 网络链接（未检查） | ${result.webLinksCount} |\n`;
    report += `\n---\n\n`;
    if (result.invalidLinks.length === 0) {
        report += `## ✅ 没有发现无效链接\n\n`;
        report += `所有本地链接均有效。\n`;
    }
    else {
        report += `## ❌ 无效链接列表\n\n`;
        // 按文件分组
        const groupedByFile = new Map();
        for (const link of result.invalidLinks) {
            const relativePath = vscode.workspace.asRelativePath(link.filePath);
            if (!groupedByFile.has(relativePath)) {
                groupedByFile.set(relativePath, []);
            }
            groupedByFile.get(relativePath).push(link);
        }
        for (const [filePath, links] of groupedByFile) {
            report += `### ${filePath}\n\n`;
            report += `| 行号 | 类型 | 链接文本 | 目标路径 |\n`;
            report += `|:---:|:---:|:---|:---|\n`;
            for (const link of links) {
                const type = link.isImage ? '图片' : '链接';
                const escapedText = link.text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                const escapedTarget = link.target.replace(/\|/g, '\\|');
                report += `| ${link.line} | ${type} | ${escapedText || '(空)'} | \`${escapedTarget}\` |\n`;
            }
            report += `\n`;
        }
    }
    report += `\n---\n\n`;
    report += `*报告由 Markdown Asset Manager 生成*\n`;
    return report;
}
/**
 * 执行扫描并生成报告
 */
async function scanAndGenerateReport() {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        return;
    }
    try {
        const result = await scanInvalidLinks();
        // 生成报告
        const report = generateReport(result);
        const reportFileName = `invalid-links-report-${Date.now()}.md`;
        const reportUri = vscode.Uri.joinPath(workspaceRoot, reportFileName);
        // 写入报告文件
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(reportUri, encoder.encode(report));
        // 打开报告
        const document = await vscode.workspace.openTextDocument(reportUri);
        await vscode.window.showTextDocument(document);
        // 显示结果
        if (result.invalidCount === 0) {
            vscode.window.showInformationMessage(`扫描完成！没有发现无效链接。报告已保存到 ${reportFileName}`);
        }
        else {
            vscode.window.showWarningMessage(`扫描完成！发现 ${result.invalidCount} 个无效链接。报告已保存到 ${reportFileName}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`扫描失败: ${error}`);
    }
}
//# sourceMappingURL=linkScanner.js.map