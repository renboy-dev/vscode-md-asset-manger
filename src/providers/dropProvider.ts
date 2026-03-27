import * as vscode from 'vscode';
import * as path from 'path';
import { saveAssetToAppropriateDirectory } from '../utils/fileUtils';

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
                const originalFileName = path.basename(uri.path);
                
                const { fileName, isImage, displayName } = await saveAssetToAppropriateDirectory(buffer, ext, originalFileName);
                
                // Use Obsidian-style embed link
                // For non-image files, include display name: ![[hash|originalName]]
                if (isImage || !displayName) {
                    snippets.push(`![[${fileName}]]`);
                } else {
                    snippets.push(`![[${fileName}|${displayName}]]`);
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
