/**
 * Keyword normalization utilities
 * Processes keywords to meet Adobe Stock requirements
 */
import { ADOBE_STOCK_RULES } from '@/app/constants';

/**
 * Normalize a single keyword
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove empty strings
 * @param keyword - Raw keyword string
 * @returns Normalized keyword or null if invalid
 */
export function normalizeKeyword(keyword: string): string | null {
  const normalized = keyword.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Normalize an array of keywords
 * - Convert to lowercase
 * - Remove duplicates
 * - Filter out empty strings
 * @param keywords - Array of raw keyword strings
 * @returns Array of normalized, unique keywords
 */
export function normalizeKeywords(keywords: string[]): string[] {
  const normalized = keywords
    .map(normalizeKeyword)
    .filter((kw): kw is string => kw !== null);
  
  // Remove duplicates using Set
  return Array.from(new Set(normalized));
}

/**
 * Parse keywords from a comma-separated string
 * @param keywordString - Comma-separated keyword string
 * @returns Array of normalized, unique keywords
 */
export function parseKeywords(keywordString: string): string[] {
  if (!keywordString || keywordString.trim().length === 0) {
    return [];
  }
  
  // Split by comma and normalize
  const keywords = keywordString.split(',').map(k => k.trim());
  return normalizeKeywords(keywords);
}

/**
 * Join keywords into a comma-separated string
 * @param keywords - Array of keywords
 * @returns Comma-separated string
 */
export function joinKeywords(keywords: string[]): string {
  return keywords.join(', ');
}

/**
 * Validate keyword count against Adobe Stock rules
 * @param keywords - Array of keywords
 * @returns Object with isValid flag and optional error message
 */
export function validateKeywordCount(keywords: string[]): { isValid: boolean; error?: string } {
  const count = keywords.length;
  const { MIN_COUNT, MAX_COUNT } = ADOBE_STOCK_RULES.KEYWORDS;
  
  if (count < MIN_COUNT) {
    return {
      isValid: false,
      error: `Too few keywords. Minimum: ${MIN_COUNT}, Current: ${count}`,
    };
  }
  
  if (count > MAX_COUNT) {
    return {
      isValid: false,
      error: `Too many keywords. Maximum: ${MAX_COUNT}, Current: ${count}`,
    };
  }
  
  return { isValid: true };
}

/**
 * Process and normalize keywords from Gemini response
 * Combines normalization, deduplication, and validation
 * @param rawKeywords - Raw keywords array from API
 * @returns Object with normalized keywords and validation result
 */
export function processKeywords(rawKeywords: string[]): {
  keywords: string[];
  normalized: string;
  validation: { isValid: boolean; error?: string };
} {
  const normalized = normalizeKeywords(rawKeywords);
  const normalizedString = joinKeywords(normalized);
  const validation = validateKeywordCount(normalized);
  
  return {
    keywords: normalized,
    normalized: normalizedString,
    validation,
  };
}

