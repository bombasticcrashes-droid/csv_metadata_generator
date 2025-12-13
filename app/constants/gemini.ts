/**
 * Gemini API configuration constants
 * Centralized settings for Gemini API integration
 */
export const GEMINI_CONFIG = {
    /** Default model to use for image analysis - Free tier compatible */
    DEFAULT_MODEL: 'gemini-1.5-flash',

    /** Alternative model option (higher quality, slower) - Free tier compatible */
    ALTERNATIVE_MODEL: 'gemini-1.5-pro',

    /** Base URL for Gemini API - Using v1 for free tier access */
    API_BASE_URL: 'https://generativelanguage.googleapis.com/v1',

    /** Maximum number of concurrent API requests */
    CONCURRENCY_LIMIT: 3,

    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT_MS: 30000,

    /** Storage key for API key in localStorage */
    STORAGE_KEY: 'gemini_api_key',
} as const;

export type GeminiModel = typeof GEMINI_CONFIG.DEFAULT_MODEL | typeof GEMINI_CONFIG.ALTERNATIVE_MODEL;

