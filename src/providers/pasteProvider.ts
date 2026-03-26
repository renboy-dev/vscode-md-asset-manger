import * as vscode from 'vscode';
import * as path from 'path';
import { saveAssetToAppropriateDirectory } from '../utils/fileUtils';
import { getExtensionFromMimeType } from '../utils/hashUtils';

/**
 * Markdown paste provider that handles image and file paste operations
 * and saves files to appropriate directories with hash-based names
 */
export class MarkdownImagePasteProvider implements vscode.DocumentPasteEditProvider {

    async prepareDocumentPaste(
        _document: vscode.TextDocument,
        _ranges: readonly vscode.Range[],
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Check for image or file data in clipboard
        const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
        
        for (const mimeType of imageTypes) {
            const dataItem = dataTransfer.get(mimeType);
            if (dataItem) {
                return;
            }
        }
        
        // Also check for file URIs
        const uriList = dataTransfer.get('text/uri-list');
        if (uriList) {
            return;
        }
    }

    async provideDocumentPasteEdits(
        _document: vscode.TextDocument,
        _ranges: readonly vscode.Range[],
        dataTransfer: vscode.DataTransfer,
        _context: vscode.DocumentPasteEditContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.DocumentPasteEdit[] | undefined> {
        // First, try to handle image data from clipboard
        const imageEdit = await this.handleImagePaste(dataTransfer);
        if (imageEdit) {
            return [imageEdit];
        }

        // Then, try to handle file paste (files copied from file system)
        const fileEdit = await this.handleFilePaste(dataTransfer);
        if (fileEdit) {
            return [fileEdit];
        }

        return undefined;
    }

    /**
     * Handle image paste from clipboard
     */
    private async handleImagePaste(dataTransfer: vscode.DataTransfer): Promise<vscode.DocumentPasteEdit | undefined> {
        const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
        let imageData: Uint8Array | undefined;
        let mimeType: string | undefined;
        
        for (const type of imageTypes) {
            const dataItem = dataTransfer.get(type);
            if (dataItem) {
                imageData = await dataItem.asFile()?.data();
                mimeType = type;
                break;
            }
        }

        if (!imageData || !mimeType) {
            return undefined;
        }

        try {
            const ext = getExtensionFromMimeType(mimeType);
            const buffer = Buffer.from(imageData);
            const { fileName, isImage } = await saveAssetToAppropriateDirectory(buffer, ext);
            
            // Use Obsidian-style link: [[filename]]
            const markdownText = `[[${fileName}]]`;
            
            return new vscode.DocumentPasteEdit(
                markdownText,
                'Paste Image as Markdown',
                vscode.DocumentDropOrPasteEditKind.Empty
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to paste image: ${error}`);
            return undefined;
        }
    }

    /**
     * Handle file paste from clipboard (files copied from file system)
     */
    private async handleFilePaste(dataTransfer: vscode.DataTransfer): Promise<vscode.DocumentPasteEdit | undefined> {
        // Try to get file URIs from clipboard
        const uriList = dataTransfer.get('text/uri-list');
        if (!uriList) {
            return undefined;
        }

        try {
            const uriListString = await uriList.asString();
            if (!uriListString) {
                return undefined;
            }

            // Parse URIs
            const uriStrings = uriListString.split('\n').filter(u => u.trim() && !u.startsWith('#'));
            if (uriStrings.length === 0) {
                return undefined;
            }

            const snippets: string[] = [];

            for (const uriString of uriStrings) {
                try {
                    // Parse the URI
                    let fileUri: vscode.Uri;
                    if (uriString.startsWith('file://')) {
                        fileUri = vscode.Uri.parse(uriString.trim());
                    } else {
                        // Assume it's a file path
                        fileUri = vscode.Uri.file(uriString.trim());
                    }

                    // Read the file
                    const fileContent = await vscode.workspace.fs.readFile(fileUri);
                    const ext = path.extname(fileUri.path).slice(1).toLowerCase();
                    const buffer = Buffer.from(fileContent);
                    const originalFileName = path.basename(fileUri.path);

                    // Save to appropriate directory
                    const { fileName, isImage, displayName } = await saveAssetToAppropriateDirectory(buffer, ext, originalFileName);
                    
                    // Use Obsidian-style link
                    // For non-image files, include display name: [[hash|originalName]]
                    if (isImage || !displayName) {
                        snippets.push(`[[${fileName}]]`);
                    } else {
                        snippets.push(`[[${fileName}|${displayName}]]`);
                    }
                } catch (e) {
                    // Skip files that can't be read
                    console.error(`Failed to process file: ${uriString}`, e);
                }
            }

            if (snippets.length === 0) {
                return undefined;
            }

            return new vscode.DocumentPasteEdit(
                snippets.join('\n'),
                'Paste File(s) as Markdown',
                vscode.DocumentDropOrPasteEditKind.Empty
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to paste file: ${error}`);
            return undefined;
        }
    }

    /**
     * Manual paste method for command-based pasting
     * Triggers VS Code's built-in paste command
     */
    async pasteFromClipboard(editor: vscode.TextEditor): Promise<void> {
        try {
            // Execute VS Code's built-in paste command
            // This will trigger our DocumentPasteEditProvider
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch (error) {
            vscode.window.showErrorMessage(`粘贴失败: ${error}`);
        }
    }
}
