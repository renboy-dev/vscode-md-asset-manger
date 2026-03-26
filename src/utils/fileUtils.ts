import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { calculateImageHash } from './hashUtils';

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'apng'
]);

/**
 * Image MIME types
 */
const IMAGE_MIME_TYPES = new Set([
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon', 'image/apng'
]);

/**
 * Get configuration value
 */
function getConfig<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration('mdAssetManager');
    return config.get<T>(key) ?? defaultValue;
}

/**
 * Get the assets root directory name from configuration
 */
export function getAssetsRootName(): string {
    return getConfig<string>('assetsRoot', 'assets');
}

/**
 * Get the images subdirectory name from configuration
 */
export function getImagesSubdirName(): string {
    return getConfig<string>('imagesSubdir', 'images');
}

/**
 * Get the files subdirectory name from configuration
 */
export function getFilesSubdirName(): string {
    return getConfig<string>('filesSubdir', 'files');
}

/**
 * Check if the file is an image based on extension
 * @param ext File extension (without dot)
 * @returns True if the file is an image
 */
export function isImageExtension(ext: string): boolean {
    return IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Check if the MIME type is an image
 * @param mimeType MIME type string
 * @returns True if the MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
    return IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

/**
 * Get the workspace root URI
 * @returns The workspace root URI or undefined
 */
export function getWorkspaceRoot(): vscode.Uri | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    return workspaceFolders[0].uri;
}

/**
 * Get the assets directory path for the current workspace
 * @returns The assets directory URI or undefined if no workspace is open
 */
export function getAssetsDirectory(): vscode.Uri | undefined {
    const root = getWorkspaceRoot();
    if (!root) {
        return undefined;
    }
    const assetsRootName = getAssetsRootName();
    return vscode.Uri.joinPath(root, assetsRootName);
}

/**
 * Get the images directory path
 * @returns The images directory URI or undefined
 */
export function getImagesDirectory(): vscode.Uri | undefined {
    const assetsDir = getAssetsDirectory();
    if (!assetsDir) {
        return undefined;
    }
    const imagesSubdir = getImagesSubdirName();
    // If subdir is empty, use assets root directly
    if (!imagesSubdir) {
        return assetsDir;
    }
    return vscode.Uri.joinPath(assetsDir, imagesSubdir);
}

/**
 * Get the files directory path
 * @returns The files directory URI or undefined
 */
export function getFilesDirectory(): vscode.Uri | undefined {
    const assetsDir = getAssetsDirectory();
    if (!assetsDir) {
        return undefined;
    }
    const filesSubdir = getFilesSubdirName();
    // If subdir is empty, use assets root directly
    if (!filesSubdir) {
        return assetsDir;
    }
    return vscode.Uri.joinPath(assetsDir, filesSubdir);
}

/**
 * Get the markdown path for an image file
 * @param fileName The file name
 * @returns The markdown path string
 */
export function getImageMarkdownPath(fileName: string): string {
    const assetsRoot = getAssetsRootName();
    const imagesSubdir = getImagesSubdirName();
    if (imagesSubdir) {
        return `/${assetsRoot}/${imagesSubdir}/${fileName}`;
    }
    return `/${assetsRoot}/${fileName}`;
}

/**
 * Get the markdown path for a non-image file
 * @param fileName The file name
 * @returns The markdown path string
 */
export function getFileMarkdownPath(fileName: string): string {
    const assetsRoot = getAssetsRootName();
    const filesSubdir = getFilesSubdirName();
    if (filesSubdir) {
        return `/${assetsRoot}/${filesSubdir}/${fileName}`;
    }
    return `/${assetsRoot}/${fileName}`;
}

/**
 * Ensure the assets directory exists
 * @param assetsDir The assets directory URI
 */
export async function ensureAssetsDirectory(assetsDir: vscode.Uri): Promise<void> {
    try {
        await vscode.workspace.fs.stat(assetsDir);
    } catch {
        await vscode.workspace.fs.createDirectory(assetsDir);
    }
}

/**
 * Check if a file with the given hash already exists in the assets directory
 * @param assetsDir The assets directory URI
 * @param hash The file hash
 * @param ext The file extension
 * @returns The existing file URI or undefined
 */
export async function findExistingFileByHash(
    assetsDir: vscode.Uri,
    hash: string,
    ext: string
): Promise<vscode.Uri | undefined> {
    const fileName = `${hash}.${ext}`;
    const filePath = vscode.Uri.joinPath(assetsDir, fileName);
    try {
        await vscode.workspace.fs.stat(filePath);
        return filePath;
    } catch {
        return undefined;
    }
}

/**
 * Find existing file by content hash (check all extensions)
 * @param assetsDir The assets directory URI
 * @param imageBuffer The image data buffer
 * @returns The existing file URI or undefined
 */
export async function findExistingFileByContent(
    assetsDir: vscode.Uri,
    imageBuffer: Buffer
): Promise<vscode.Uri | undefined> {
    try {
        const files = await vscode.workspace.fs.readDirectory(assetsDir);
        for (const [name, type] of files) {
            if (type === vscode.FileType.File) {
                const filePath = vscode.Uri.joinPath(assetsDir, name);
                const fileContent = await vscode.workspace.fs.readFile(filePath);
                const fileHash = crypto.createHash('md5').update(Buffer.from(fileContent)).digest('hex');
                const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                if (fileHash === imageHash) {
                    return filePath;
                }
            }
        }
    } catch {
        // Directory doesn't exist or error reading
    }
    return undefined;
}

/**
 * Save image to images directory with hash-based filename
 * @param imageBuffer The image data buffer
 * @param ext The file extension
 * @returns The saved file URI
 */
export async function saveImageToAssets(
    imageBuffer: Buffer,
    ext: string
): Promise<vscode.Uri> {
    const imagesDir = getImagesDirectory();
    if (!imagesDir) {
        throw new Error('No workspace folder open');
    }

    // Ensure images directory exists
    await ensureAssetsDirectory(imagesDir);

    // Calculate hash for the image
    const hash = await calculateImageHash(imageBuffer);

    // Check if file already exists (deduplication)
    const existingFile = await findExistingFileByHash(imagesDir, hash, ext);
    if (existingFile) {
        return existingFile;
    }

    // Save the file with hash name
    const fileName = `${hash}.${ext}`;
    const filePath = vscode.Uri.joinPath(imagesDir, fileName);
    await vscode.workspace.fs.writeFile(filePath, imageBuffer);

    return filePath;
}

/**
 * Calculate hash for any file content
 * @param buffer The file data buffer
 * @returns The MD5 hash string
 */
export function calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Save file to files directory with hash-based filename
 * @param fileBuffer The file data buffer
 * @param ext The file extension
 * @param originalName Optional original filename (used as reference)
 * @returns The saved file URI
 */
export async function saveFileToAssets(
    fileBuffer: Buffer,
    ext: string,
    originalName?: string
): Promise<vscode.Uri> {
    const filesDir = getFilesDirectory();
    if (!filesDir) {
        throw new Error('No workspace folder open');
    }

    // Ensure files directory exists
    await ensureAssetsDirectory(filesDir);

    // Calculate hash for the file
    const hash = calculateFileHash(fileBuffer);

    // Check if file already exists (deduplication)
    const existingFile = await findExistingFileByHash(filesDir, hash, ext);
    if (existingFile) {
        return existingFile;
    }

    // Save the file with hash name
    const fileName = `${hash}.${ext}`;
    const filePath = vscode.Uri.joinPath(filesDir, fileName);
    await vscode.workspace.fs.writeFile(filePath, fileBuffer);

    return filePath;
}

/**
 * Save asset (image or file) to appropriate directory
 * Automatically determines if it's an image or other file type
 * @param buffer The file data buffer
 * @param ext The file extension
 * @returns Object containing the saved file URI, the filename for markdown, and whether it's an image
 */
export async function saveAssetToAppropriateDirectory(
    buffer: Buffer,
    ext: string
): Promise<{ uri: vscode.Uri; fileName: string; isImage: boolean }> {
    const isImage = isImageExtension(ext);
    
    if (isImage) {
        const uri = await saveImageToAssets(buffer, ext);
        return { uri, fileName: path.basename(uri.path), isImage: true };
    } else {
        const uri = await saveFileToAssets(buffer, ext);
        return { uri, fileName: path.basename(uri.path), isImage: false };
    }
}

/**
 * Save image with custom name to assets directory
 * @param imageBuffer The image data buffer
 * @param fileName The desired file name
 * @returns The saved file URI
 */
export async function saveImageWithCustomName(
    imageBuffer: Buffer,
    fileName: string
): Promise<vscode.Uri> {
    const assetsDir = getAssetsDirectory();
    if (!assetsDir) {
        throw new Error('No workspace folder open');
    }

    // Ensure assets directory exists
    await ensureAssetsDirectory(assetsDir);

    // Check if file already exists
    const filePath = vscode.Uri.joinPath(assetsDir, fileName);
    try {
        await vscode.workspace.fs.stat(filePath);
        // File exists, check if content matches
        const existingContent = await vscode.workspace.fs.readFile(filePath);
        const existingHash = crypto.createHash('md5').update(Buffer.from(existingContent)).digest('hex');
        const newHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
        if (existingHash === newHash) {
            return filePath;
        }
        // Different content, append timestamp
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        const newFileName = `${baseName}_${Date.now()}${ext}`;
        const newFilePath = vscode.Uri.joinPath(assetsDir, newFileName);
        await vscode.workspace.fs.writeFile(newFilePath, imageBuffer);
        return newFilePath;
    } catch {
        // File doesn't exist, create it
        await vscode.workspace.fs.writeFile(filePath, imageBuffer);
        return filePath;
    }
}
