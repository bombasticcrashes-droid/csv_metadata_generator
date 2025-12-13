/**
 * Image utility functions
 * Handles image file processing, validation, and base64 conversion
 */
import { UPLOAD_CONFIG } from '@/app/constants';

/**
 * Validate if a file is a supported image format
 * @param file - File to validate
 * @returns true if file is supported, false otherwise
 */
export function isValidImageFormat(file: File): boolean {
    return UPLOAD_CONFIG.SUPPORTED_FORMATS.includes(file.type as any);
}

/**
 * Validate if file size is within limits
 * @param file - File to validate
 * @returns true if file size is valid, false otherwise
 */
export function isValidFileSize(file: File): boolean {
    return file.size <= UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES;
}

/**
 * Validate an image file (format and size)
 * @param file - File to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
    if (!isValidImageFormat(file)) {
        return {
            isValid: false,
            error: `Unsupported format. Supported formats: ${UPLOAD_CONFIG.SUPPORTED_EXTENSIONS.join(', ')}`,
        };
    }

    if (!isValidFileSize(file)) {
        return {
            isValid: false,
            error: `File too large. Maximum size: ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB`,
        };
    }

    return { isValid: true };
}

/**
 * Convert a File to base64 data URL
 * @param file - Image file to convert
 * @returns Promise that resolves to base64 data URL string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Failed to convert file to base64'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Convert a File to base64 string (without data URL prefix)
 * @param file - Image file to convert
 * @returns Promise that resolves to base64 string
 */
export async function fileToBase64String(file: File): Promise<string> {
    const dataUrl = await fileToBase64(file);
    // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64String = dataUrl.split(',')[1];
    if (!base64String) {
        throw new Error('Failed to extract base64 string from data URL');
    }
    return base64String;
}

/**
 * Get MIME type from base64 data URL
 * @param dataUrl - Base64 data URL
 * @returns MIME type string (e.g., "image/jpeg")
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
}

/**
 * Create a preview URL from a File object
 * @param file - Image file
 * @returns Object URL for preview (should be revoked when done)
 */
export function createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 * @param url - Object URL to revoke
 */
export function revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

