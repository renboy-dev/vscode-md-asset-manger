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
exports.extendMarkdownIt = extendMarkdownIt;
const vscode = __importStar(require("vscode"));
const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'apng'
]);
function isImage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.has(ext);
}
function extendMarkdownIt(md) {
    const config = vscode.workspace.getConfiguration('mdAssetManager');
    const assetsRoot = config.get('assetsRoot', 'assets');
    const imagesSubdir = config.get('imagesSubdir', 'images');
    const filesSubdir = config.get('filesSubdir', 'files');
    function obsidianLink(state, silent) {
        const start = state.pos;
        const max = state.posMax;
        if (state.src.charCodeAt(start) !== 0x5B || state.src.charCodeAt(start + 1) !== 0x5B) {
            return false;
        }
        let pos = start + 2;
        let found = false;
        while (pos < max) {
            if (state.src.charCodeAt(pos) === 0x5D && state.src.charCodeAt(pos + 1) === 0x5D) {
                found = true;
                break;
            }
            pos++;
        }
        if (!found)
            return false;
        const content = state.src.slice(start + 2, pos);
        const endPos = pos + 2;
        const pipeIndex = content.indexOf('|');
        let filename;
        let displayText;
        if (pipeIndex > 0) {
            filename = content.slice(0, pipeIndex).trim();
            displayText = content.slice(pipeIndex + 1).trim();
        }
        else {
            filename = content.trim();
            displayText = filename;
        }
        if (!filename)
            return false;
        if (silent)
            return true;
        const isImg = isImage(filename);
        const subdir = isImg ? imagesSubdir : filesSubdir;
        const assetsPath = `/${assetsRoot}/${subdir}/${filename}`;
        const token = state.push('obsidian_link', '', 0);
        token.content = filename;
        token.displayText = displayText;
        token.isImage = isImg;
        token.assetsPath = assetsPath;
        state.pos = endPos;
        return true;
    }
    md.inline.ruler.before('link', 'obsidian_link', obsidianLink);
    md.renderer.rules.obsidian_link = function (tokens, idx) {
        const token = tokens[idx];
        const displayText = md.utils.escapeHtml(token.displayText);
        const assetsPath = token.assetsPath;
        const filename = md.utils.escapeHtml(token.content);
        if (token.isImage) {
            return `<img src="${assetsPath}" alt="${displayText}" style="max-width:100%;height:auto;border-radius:4px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);" data-obsidian-link="${filename}" />`;
        }
        else {
            return `<a href="${assetsPath}" style="display:inline-flex;align-items:center;padding:4px 12px;background:#f6f8fa;border-radius:4px;border:1px solid #e1e4e8;color:#0366d6;text-decoration:none;margin:2px 0;" data-obsidian-link="${filename}">📄 ${displayText}</a>`;
        }
    };
    return md;
}
//# sourceMappingURL=markdownPlugin.js.map