import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from './fileUtils';

/**
 * 敏感信息类型
 */
interface SecretMatch {
    type: string;
    value: string;
    line: number;
    column: number;
    filePath: string;
    context: string;
}

/**
 * 扫描结果
 */
interface SecretScanResult {
    totalFiles: number;
    filesWithSecrets: number;
    totalSecrets: number;
    secrets: SecretMatch[];
}

/**
 * 敏感信息模式定义
 */
const SECRET_PATTERNS = [
    {
        type: 'API Key / Token',
        patterns: [
            /['"](sk-[a-zA-Z0-9]{20,})['"]/g,
            /['"](sk_live_[a-zA-Z0-9]{20,})['"]/g,
            /['"](sk_test_[a-zA-Z0-9]{20,})['"]/g,
            /['"](xox[baprs]-[a-zA-Z0-9-]{10,})['"]/g,
            /['"](ghp_[a-zA-Z0-9]{36})['"]/g,
            /['"](gho_[a-zA-Z0-9]{36})['"]/g,
            /['"](AKIA[A-Z0-9]{16})['"]/g,
            /['"](eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)['"]/g,
            /['"](AIza[a-zA-Z0-9_-]{35})['"]/g,
        ]
    },
    {
        type: 'Private Key',
        patterns: [
            /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
            /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
        ]
    },
    {
        type: 'Password / Secret',
        patterns: [
            /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{4,})['"]/gi,
            /(?:secret|api_key|apikey|access_key|secret_key)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
            /(?:token|auth_token|access_token)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
            /(?:bearer)\s+[a-zA-Z0-9_-]{20,}/gi,
        ]
    },
    {
        type: 'Database Connection',
        patterns: [
            /(?:mysql|postgres|postgresql|mongodb|redis):\/\/[^:]+:[^@]+@[^\s'"]+/gi,
            /(?:mongodb\+srv):\/\/[^:]+:[^@]+@[^\s'"]+/gi,
        ]
    }
];

/**
 * 从 Markdown 文档中扫描敏感信息
 */
function scanDocumentForSecrets(document: vscode.TextDocument): SecretMatch[] {
    const text = document.getText();
    const lines = text.split('\n');
    const secrets: SecretMatch[] = [];
    const filePath = document.uri.fsPath;
    
    for (const { type, patterns } of SECRET_PATTERNS) {
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                const startOffset = match.index;
                const startPos = document.positionAt(startOffset);
                const line = startPos.line + 1;
                const column = startPos.character + 1;
                
                const lineContent = lines[startPos.line] || '';
                const context = lineContent.trim().substring(0, 100);
                
                const isDuplicate = secrets.some(
                    s => s.line === line && s.type === type
                );
                
                if (!isDuplicate) {
                    secrets.push({
                        type,
                        value: match[0].length > 50 
                            ? match[0].substring(0, 47) + '...' 
                            : match[0],
                        line,
                        column,
                        filePath,
                        context
                    });
                }
            }
        }
    }
    
    return secrets;
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
 * 扫描工作区所有 Markdown 文件的敏感信息
 */
export async function scanForSecrets(): Promise<SecretScanResult> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        throw new Error('No workspace folder open');
    }
    
    const markdownFiles = await getMarkdownFiles();
    const allSecrets: SecretMatch[] = [];
    const filesWithSecrets = new Set<string>();
    
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '正在扫描敏感信息...',
            cancellable: false
        },
        async (progress) => {
            for (let i = 0; i < markdownFiles.length; i++) {
                const file = markdownFiles[i];
                progress.report({
                    message: `(${i + 1}/${markdownFiles.length}) ${path.basename(file.fsPath)}`,
                    increment: (100 / markdownFiles.length)
                });
                
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const secrets = scanDocumentForSecrets(document);
                    
                    if (secrets.length > 0) {
                        filesWithSecrets.add(file.fsPath);
                        allSecrets.push(...secrets);
                    }
                } catch (error) {
                    console.error(`Failed to scan ${file.fsPath}:`, error);
                }
            }
        }
    );
    
    return {
        totalFiles: markdownFiles.length,
        filesWithSecrets: filesWithSecrets.size,
        totalSecrets: allSecrets.length,
        secrets: allSecrets
    };
}

/**
 * 生成敏感信息扫描报告
 */
function generateSecretReport(result: SecretScanResult): string {
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN');
    
    let report = `# 敏感信息扫描报告\n\n`;
    report += `**扫描时间**: ${timestamp}\n\n`;
    report += `> ⚠️ **警告**: 此报告可能包含敏感信息，请妥善保管！\n\n`;
    report += `---\n\n`;
    report += `## 扫描统计\n\n`;
    report += `| 项目 | 数量 |\n`;
    report += `|:---|:---:|\n`;
    report += `| 扫描文件数 | ${result.totalFiles} |\n`;
    report += `| 包含敏感信息的文件数 | ${result.filesWithSecrets} |\n`;
    report += `| 发现敏感信息数量 | ${result.totalSecrets} |\n`;
    report += `\n---\n\n`;
    
    if (result.secrets.length === 0) {
        report += `## ✅ 没有发现敏感信息\n\n`;
    } else {
        report += `## ⚠️ 敏感信息列表\n\n`;
        
        // 按文件分组
        const groupedByFile = new Map<string, SecretMatch[]>();
        for (const secret of result.secrets) {
            const relativePath = vscode.workspace.asRelativePath(secret.filePath);
            if (!groupedByFile.has(relativePath)) {
                groupedByFile.set(relativePath, []);
            }
            groupedByFile.get(relativePath)!.push(secret);
        }
        
        for (const [filePath, secrets] of groupedByFile) {
            report += `### ${filePath}\n\n`;
            report += `| 行号 | 类型 | 内容 |\n`;
            report += `|:---:|:---|:---|\n`;
            
            for (const secret of secrets) {
                const escapedValue = secret.value.replace(/\|/g, '\\|');
                report += `| ${secret.line} | ${secret.type} | \`${escapedValue}\` |\n`;
            }
            report += `\n`;
        }
        
        report += `---\n\n`;
        report += `## 🔐 建议\n\n`;
        report += `1. 移除或替换发现的敏感信息\n`;
        report += `2. 使用环境变量存储敏感信息\n`;
        report += `3. 如已提交到版本控制，考虑轮换密钥\n`;
    }
    
    report += `\n---\n\n`;
    report += `*报告由 Markdown Asset Manager 生成*\n`;
    
    return report;
}

/**
 * 执行扫描并生成报告
 */
export async function scanSecretsAndGenerateReport(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('没有打开工作区');
        return;
    }
    
    try {
        const result = await scanForSecrets();
        
        const report = generateSecretReport(result);
        const reportFileName = `secrets-scan-report-${Date.now()}.md`;
        const reportUri = vscode.Uri.joinPath(workspaceRoot, reportFileName);
        
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(reportUri, encoder.encode(report));
        
        const document = await vscode.workspace.openTextDocument(reportUri);
        await vscode.window.showTextDocument(document);
        
        if (result.totalSecrets === 0) {
            vscode.window.showInformationMessage(
                `扫描完成！没有发现敏感信息。报告: ${reportFileName}`
            );
        } else {
            vscode.window.showWarningMessage(
                `⚠️ 发现 ${result.totalSecrets} 个潜在敏感信息！报告: ${reportFileName}`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`扫描失败: ${error}`);
    }
}
