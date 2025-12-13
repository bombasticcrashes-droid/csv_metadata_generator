'use client';

/**
 * Results Context
 * Manages results state across the application
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ImageRow } from '@/app/types';

interface ResultsContextType {
    rows: ImageRow[];
    setRows: (rows: ImageRow[] | ((prev: ImageRow[]) => ImageRow[])) => void;
    addRows: (rows: ImageRow[]) => void;
    updateRow: (id: string, updates: Partial<ImageRow>) => void;
    removeRow: (id: string) => void;
    getRow: (id: string) => ImageRow | undefined;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

const STORAGE_KEY = 'csv_generator_results';

export function ResultsProvider({ children }: { children: ReactNode }) {
    const [rows, setRowsState] = useState<ImageRow[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as ImageRow[];
                    // Preserve previews for successful results (they were stored)
                    // Empty preview for others (pending/error/generating don't have stored previews)
                    return parsed.map(row => ({
                        ...row,
                        preview: row.preview || '', // Keep preview if it exists (for successful results)
                    }));
                }
            } catch (error) {
                console.error('Failed to load results from localStorage:', error);
            }
        }
        return [];
    });

    // Sync to localStorage whenever rows change
    const syncToStorage = useCallback((rowsToStore: ImageRow[]) => {
        if (typeof window !== 'undefined') {
            try {
                // Store serializable data
                // For successful results: store metadata (title, description, keywords) AND preview
                // For pending/error/generating: don't store preview (save space), no metadata yet
                const serializable = rowsToStore.map(({ file, preview, ...rest }) => ({
                    ...rest,
                    // Store preview ONLY for successful results (they need to be viewable later)
                    // Don't store preview for pending/error/generating to save localStorage space
                    preview: rest.status === 'success' && preview ? preview : '',
                    fileSize: file?.size || rest.fileSize || 0, // Store file size separately
                }));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
            } catch (error) {
                // If quota exceeded, try to clear old data and retry with just metadata
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    console.warn('localStorage quota exceeded. Clearing old data and retrying with metadata only.');
                    try {
                        // Store only essential metadata (no previews) for successful results
                        const minimal = rowsToStore.map(({ file, preview, ...rest }) => ({
                            id: rest.id,
                            filename: rest.filename,
                            fileSize: file?.size || rest.fileSize || 0,
                            title: rest.title,
                            description: rest.description,
                            keywords: rest.keywords,
                            status: rest.status,
                            error: rest.error,
                            selected: rest.selected,
                            generatedAt: rest.generatedAt,
                            // No preview in minimal storage
                        }));
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
                    } catch (retryError) {
                        console.error('Failed to save results to localStorage after retry:', retryError);
                    }
                } else {
                    console.error('Failed to save results to localStorage:', error);
                }
            }
        }
    }, []);

    const setRows = useCallback((newRows: ImageRow[] | ((prev: ImageRow[]) => ImageRow[])) => {
        setRowsState((prev) => {
            const updated = typeof newRows === 'function' ? newRows(prev) : newRows;
            syncToStorage(updated);
            return updated;
        });
    }, [syncToStorage]);

    const addRows = useCallback((newRows: ImageRow[]) => {
        setRowsState((prev) => {
            const updated = [...prev, ...newRows];
            syncToStorage(updated);
            return updated;
        });
    }, [syncToStorage]);

    const updateRow = useCallback(
        (id: string, updates: Partial<ImageRow>) => {
            setRowsState((prev) => {
                const updated = prev.map((row) => (row.id === id ? { ...row, ...updates } : row));
                syncToStorage(updated);
                return updated;
            });
        },
        [syncToStorage]
    );

    const removeRow = useCallback(
        (id: string) => {
            setRowsState((prev) => {
                const updated = prev.filter((row) => row.id !== id);
                syncToStorage(updated);
                return updated;
            });
        },
        [syncToStorage]
    );

    const getRow = useCallback(
        (id: string) => {
            return rows.find((row) => row.id === id);
        },
        [rows]
    );

    return (
        <ResultsContext.Provider
            value={{
                rows,
                setRows,
                addRows,
                updateRow,
                removeRow,
                getRow,
            }}
        >
            {children}
        </ResultsContext.Provider>
    );
}

export function useResults() {
    const context = useContext(ResultsContext);
    if (context === undefined) {
        throw new Error('useResults must be used within a ResultsProvider');
    }
    return context;
}

