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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const pasteProvider_1 = require("./providers/pasteProvider");
const dropProvider_1 = require("./providers/dropProvider");
const previewEnhancer_1 = require("./previewEnhancer");
const linkScanner_1 = require("./utils/linkScanner");
const secretScanner_1 = require("./utils/secretScanner");
function activate(context) {
    console.log('Markdown Asset Manager is now active!');
    // Register paste provider
    const pasteProvider = new pasteProvider_1.MarkdownImagePasteProvider();
    const pasteDisposable = vscode.languages.registerDocumentPasteEditProvider({ language: 'markdown' }, pasteProvider, {
        providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
        pasteMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff', 'text/uri-list']
    });
    context.subscriptions.push(pasteDisposable);
    // Register drop provider for files
    const dropProvider = new dropProvider_1.MarkdownFileDropProvider();
    const dropDisposable = vscode.languages.registerDocumentDropEditProvider({ language: 'markdown' }, dropProvider);
    context.subscriptions.push(dropDisposable);
    // Register paste image command
    const pasteImageCommand = vscode.commands.registerCommand('mdAssetManager.pasteImage', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'markdown') {
            await pasteProvider.pasteFromClipboard(editor);
        }
    });
    context.subscriptions.push(pasteImageCommand);
    // Register open assets folder command
    const openAssetsCommand = vscode.commands.registerCommand('mdAssetManager.openAssetsFolder', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const assetsPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'assets');
        try {
            await vscode.workspace.fs.stat(assetsPath);
        }
        catch {
            vscode.window.showErrorMessage('Assets folder does not exist. Paste an image first to create it.');
            return;
        }
        await vscode.commands.executeCommand('revealFileInOS', assetsPath);
    });
    context.subscriptions.push(openAssetsCommand);
    // Register scan invalid links command
    const scanLinksCommand = vscode.commands.registerCommand('mdAssetManager.scanInvalidLinks', async () => {
        await (0, linkScanner_1.scanAndGenerateReport)();
    });
    context.subscriptions.push(scanLinksCommand);
    // Register scan secrets command
    const scanSecretsCommand = vscode.commands.registerCommand('mdAssetManager.scanSecrets', async () => {
        await (0, secretScanner_1.scanSecretsAndGenerateReport)();
    });
    context.subscriptions.push(scanSecretsCommand);
    // Activate preview enhancer
    (0, previewEnhancer_1.activatePreviewEnhancer)(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map