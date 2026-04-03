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
exports.scanEmptyFiles = scanEmptyFiles;
exports.scanEmptyFilesAndGenerateReport = scanEmptyFilesAndGenerateReport;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fileUtils_1 = require("./fileUtils");
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
 * 检查文件是否为空（内容为空或只有空白字符）
 */
async function isEmptyFile(uri) {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        const size = stat.size;
        // 文件大小为 0，肯定是空文件
        if (size === 0) {
            return { isEmpty: true, size: 0 };
        }
        // 文件较小时，检查内容是否只有空白字符
        if (size <= 1024) {
            const content = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder().decode(content);
            const trimmed = text.trim();
            if (trimmed.length === 0) {
                return { isEmpty: true, size };
            }
        }
        return { isEmpty: false, size };
    }
    catch {
        return { isEmpty: false, size: 0 };
    }
}
/**
 * 扫描工作区所有 Markdown 文件，查找空文件
 */
async function scanEmptyFiles() {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        throw new Error('No workspace folder open');
    }
    const markdownFiles = await getMarkdownFiles();
    const emptyFiles = [];
    // 显示进度
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在扫描空文件...',
        cancellable: false
    }, async (progress) => {
        for (let i = 0; i < markdownFiles.length; i++) {
            const file = markdownFiles[i];
            progress.report({
                message: `(${i + 1}/${markdownFiles.length}) ${path.basename(file.fsPath)}`,
                increment: (100 / markdownFiles.length)
            });
            const { isEmpty, size } = await isEmptyFile(file);
            if (isEmpty) {
                emptyFiles.push({
                    filePath: file.fsPath,
                    relativePath: vscode.workspace.asRelativePath(file.fsPath),
                    size
                });
            }
        }
    });
    return {
        totalFiles: markdownFiles.length,
        emptyFiles
    };
}
/**
 * 生成报告内容
 */
function generateEmptyFileReport(result) {
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN');
    let report = `# 空文件扫描报告\n\n`;
    report += `**扫描时间**: ${timestamp}\n\n`;
    report += `---\n\n`;
    report += `## 扫描统计\n\n`;
    report += `| 项目 | 数量 |\n`;
    report += `|:---|:---:|\n`;
    report += `| 扫描文件数 | ${result.totalFiles} |\n`;
    report += `| 空文件数 | ${result.emptyFiles.length} |\n`;
    report += `\n---\n\n`;
    if (result.emptyFiles.length === 0) {
        report += `## ✅ 没有发现空文件\n\n`;
        report += `所有 Markdown 文件均有内容。\n`;
    }
    else {
        report += `## ⚠️ 空文件列表\n\n`;
        report += `以下文件为空或只包含空白字符：\n\n`;
        report += `| 文件路径 | 文件大小 |\n`;
        report += `|:---|:---:|\n`;
        for (const file of result.emptyFiles) {
            const sizeStr = file.size === 0 ? '0 B' : `${file.size} B (仅空白)`;
            report += `| \`${file.relativePath}\` | ${sizeStr} |\n`;
        }
        report += `\n### 建议操作\n\n`;
        report += `- 检查这些文件是否需要添加内容\n`;
        report += `- 如果不需要，可以考虑删除这些空文件\n`;
    }
    report += `\n---\n\n`;
    report += `*报告由 Markdown Asset Manager 生成*\n`;
    return report;
}
/**
 * 执行扫描并生成报告
 */
async function scanEmptyFilesAndGenerateReport() {
    const workspaceRoot = (0, fileUtils_1.getWorkspaceRoot)();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        return;
    }
    try {
        const result = await scanEmptyFiles();
        // 生成报告
        const report = generateEmptyFileReport(result);
        const reportFileName = `empty-files-report-${Date.now()}.md`;
        const reportUri = vscode.Uri.joinPath(workspaceRoot, reportFileName);
        // 写入报告文件
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(reportUri, encoder.encode(report));
        // 打开报告
        const document = await vscode.workspace.openTextDocument(reportUri);
        await vscode.window.showTextDocument(document);
        // 显示结果
        if (result.emptyFiles.length === 0) {
            vscode.window.showInformationMessage(`扫描完成！没有发现空文件。报告已保存到 ${reportFileName}`);
        }
        else {
            vscode.window.showWarningMessage(`扫描完成！发现 ${result.emptyFiles.length} 个空文件。报告已保存到 ${reportFileName}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`扫描失败: ${error}`);
    }
}
//# sourceMappingURL=emptyFileScanner.js.map