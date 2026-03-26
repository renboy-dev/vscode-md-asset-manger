import * as vscode from 'vscode';
import { MarkdownImagePasteProvider } from './providers/pasteProvider';
import { MarkdownFileDropProvider } from './providers/dropProvider';
import { activatePreviewEnhancer } from './previewEnhancer';
import { scanAndGenerateReport } from './utils/linkScanner';
import { scanSecretsAndGenerateReport } from './utils/secretScanner';

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

    // Register scan invalid links command
    const scanLinksCommand = vscode.commands.registerCommand(
        'mdAssetManager.scanInvalidLinks',
        async () => {
            await scanAndGenerateReport();
        }
    );
    context.subscriptions.push(scanLinksCommand);

    // Register scan secrets command
    const scanSecretsCommand = vscode.commands.registerCommand(
        'mdAssetManager.scanSecrets',
        async () => {
            await scanSecretsAndGenerateReport();
        }
    );
    context.subscriptions.push(scanSecretsCommand);

    // Activate preview enhancer
    activatePreviewEnhancer(context);

    // Return extendMarkdownIt for VS Code markdown preview integration
    return {
        extendMarkdownIt(md: any) {
            const IMAGE_EXTENSIONS = new Set([
                'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'apng'
            ]);

            function isImage(filename: string): boolean {
                const ext = filename.split('.').pop()?.toLowerCase() || '';
                return IMAGE_EXTENSIONS.has(ext);
            }

            function obsidianLink(state: any, silent: boolean): boolean {
                const start = state.pos;
                const max = state.posMax;

                // Check if we're inside inline code (between backticks)
                // Count backticks before current position in the source
                let backtickCount = 0;
                for (let i = start - 1; i >= 0; i--) {
                    const ch = state.src.charCodeAt(i);
                    if (ch === 0x60 /* ` */) {
                        backtickCount++;
                    } else if (ch === 0x0A /* newline */) {
                        // Stop at line start - backticks only count on same line
                        break;
                    }
                }
                // Odd number of backticks means we're inside inline code
                if (backtickCount % 2 === 1) {
                    return false;
                }

                // Check for [[
                if (state.src.charCodeAt(start) !== 0x5B || 
                    state.src.charCodeAt(start + 1) !== 0x5B) {
                    return false;
                }

                // Find closing ]]
                let pos = start + 2;
                let found = false;
                while (pos < max - 1) {
                    if (state.src.charCodeAt(pos) === 0x5D && 
                        state.src.charCodeAt(pos + 1) === 0x5D) {
                        found = true;
                        break;
                    }
                    pos++;
                }

                if (!found) return false;

                const content = state.src.slice(start + 2, pos);
                const endPos = pos + 2;

                // Parse: filename or filename|display
                const pipeIndex = content.indexOf('|');
                let filename: string;
                let displayText: string;

                if (pipeIndex > 0) {
                    filename = content.slice(0, pipeIndex).trim();
                    displayText = content.slice(pipeIndex + 1).trim();
                } else {
                    filename = content.trim();
                    displayText = filename;
                }

                if (!filename) return false;
                if (silent) return true;

                // Get config at render time (not at initialization)
                // This ensures config changes take effect immediately
                const config = vscode.workspace.getConfiguration('mdAssetManager');
                const assetsRoot = config.get<string>('assetsRoot', 'assets');
                const imagesSubdir = config.get<string>('imagesSubdir', 'images');
                const filesSubdir = config.get<string>('filesSubdir', 'files');

                const img = isImage(filename);
                const subdir = img ? imagesSubdir : filesSubdir;
                const assetPath = `/${assetsRoot}/${subdir}/${filename}`;

                // Create proper markdown tokens
                if (img) {
                    const token = state.push('image', 'img', 0);
                    token.attrs = [['src', assetPath], ['alt', displayText]];
                    token.content = displayText;
                    token.children = [];
                } else {
                    let token = state.push('link_open', 'a', 1);
                    token.attrs = [['href', assetPath]];
                    token = state.push('text', '', 0);
                    token.content = displayText;
                    state.push('link_close', 'a', -1);
                }

                state.pos = endPos;
                return true;
            }

            md.inline.ruler.before('link', 'obsidian_link', obsidianLink);
            return md;
        }
    };
}

export function deactivate() {}
