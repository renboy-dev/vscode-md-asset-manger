import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from './fileUtils';

/**
 * 表示一个空文件
 */
interface EmptyFile {
    filePath: string;
    relativePath: string;
    size: number;
}

/**
 * 扫描结果
 */
interface EmptyFileScanResult {
    totalFiles: number;
    emptyFiles: EmptyFile[];
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
 * 检查文件是否为空（内容为空或只有空白字符）
 */
async function isEmptyFile(uri: vscode.Uri): Promise<{ isEmpty: boolean; size: number }> {
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
    } catch {
        return { isEmpty: false, size: 0 };
    }
}

/**
 * 扫描工作区所有 Markdown 文件，查找空文件
 */
export async function scanEmptyFiles(): Promise<EmptyFileScanResult> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        throw new Error('No workspace folder open');
    }
    
    const markdownFiles = await getMarkdownFiles();
    const emptyFiles: EmptyFile[] = [];
    
    // 显示进度
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '正在扫描空文件...',
            cancellable: false
        },
        async (progress) => {
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
        }
    );
    
    return {
        totalFiles: markdownFiles.length,
        emptyFiles
    };
}

/**
 * 生成报告内容
 */
function generateEmptyFileReport(result: EmptyFileScanResult): string {
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
    } else {
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
export async function scanEmptyFilesAndGenerateReport(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
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
        } else {
            vscode.window.showWarningMessage(
                `扫描完成！发现 ${result.emptyFiles.length} 个空文件。报告已保存到 ${reportFileName}`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`扫描失败: ${error}`);
    }
}
