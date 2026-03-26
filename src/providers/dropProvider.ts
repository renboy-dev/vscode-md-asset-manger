import * as vscode from 'vscode';
import * as path from 'path';
import { saveAssetToAppropriateDirectory, getImageMarkdownPath, getFileMarkdownPath } from '../utils/fileUtils';

/**
 * Handle file drop into markdown editor
 * Saves files to appropriate directories (images or files)
 */
export class MarkdownFileDropProvider implements vscode.DocumentDropEditProvider {

    async provideDocumentDropEdits(
        _document: vscode.TextDocument,
        _position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): Promise<vscode.DocumentDropEdit | undefined> {
        // Get the files from the data transfer
        const filesItem = dataTransfer.get('files');
        if (!filesItem) {
            return undefined;
        }

        const files = await filesItem.asFile()?.data();
        if (!files) {
            // Try to get files from application/x-code-file-data
            const fileDataItem = dataTransfer.get('application/x-code-file-data');
            if (!fileDataItem) {
                return undefined;
            }
        }

        // Process the dropped files
        // VS Code provides files through 'files' mimetype
        // We need to read each file and save it
        try {
            const uris = await this.extractFileUris(dataTransfer);
            if (uris.length === 0) {
                return undefined;
            }

            const snippets: string[] = [];
            
            for (const uri of uris) {
                const fileContent = await vscode.workspace.fs.readFile(uri);
                const ext = path.extname(uri.path).slice(1).toLowerCase();
                const buffer = Buffer.from(fileContent);
                
                const { fileName, isImage } = await saveAssetToAppropriateDirectory(buffer, ext);
                
                // Use configured path
                const markdownPath = isImage ? getImageMarkdownPath(fileName) : getFileMarkdownPath(fileName);
                
                if (isImage) {
                    snippets.push(`![${path.basename(uri.path, path.extname(uri.path))}](${markdownPath})`);
                } else {
                    snippets.push(`[${path.basename(uri.path)}](${markdownPath})`);
                }
            }

            return new vscode.DocumentDropEdit(snippets.join('\n'));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to handle dropped file: ${error}`);
            return undefined;
        }
    }

    /**
     * Extract file URIs from data transfer
     */
    private async extractFileUris(dataTransfer: vscode.DataTransfer): Promise<vscode.Uri[]> {
        const uris: vscode.Uri[] = [];
        
        // Check for 'files' mimetype (contains file paths)
        const filesItem = dataTransfer.get('files');
        if (filesItem) {
            // The 'files' item might contain file references
            // VS Code typically provides these as text with file paths
            const text = await filesItem.asString();
            // Parse file paths from the text
            const filePaths = text.split('\n').filter(p => p.trim());
            for (const filePath of filePaths) {
                try {
                    const uri = vscode.Uri.file(filePath.trim());
                    uris.push(uri);
                } catch {
                    // Skip invalid paths
                }
            }
        }

        // Also check for 'text/uri-list' which is common for dropped files
        const uriList = dataTransfer.get('text/uri-list');
        if (uriList) {
            const text = await uriList.asString();
            const uriStrings = text.split('\n').filter(u => u.trim() && !u.startsWith('#'));
            for (const uriString of uriStrings) {
                try {
                    const uri = vscode.Uri.parse(uriString.trim());
                    uris.push(uri);
                } catch {
                    // Skip invalid URIs
                }
            }
        }

        return uris;
    }
}
