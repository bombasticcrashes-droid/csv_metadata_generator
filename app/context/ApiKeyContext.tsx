'use client';

/**
 * API Key Context
 * Manages API key state across the application
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiKeyStore } from '@/app/lib/api-key';
import type { ApiKeyValidation } from '@/app/types';

interface ApiKeyContextType {
    apiKey: string | null;
    hasKey: boolean;
    isTesting: boolean;
    validation: ApiKeyValidation | null;
    saveKey: (key: string) => Promise<ApiKeyValidation>;
    removeKey: () => void;
    testKey: (key?: string) => Promise<ApiKeyValidation>;
    clearValidation: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [validation, setValidation] = useState<ApiKeyValidation | null>(null);

    // Load key from storage on mount
    useEffect(() => {
        const loadedKey = apiKeyStore.load();
        setApiKey(loadedKey);
    }, []);

    // Compute hasKey from apiKey state
    const hasKey = apiKey !== null && apiKey.trim().length > 0;

    // Save API key
    const saveKey = useCallback(async (key: string): Promise<ApiKeyValidation> => {
        const validationResult = apiKeyStore.validate(key);

        if (!validationResult.isValid) {
            setValidation(validationResult);
            return validationResult;
        }

        try {
            apiKeyStore.save(key);
            setApiKey(key.trim());
            setValidation({ isValid: true });
            return { isValid: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save API key';
            const errorResult: ApiKeyValidation = {
                isValid: false,
                error: errorMessage,
            };
            setValidation(errorResult);
            return errorResult;
        }
    }, []);

    // Remove API key
    const removeKey = useCallback(() => {
        apiKeyStore.remove();
        setApiKey(null);
        setValidation(null);
    }, []);

    // Test API key
    const testKey = useCallback(async (key?: string): Promise<ApiKeyValidation> => {
        const keyToTest = key || apiKey;
        if (!keyToTest) {
            const errorResult: ApiKeyValidation = {
                isValid: false,
                error: 'No API key provided',
            };
            setValidation(errorResult);
            return errorResult;
        }

        setIsTesting(true);
        try {
            const result = await apiKeyStore.test(keyToTest);
            setValidation(result);
            return result;
        } catch (error) {
            const errorResult: ApiKeyValidation = {
                isValid: false,
                error: error instanceof Error ? error.message : 'Failed to test API key',
            };
            setValidation(errorResult);
            return errorResult;
        } finally {
            setIsTesting(false);
        }
    }, [apiKey]);

    // Clear validation errors
    const clearValidation = useCallback(() => {
        setValidation(null);
    }, []);

    return (
        <ApiKeyContext.Provider
            value={{
                apiKey,
                hasKey,
                isTesting,
                validation,
                saveKey,
                removeKey,
                testKey,
                clearValidation,
            }}
        >
            {children}
        </ApiKeyContext.Provider>
    );
}

export function useApiKeyContext() {
    const context = useContext(ApiKeyContext);
    if (context === undefined) {
        throw new Error('useApiKeyContext must be used within an ApiKeyProvider');
    }
    return context;
}

