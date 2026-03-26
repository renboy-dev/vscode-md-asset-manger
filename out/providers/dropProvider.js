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
exports.MarkdownFileDropProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fileUtils_1 = require("../utils/fileUtils");
/**
 * Handle file drop into markdown editor
 * Saves files to appropriate directories (images or files)
 */
class MarkdownFileDropProvider {
    async provideDocumentDropEdits(_document, _position, dataTransfer, _token) {
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
            const snippets = [];
            for (const uri of uris) {
                const fileContent = await vscode.workspace.fs.readFile(uri);
                const ext = path.extname(uri.path).slice(1).toLowerCase();
                const buffer = Buffer.from(fileContent);
                const { fileName, isImage } = await (0, fileUtils_1.saveAssetToAppropriateDirectory)(buffer, ext);
                // Use configured path
                const markdownPath = isImage ? (0, fileUtils_1.getImageMarkdownPath)(fileName) : (0, fileUtils_1.getFileMarkdownPath)(fileName);
                if (isImage) {
                    snippets.push(`![${path.basename(uri.path, path.extname(uri.path))}](${markdownPath})`);
                }
                else {
                    snippets.push(`[${path.basename(uri.path)}](${markdownPath})`);
                }
            }
            return new vscode.DocumentDropEdit(snippets.join('\n'));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to handle dropped file: ${error}`);
            return undefined;
        }
    }
    /**
     * Extract file URIs from data transfer
     */
    async extractFileUris(dataTransfer) {
        const uris = [];
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
                }
                catch {
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
                }
                catch {
                    // Skip invalid URIs
                }
            }
        }
        return uris;
    }
}
exports.MarkdownFileDropProvider = MarkdownFileDropProvider;
//# sourceMappingURL=dropProvider.js.map