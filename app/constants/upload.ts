/**
 * File upload configuration and constraints
 */
export const UPLOAD_CONFIG = {
    /** Maximum file size in megabytes */
    MAX_FILE_SIZE_MB: 10,

    /** Maximum file size in bytes (calculated) */
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

    /** Maximum number of files per batch */
    MAX_FILES_PER_BATCH: 20,

    /** Supported MIME types */
    SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,

    /** Supported file extensions */
    SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'] as const,
} as const;

export type SupportedFormat = typeof UPLOAD_CONFIG.SUPPORTED_FORMATS[number];

