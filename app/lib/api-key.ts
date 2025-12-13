/**
 * API Key Management Module
 * Handles localStorage-based storage and validation of Gemini API key
 */
import { GEMINI_CONFIG } from '@/app/constants';
import type { ApiKeyValidation } from '@/app/types';

const STORAGE_KEY = GEMINI_CONFIG.STORAGE_KEY;

/**
 * API Key Store - State module for managing Gemini API key lifecycle
 */
export const apiKeyStore = {
    /**
     * Load API key from localStorage
     * @returns API key string or null if not found
     */
    load: (): string | null => {
        if (typeof window === 'undefined') return null;
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to load API key from localStorage:', error);
            return null;
        }
    },

    /**
     * Save API key to localStorage
     * @param key - The API key to save
     */
    save: (key: string): void => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, key.trim());
        } catch (error) {
            console.error('Failed to save API key to localStorage:', error);
            throw new Error('Failed to save API key. Please check your browser settings.');
        }
    },

    /**
     * Remove API key from localStorage
     */
    remove: (): void => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(STORAGE_KEY);
            // Also clear the resolved model cache
            localStorage.removeItem('gemini_resolved_model');
        } catch (error) {
            console.error('Failed to remove API key from localStorage:', error);
        }
    },

    /**
     * Check if an API key exists in localStorage
     * @returns true if key exists, false otherwise
     */
    hasKey: (): boolean => {
        const key = apiKeyStore.load();
        return key !== null && key.trim().length > 0;
    },

    /**
     * Validate API key format (basic validation)
     * @param key - The API key to validate
     * @returns Validation result with isValid flag and optional error message
     */
    validate: (key: string): ApiKeyValidation => {
        const trimmed = key.trim();

        if (!trimmed) {
            return {
                isValid: false,
                error: 'API key cannot be empty',
            };
        }

        if (trimmed.length < 20) {
            return {
                isValid: false,
                error: 'API key appears to be too short',
            };
        }

        // Basic format check for Gemini API keys (usually start with specific patterns)
        // This is a soft validation - actual validation happens when testing the key
        return {
            isValid: true,
        };
    },

    /**
     * Test API key by discovering available models
     * @param key - The API key to test
     * @returns Promise that resolves to validation result
     */
    test: async (key: string): Promise<ApiKeyValidation> => {
        const validation = apiKeyStore.validate(key);
        if (!validation.isValid) {
            return validation;
        }

        try {
            // Use model resolver to discover available models
            const { getOrResolveModel } = await import('./model-resolver');
            const modelResult = await getOrResolveModel(key.trim());

            // Test the resolved model with a simple request
            const apiVersion = modelResult.apiVersion;
            const testUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelResult.modelName}:generateContent?key=${encodeURIComponent(key.trim())}`;

            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Say "test"',
                        }],
                    }],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    isValid: false,
                    error: errorData.error?.message || `API request failed: ${response.status}`,
                };
            }

            return {
                isValid: true,
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Failed to test API key',
            };
        }
    },
};

