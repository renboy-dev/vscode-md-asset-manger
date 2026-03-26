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
exports.activatePreviewEnhancer = activatePreviewEnhancer;
exports.getAssetsPathForDocument = getAssetsPathForDocument;
const vscode = __importStar(require("vscode"));
/**
 * Activate the preview enhancer
 * This module enhances the built-in Markdown preview to load images from assets directory
 */
function activatePreviewEnhancer(context) {
    // The preview enhancement is done via markdown.previewScripts in package.json
    // This function can be used for additional preview-related functionality if needed
    // Listen for active text editor changes to update preview
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'markdown') {
            // Preview will be automatically enhanced by the injected script
        }
    }));
}
/**
 * Get the assets directory path for the current document
 * @param document The markdown document
 * @returns The assets directory path or undefined
 */
function getAssetsPathForDocument(document) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    // Find the workspace folder that contains this document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
        return undefined;
    }
    return vscode.Uri.joinPath(workspaceFolder.uri, 'assets').toString();
}
//# sourceMappingURL=previewEnhancer.js.map