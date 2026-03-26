import * as vscode from 'vscode';
import { MarkdownImagePasteProvider } from './providers/pasteProvider';
import { MarkdownFileDropProvider } from './providers/dropProvider';
import { activatePreviewEnhancer } from './previewEnhancer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Asset Manager is now active!');

    // Register paste provider
    const pasteProvider = new MarkdownImagePasteProvider();
    const pasteDisposable = vscode.languages.registerDocumentPasteEditProvider(
        { language: 'markdown' },
        pasteProvider,
        {
            providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
            pasteMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff', 'text/uri-list']
        }
    );
    context.subscriptions.push(pasteDisposable);

    // Register drop provider for files
    const dropProvider = new MarkdownFileDropProvider();
    const dropDisposable = vscode.languages.registerDocumentDropEditProvider(
        { language: 'markdown' },
        dropProvider
    );
    context.subscriptions.push(dropDisposable);

    // Register paste image command
    const pasteImageCommand = vscode.commands.registerCommand(
        'mdAssetManager.pasteImage',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'markdown') {
                await pasteProvider.pasteFromClipboard(editor);
            }
        }
    );
    context.subscriptions.push(pasteImageCommand);

    // Register open assets folder command
    const openAssetsCommand = vscode.commands.registerCommand(
        'mdAssetManager.openAssetsFolder',
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const assetsPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'assets');
            try {
                await vscode.workspace.fs.stat(assetsPath);
            } catch {
                vscode.window.showErrorMessage('Assets folder does not exist. Paste an image first to create it.');
                return;
            }
            await vscode.commands.executeCommand('revealFileInOS', assetsPath);
        }
    );
    context.subscriptions.push(openAssetsCommand);

    // Activate preview enhancer
    activatePreviewEnhancer(context);
}

export function deactivate() {}
