/**
 * CSV generation utilities
 * Handles CSV creation with proper escaping for Adobe Stock format
 */
import { CSV_COLUMNS } from '@/app/constants';
import type { CsvRow, ImageRow } from '@/app/types';

/**
 * Escape a CSV field value
 * Handles quotes, commas, and newlines according to RFC 4180
 * @param value - Field value to escape
 * @returns Properly escaped CSV field
 */
export function escapeCsvField(value: string): string {
  // Convert to string if not already
  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert a single row to CSV line
 * @param row - CSV row data
 * @returns CSV-formatted line string
 */
export function rowToCsvLine(row: CsvRow): string {
  return CSV_COLUMNS.map(column => escapeCsvField(row[column])).join(',');
}

/**
 * Convert ImageRow to CsvRow
 * @param imageRow - Image row data
 * @returns CSV row data
 */
export function imageRowToCsvRow(imageRow: ImageRow): CsvRow {
  return {
    Filename: imageRow.filename,
    Title: imageRow.title,
    Description: imageRow.description,
    Keywords: imageRow.keywords,
  };
}

/**
 * Generate CSV content from array of image rows
 * @param imageRows - Array of image rows
 * @returns Complete CSV string with header and rows
 */
export function generateCsv(imageRows: ImageRow[]): string {
  // Filter to only include rows with successful generation and valid metadata
  const validRows = imageRows.filter(row =>
    row.status === 'success' &&
    row.title &&
    row.title.trim().length > 0 &&
    row.description &&
    row.description.trim().length > 0 &&
    row.keywords &&
    row.keywords.trim().length > 0
  );

  if (validRows.length === 0) {
    throw new Error('No valid rows to export. Please generate metadata for at least one image.');
  }

  // Create header row
  const header = CSV_COLUMNS.join(',');

  // Convert image rows to CSV rows and generate lines
  const csvLines = validRows.map(row => {
    const csvRow = imageRowToCsvRow(row);
    return rowToCsvLine(csvRow);
  });

  // Combine header and rows
  return [header, ...csvLines].join('\n');
}

/**
 * Download CSV file
 * @param csvContent - CSV string content
 * @param filename - Filename for download (default: "adobe-stock-metadata.csv")
 */
export function downloadCsv(csvContent: string, filename: string = 'adobe-stock-metadata.csv'): void {
  // Create blob with CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get estimated CSV file size
 * @param imageRows - Array of image rows
 * @returns Estimated size in bytes
 */
export function estimateCsvSize(imageRows: ImageRow[]): number {
  const validRows = imageRows.filter(row =>
    row.status === 'success' &&
    row.title &&
    row.title.trim().length > 0 &&
    row.description &&
    row.description.trim().length > 0 &&
    row.keywords &&
    row.keywords.trim().length > 0
  );
  if (validRows.length === 0) return 0;

  // Estimate: header + average row size * number of rows
  const headerSize = CSV_COLUMNS.join(',').length + 1; // +1 for newline
  const avgRowSize = validRows.reduce((sum, row) => {
    const csvRow = imageRowToCsvRow(row);
    return sum + rowToCsvLine(csvRow).length + 1; // +1 for newline
  }, 0) / validRows.length;

  return Math.ceil(headerSize + (avgRowSize * validRows.length));
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 KB")
 */
export function formatCsvSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

