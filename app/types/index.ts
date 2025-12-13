/**
 * Status of metadata generation for an image
 */
export type GenerationStatus = 'pending' | 'generating' | 'success' | 'error';

/**
 * Represents a single image row in the results table
 */
export type ImageRow = {
    /** Unique identifier for the row */
    id: string;

    /** Original File object (optional - not available when loaded from localStorage) */
    file?: File;

    /** File size in bytes (stored separately for localStorage compatibility) */
    fileSize?: number;

    /** Filename without path */
    filename: string;

    /** Data URL for image preview */
    preview: string;

    /** Generated or manually edited title */
    title: string;

    /** Generated or manually edited description */
    description: string;

    /** Generated or manually edited keywords (comma-separated) */
    keywords: string;

    /** Current generation status */
    status: GenerationStatus;

    /** Error message if generation failed */
    error?: string;

    /** Whether this row is selected for batch operations */
    selected: boolean;

    /** Timestamp when generation started */
    generatedAt?: number;
};

/**
 * Response structure from Gemini API
 */
export type GeminiResponse = {
    title: string;
    description: string;
    keywords: string[]; // Array of keywords before normalization
};

/**
 * CSV row data structure
 */
export type CsvRow = {
    Filename: string;
    Title: string;
    Description: string;
    Keywords: string;
};

/**
 * API key validation result
 */
export type ApiKeyValidation = {
    isValid: boolean;
    error?: string;
};

/**
 * Generation progress information
 */
export type GenerationProgress = {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
};

