'use client';

/**
 * Main Page Component
 * Adobe Stock CSV Generator - MULTI-KEY ROTATION SYSTEM
 * Automatically switches API keys if one fails due to quota limits.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { ApiKeyModal } from '@/app/components/ApiKeyModal';
import { UploadDropzone } from '@/app/components/UploadDropzone';
import { BatchToolbarCompact } from '@/app/components/BatchToolbarCompact';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Key, Eye, RefreshCw, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApiKeyContext } from '@/app/context/ApiKeyContext';
import { useResults } from '@/app/context/ResultsContext';
import { generateMetadata, type GeminiApiError } from '@/app/lib/gemini';
import { fileToBase64, revokePreviewUrl } from '@/app/lib/image-utils';
import { processKeywords } from '@/app/lib/keyword-normalizer';
import type { ImageRow, GenerationProgress } from '@/app/types';
import { toast } from 'sonner';

export default function Page() {
  const router = useRouter();
  const { apiKey, hasKey } = useApiKeyContext();
  const { rows, addRows, updateRow, removeRow, setRows } = useResults();
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  
  // Track which key index is currently working nicely
  const activeKeyIndexRef = useRef(0);

  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
  });

  // Helper to parse multiple keys
  const getApiKeys = useCallback(() => {
    if (!apiKey) return [];
    return apiKey.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
  }, [apiKey]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      rows.forEach((row) => {
        if (row.preview && row.preview.startsWith('blob:')) {
          revokePreviewUrl(row.preview);
        }
      });
    };
  }, [rows]);

  const handleClearProcessed = useCallback(() => {
    const pendingRows = rows.filter(r => r.status === 'pending');
    setRows(pendingRows);
  }, [rows, setRows]);

  const handleFilesAdded = useCallback((newRows: ImageRow[]) => {
    addRows(newRows);
  }, [addRows]);

  const handleUpdateRow = useCallback(
    (id: string, updates: Partial<ImageRow>) => {
      updateRow(id, updates);
    },
    [updateRow]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row && row.preview && row.preview.startsWith('blob:')) {
        revokePreviewUrl(row.preview);
      }
      removeRow(id);
      toast.success('Image removed');
    },
    [rows, removeRow]
  );

  const handleToggleSelect = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) {
        updateRow(id, { selected: !row.selected });
      }
    },
    [rows, updateRow]
  );

  const handleSelectAll = useCallback(() => {
    rows.forEach((row) => {
      if (!row.selected) {
        updateRow(row.id, { selected: true });
      }
    });
  }, [rows, updateRow]);

  const handleDeselectAll = useCallback(() => {
    rows.forEach((row) => {
      if (row.selected) {
        updateRow(row.id, { selected: false });
      }
    });
  }, [rows, updateRow]);

  // --- SMART KEY ROTATION LOGIC ---
  const generateForRow = useCallback(
    async (row: ImageRow): Promise<void> => {
      if (!row.file) {
        handleUpdateRow(row.id, { status: 'error', error: 'File missing' });
        return;
      }

      const keys = getApiKeys();
      if (keys.length === 0) throw new Error("No API keys found");

      handleUpdateRow(row.id, { status: 'generating', generatedAt: Date.now() });

      let lastError = null;
      let success = false;
      const base64 = await fileToBase64(row.file);

      // Try keys starting from the last known good key (activeKeyIndexRef)
      // Loop through all keys available
      for (let i = 0; i < keys.length; i++) {
        // Calculate which key index to try (Round Robin)
        const keyIndexToTry = (activeKeyIndexRef.current + i) % keys.length;
        const currentKey = keys[keyIndexToTry];

        try {
          // Attempt generation
          const response = await generateMetadata(currentKey, base64);
          const keywordResult = processKeywords(response.keywords);

          handleUpdateRow(row.id, {
            status: 'success',
            title: response.title,
            description: response.description,
            keywords: keywordResult.normalized,
            error: undefined,
          });

          // If successful, update the ref to stay on this key for next time
          activeKeyIndexRef.current = keyIndexToTry;
          success = true;
          break; // Exit loop on success

        } catch (error) {
          lastError = error;
          
          // Check if it's a Quota error (429)
          const isQuotaError = 
            (error && typeof error === 'object' && 'code' in error && (error as GeminiApiError).code === 'QUOTA_EXCEEDED') ||
            (error instanceof Error && error.message.includes('429'));

          if (isQuotaError) {
            console.warn(`Key ending in ...${currentKey.slice(-4)} exhausted. Switching to next key...`);
            // Continue to next iteration of loop (Next Key)
            continue; 
          } else {
            // If it's NOT a quota error (e.g., bad image, network error), don't switch keys, just fail.
            throw error;
          }
        }
      }

      if (!success) {
        // If we ran out of keys
        let errorMessage = 'Failed';
        if (lastError instanceof Error) errorMessage = lastError.message;
        
        handleUpdateRow(row.id, {
          status: 'error',
          error: `All ${keys.length} keys exhausted or failed. ${errorMessage}`,
        });
        throw lastError;
      }
    },
    [handleUpdateRow, getApiKeys]
  );

  const generateBatch = useCallback(
    async (rowsToGenerate: ImageRow[]) => {
      const keys = getApiKeys();
      if (keys.length === 0) {
        toast.error('Please configure at least one API Key!');
        setApiKeyModalOpen(true);
        return;
      }

      if (rowsToGenerate.length === 0) {
        toast.warning('No images to generate');
        return;
      }

      setIsGenerating(true);
      setProgress({
        total: rowsToGenerate.length,
        completed: 0,
        failed: 0,
        inProgress: rowsToGenerate.length,
      });

      const queue = [...rowsToGenerate];
      const results: Array<{ success: boolean }> = [];

      // Process one by one (Sequential) to ensure Key Rotation works reliably
      for (const row of queue) {
          try {
            await generateForRow(row); // Now handles rotation internally
            results.push({ success: true });
            
            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              inProgress: prev.inProgress - 1,
            }));

            // Small delay to be polite to the API, even with rotation
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            results.push({ success: false });
            setProgress((prev) => ({
              ...prev,
              failed: prev.failed + 1,
              inProgress: prev.inProgress - 1,
            }));
            // If failed (and all keys exhausted), wait a bit longer
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      setIsGenerating(false);

      setTimeout(() => {
        setProgress({
          total: 0,
          completed: 0,
          failed: 0,
          inProgress: 0,
        });
      }, 2000);

      if (successCount > 0) {
        toast.success(`Done! ${successCount} processed.`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} failed. Check keys.`);
      }
    },
    [getApiKeys, generateForRow]
  );

  const handleGenerateAll = useCallback(() => {
    const pendingRows = rows.filter((r) => r.status === 'pending');
    generateBatch(pendingRows);
  }, [rows, generateBatch]);

  const handleGenerateSelected = useCallback(() => {
    const selectedPendingRows = rows.filter(
      (r) => r.selected && r.status === 'pending'
    );
    generateBatch(selectedPendingRows);
  }, [rows, generateBatch]);

  const handleRetryFailed = useCallback(() => {
    const failedRows = rows.filter((r) => r.status === 'error');
    if (failedRows.length === 0) {
      toast.info('No failed images to retry');
      return;
    }
    toast.info(`Retrying ${failedRows.length} failed images...`);
    generateBatch(failedRows);
  }, [rows, generateBatch]);

  const processedResultsCount = rows.filter(r => r.status === 'success').length;
  const failedResultsCount = rows.filter(r => r.status === 'error').length;
  const keyCount = getApiKeys().length;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Adobe Stock CSV Generator</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={keyCount > 0 ? "secondary" : "destructive"}>
                  <Layers className="h-3 w-3 mr-1" />
                  {keyCount} API Key{keyCount !== 1 ? 's' : ''} Active
                </Badge>
                <p className="text-muted-foreground text-sm">
                   - Auto Switch Enabled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               {/* Retry Button */}
               {failedResultsCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Retry Failed ({failedResultsCount})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/results')}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                View Results
                {processedResultsCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {processedResultsCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={hasKey ? 'outline' : 'default'}
                onClick={() => setApiKeyModalOpen(true)}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                {hasKey ? 'Manage Keys' : 'Configure Keys'}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <UploadDropzone
            onFilesAdded={handleFilesAdded}
            existingFiles={rows}
            onRemove={handleRemove}
            onToggleSelect={handleToggleSelect}
            onClearProcessed={handleClearProcessed}
            isGenerating={isGenerating}
            toolbar={
              <BatchToolbarCompact
                rows={rows}
                progress={progress}
                isGenerating={isGenerating}
                onGenerate={() => {
                  const selectedPendingRows = rows.filter(
                    (r) => r.selected && r.status === 'pending'
                  );
                  if (selectedPendingRows.length > 0) {
                    handleGenerateSelected();
                  } else {
                    handleGenerateAll();
                  }
                }}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                hasApiKey={hasKey}
              />
            }
          />

          {!hasKey && rows.length > 0 && (
            <div className="rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-yellow-500/20 p-2">
                  <Key className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                    API Key Required
                  </h3>
                  <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
                    Please click "Configure Keys" above and paste your Gemini Keys. You can add multiple keys to avoid limits.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
      <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} />
    </main>
  );
}
