import * as crypto from 'crypto';

/**
 * Calculate MD5 hash of image buffer
 * @param imageBuffer The image data buffer
 * @returns The MD5 hash string
 */
export async function calculateImageHash(imageBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('md5');
            hash.update(imageBuffer);
            resolve(hash.digest('hex'));
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Calculate SHA256 hash of image buffer (alternative option)
 * @param imageBuffer The image data buffer
 * @returns The SHA256 hash string
 */
export async function calculateImageHashSHA256(imageBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('sha256');
            hash.update(imageBuffer);
            resolve(hash.digest('hex'));
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get file extension from MIME type
 * @param mimeType The MIME type string
 * @returns The file extension (e.g., 'png', 'jpg')
 */
export function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
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
export function getMimeTypeFromExtension(ext: string): string {
    const extToMime: Record<string, string> = {
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
