/**
 * Adobe Stock validation rules and requirements
 * These constants ensure generated metadata meets Adobe Stock standards
 */
export const ADOBE_STOCK_RULES = {
    TITLE: {
        MIN_LENGTH: 10,
        MAX_LENGTH: 70,
    },
    DESCRIPTION: {
        MIN_LENGTH: 120,
        MAX_LENGTH: 200,
    },
    KEYWORDS: {
        MIN_COUNT: 25,
        MAX_COUNT: 49,
    },
} as const;

/**
 * CSV column order - must match exactly: Filename,Title,Description,Keywords
 */
export const CSV_COLUMNS = ['Filename', 'Title', 'Description', 'Keywords'] as const;

export type CsvColumn = typeof CSV_COLUMNS[number];

