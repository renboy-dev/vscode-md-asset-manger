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
exports.MarkdownImagePasteProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fileUtils_1 = require("../utils/fileUtils");
const hashUtils_1 = require("../utils/hashUtils");
/**
 * Markdown paste provider that handles image and file paste operations
 * and saves files to appropriate directories with hash-based names
 */
class MarkdownImagePasteProvider {
    async prepareDocumentPaste(_document, _ranges, dataTransfer, _token) {
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
    async provideDocumentPasteEdits(_document, _ranges, dataTransfer, _context, _token) {
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
    async handleImagePaste(dataTransfer) {
        const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
        let imageData;
        let mimeType;
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
            const ext = (0, hashUtils_1.getExtensionFromMimeType)(mimeType);
            const buffer = Buffer.from(imageData);
            const { fileName, isImage } = await (0, fileUtils_1.saveAssetToAppropriateDirectory)(buffer, ext);
            // Use configured path
            const markdownPath = isImage ? (0, fileUtils_1.getImageMarkdownPath)(fileName) : (0, fileUtils_1.getFileMarkdownPath)(fileName);
            const markdownText = `![image](${markdownPath})`;
            return new vscode.DocumentPasteEdit(markdownText, 'Paste Image as Markdown', vscode.DocumentDropOrPasteEditKind.Empty);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to paste image: ${error}`);
            return undefined;
        }
    }
    /**
     * Handle file paste from clipboard (files copied from file system)
     */
    async handleFilePaste(dataTransfer) {
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
            const snippets = [];
            for (const uriString of uriStrings) {
                try {
                    // Parse the URI
                    let fileUri;
                    if (uriString.startsWith('file://')) {
                        fileUri = vscode.Uri.parse(uriString.trim());
                    }
                    else {
                        // Assume it's a file path
                        fileUri = vscode.Uri.file(uriString.trim());
                    }
                    // Read the file
                    const fileContent = await vscode.workspace.fs.readFile(fileUri);
                    const ext = path.extname(fileUri.path).slice(1).toLowerCase();
                    const originalName = path.basename(fileUri.path, path.extname(fileUri.path));
                    const buffer = Buffer.from(fileContent);
                    // Save to appropriate directory
                    const { fileName, isImage } = await (0, fileUtils_1.saveAssetToAppropriateDirectory)(buffer, ext);
                    // Use configured path
                    const markdownPath = isImage ? (0, fileUtils_1.getImageMarkdownPath)(fileName) : (0, fileUtils_1.getFileMarkdownPath)(fileName);
                    if (isImage) {
                        snippets.push(`![${originalName}](${markdownPath})`);
                    }
                    else {
                        snippets.push(`[${path.basename(fileUri.path)}](${markdownPath})`);
                    }
                }
                catch (e) {
                    // Skip files that can't be read
                    console.error(`Failed to process file: ${uriString}`, e);
                }
            }
            if (snippets.length === 0) {
                return undefined;
            }
            return new vscode.DocumentPasteEdit(snippets.join('\n'), 'Paste File(s) as Markdown', vscode.DocumentDropOrPasteEditKind.Empty);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to paste file: ${error}`);
            return undefined;
        }
    }
    /**
     * Manual paste method for command-based pasting
     * Triggers VS Code's built-in paste command
     */
    async pasteFromClipboard(editor) {
        try {
            // Execute VS Code's built-in paste command
            // This will trigger our DocumentPasteEditProvider
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        }
        catch (error) {
            vscode.window.showErrorMessage(`粘贴失败: ${error}`);
        }
    }
}
exports.MarkdownImagePasteProvider = MarkdownImagePasteProvider;
//# sourceMappingURL=pasteProvider.js.map