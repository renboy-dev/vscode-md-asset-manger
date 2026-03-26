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
exports.calculateImageHash = calculateImageHash;
exports.calculateImageHashSHA256 = calculateImageHashSHA256;
exports.getExtensionFromMimeType = getExtensionFromMimeType;
exports.getMimeTypeFromExtension = getMimeTypeFromExtension;
const crypto = __importStar(require("crypto"));
/**
 * Calculate MD5 hash of image buffer
 * @param imageBuffer The image data buffer
 * @returns The MD5 hash string
 */
async function calculateImageHash(imageBuffer) {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('md5');
            hash.update(imageBuffer);
            resolve(hash.digest('hex'));
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * Calculate SHA256 hash of image buffer (alternative option)
 * @param imageBuffer The image data buffer
 * @returns The SHA256 hash string
 */
async function calculateImageHashSHA256(imageBuffer) {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('sha256');
            hash.update(imageBuffer);
            resolve(hash.digest('hex'));
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * Get file extension from MIME type
 * @param mimeType The MIME type string
 * @returns The file extension (e.g., 'png', 'jpg')
 */
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
        'image/x-icon': 'ico'
    };
    return mimeToExt[mimeType.toLowerCase()] || 'png';
}
/**
 * Get MIME type from file extension
 * @param ext The file extension
 * @returns The MIME type string
 */
function getMimeTypeFromExtension(ext) {
    const extToMime = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'ico': 'image/x-icon'
    };
    return extToMime[ext.toLowerCase()] || 'image/png';
}
//# sourceMappingURL=hashUtils.js.map