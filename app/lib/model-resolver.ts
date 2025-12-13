/**
 * Model Resolver
 * Discovers available Gemini models for a given API key and selects the best one
 */
import { GEMINI_CONFIG } from '@/app/constants';

export interface GeminiModel {
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
    version?: string;
}

export interface ModelResolutionResult {
    modelName: string;
    modelDisplayName: string;
    apiVersion: 'v1' | 'v1beta';
    error?: string;
}

/**
 * Discover available models for an API key
 * @param apiKey - Gemini API key
 * @param apiVersion - API version to use ('v1' or 'v1beta')
 * @returns Array of available models
 */
async function discoverModels(
    apiKey: string,
    apiVersion: 'v1' | 'v1beta' = 'v1beta'
): Promise<GeminiModel[]> {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${encodeURIComponent(apiKey.trim())}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
}

/**
 * Find the best model for image analysis
 * Prefers fast vision-capable models that support generateContent
 * @param models - Array of available models
 * @returns Best model name or null
 */
function findBestModel(models: GeminiModel[]): { model: GeminiModel; apiVersion: 'v1' | 'v1beta' } | null {
    // Filter models that support generateContent
    const supportedModels = models.filter((model) =>
        model.supportedGenerationMethods?.includes('generateContent')
    );

    if (supportedModels.length === 0) {
        return null;
    }

    // Priority order: prefer flash models (faster), then pro models
    const priorityOrder = [
        /gemini-.*-flash/i, // Any flash model
        /gemini-.*-pro/i,   // Any pro model
        /gemini/i,          // Any other gemini model
    ];

    for (const pattern of priorityOrder) {
        const matching = supportedModels.find((model) => pattern.test(model.name));
        if (matching) {
            // Determine API version from model name or default to v1beta
            const apiVersion = matching.name.includes('gemini-2.0') ? 'v1beta' : 'v1beta';
            return { model: matching, apiVersion };
        }
    }

    // Fallback to first supported model
    return { model: supportedModels[0], apiVersion: 'v1beta' };
}

/**
 * Resolve the best available model for an API key
 * Tries v1beta first, then falls back to v1
 * @param apiKey - Gemini API key
 * @returns Model resolution result
 */
export async function resolveModel(apiKey: string): Promise<ModelResolutionResult> {
    // Try v1beta first (has newer models like gemini-2.0-flash)
    for (const apiVersion of ['v1beta', 'v1'] as const) {
        try {
            const models = await discoverModels(apiKey, apiVersion);
            const bestModel = findBestModel(models);

            if (bestModel) {
                // Extract just the model name (remove 'models/' prefix if present)
                let modelName = bestModel.model.name;
                if (modelName.startsWith('models/')) {
                    modelName = modelName.substring(7); // Remove 'models/' prefix
                }

                return {
                    modelName,
                    modelDisplayName: bestModel.model.displayName || modelName,
                    apiVersion: bestModel.apiVersion,
                };
            }
        } catch (error) {
            // If v1beta fails, try v1
            if (apiVersion === 'v1beta') {
                continue;
            }
            throw error;
        }
    }

    throw new Error('No suitable model found for this API key');
}

/**
 * Get model name from localStorage or resolve it
 * @param apiKey - Gemini API key
 * @returns Model name
 */
export async function getOrResolveModel(apiKey: string): Promise<ModelResolutionResult> {
    const storageKey = 'gemini_resolved_model';

    // Check if we have a cached model for this key
    if (typeof window !== 'undefined') {
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Verify it's for the same API key (simple check - first 10 chars)
                if (parsed.keyPrefix === apiKey.substring(0, 10)) {
                    return {
                        modelName: parsed.modelName,
                        modelDisplayName: parsed.modelDisplayName,
                        apiVersion: parsed.apiVersion,
                    };
                }
            }
        } catch {
            // Ignore cache errors
        }
    }

    // Resolve model
    const result = await resolveModel(apiKey);

    // Cache the result
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    keyPrefix: apiKey.substring(0, 10),
                    modelName: result.modelName,
                    modelDisplayName: result.modelDisplayName,
                    apiVersion: result.apiVersion,
                })
            );
        } catch {
            // Ignore cache errors
        }
    }

    return result;
}

