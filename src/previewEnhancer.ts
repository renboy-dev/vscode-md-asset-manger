import * as vscode from 'vscode';

/**
 * Activate the preview enhancer
 * This module enhances the built-in Markdown preview to load images from assets directory
 */
export function activatePreviewEnhancer(context: vscode.ExtensionContext): void {
    // The preview enhancement is done via markdown.previewScripts in package.json
    // This function can be used for additional preview-related functionality if needed
    
    // Listen for active text editor changes to update preview
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'markdown') {
                // Preview will be automatically enhanced by the injected script
            }
        })
    );
}

/**
 * Get the assets directory path for the current document
 * @param document The markdown document
 * @returns The assets directory path or undefined
 */
export function getAssetsPathForDocument(document: vscode.TextDocument): string | undefined {
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
