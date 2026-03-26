import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from './fileUtils';

/**
 * 表示一个 Markdown 链接
 */
interface MarkdownLink {
    text: string;
    target: string;
    isImage: boolean;
    line: number;
    filePath: string;
}

/**
 * 扫描结果
 */
interface ScanResult {
    validCount: number;
    invalidCount: number;
    invalidLinks: MarkdownLink[];
    webLinksCount: number;
    scannedFiles: number;
}

/**
 * 从 Markdown 文档中提取所有链接
 */
function extractLinks(document: vscode.TextDocument): MarkdownLink[] {
    const text = document.getText();
    const links: MarkdownLink[] = [];
    const filePath = document.uri.fsPath;
    
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
    
    return links;
}

/**
 * 判断链接是否为网络链接
 */
function isWebLink(target: string): boolean {
    return target.startsWith('http://') || 
           target.startsWith('https://') || 
           target.startsWith('ftp://');
}

/**
 * 判断链接是否为特殊链接
 */
function isSpecialLink(target: string): boolean {
    return target.startsWith('#') ||
           target.startsWith('mailto:') ||
           target.startsWith('tel:') ||
           target.startsWith('vscode:');
}

/**
 * 解析相对路径为绝对路径
 */
function resolveLinkPath(link: MarkdownLink, documentUri: vscode.Uri): vscode.Uri | undefined {
    const workspaceRoot = getWorkspaceRoot();
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
    
    // 相对于当前文档的路径
    const docDir = path.dirname(documentUri.fsPath);
    return vscode.Uri.file(path.resolve(docDir, targetPath));
}

/**
 * 检查链接是否有效
 */
async function checkLink(link: MarkdownLink, documentUri: vscode.Uri): Promise<boolean> {
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
    } catch {
        return false;
    }
}

/**
 * 扫描单个 Markdown 文件
 */
async function scanMarkdownFile(uri: vscode.Uri): Promise<MarkdownLink[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const links = extractLinks(document);
    
    const checkedLinks: MarkdownLink[] = [];
    
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
async function getMarkdownFiles(): Promise<vscode.Uri[]> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return [];
    }
    
    const files = await vscode.workspace.findFiles(
        '**/*.md',
        '**/node_modules/**',
        undefined
    );
    
    return files;
}

/**
 * 扫描工作区所有 Markdown 文件的无效链接
 */
export async function scanInvalidLinks(): Promise<ScanResult> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        throw new Error('No workspace folder open');
    }
    
    const markdownFiles = await getMarkdownFiles();
    
    let validCount = 0;
    let webLinksCount = 0;
    const invalidLinks: MarkdownLink[] = [];
    
    // 显示进度
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '正在扫描无效链接...',
            cancellable: false
        },
        async (progress) => {
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
                    } else {
                        invalidLinks.push(link);
                    }
                }
            }
        }
    );
    
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
function generateReport(result: ScanResult): string {
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
    } else {
        report += `## ❌ 无效链接列表\n\n`;
        
        // 按文件分组
        const groupedByFile = new Map<string, MarkdownLink[]>();
        for (const link of result.invalidLinks) {
            const relativePath = vscode.workspace.asRelativePath(link.filePath);
            if (!groupedByFile.has(relativePath)) {
                groupedByFile.set(relativePath, []);
            }
            groupedByFile.get(relativePath)!.push(link);
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
export async function scanAndGenerateReport(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
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
        } else {
            vscode.window.showWarningMessage(
                `扫描完成！发现 ${result.invalidCount} 个无效链接。报告已保存到 ${reportFileName}`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`扫描失败: ${error}`);
    }
}
