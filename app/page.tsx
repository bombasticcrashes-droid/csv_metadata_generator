'use client';

/**
 * Main Page Component
 * Adobe Stock CSV Generator - Single page application
 * Modified: Concurrency set to 1 and Retry Button added
 */
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { ApiKeyModal } from '@/app/components/ApiKeyModal';
import { UploadDropzone } from '@/app/components/UploadDropzone';
import { BatchToolbarCompact } from '@/app/components/BatchToolbarCompact';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Key, Eye, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApiKeyContext } from '@/app/context/ApiKeyContext';
import { useResults } from '@/app/context/ResultsContext';
import { generateMetadata, type GeminiApiError } from '@/app/lib/gemini';
import { fileToBase64, revokePreviewUrl } from '@/app/lib/image-utils';
import { processKeywords } from '@/app/lib/keyword-normalizer';
import { GEMINI_CONFIG } from '@/app/constants';
import type { ImageRow, GenerationProgress } from '@/app/types';
import { toast } from 'sonner';

export default function Page() {
  const router = useRouter();
  const { apiKey, hasKey } = useApiKeyContext();
  const { rows, addRows, updateRow, removeRow, setRows } = useResults();
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
  });

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

  const generateForRow = useCallback(
    async (row: ImageRow, apiKey: string): Promise<void> => {
      if (!row.file) {
        handleUpdateRow(row.id, {
          status: 'error',
          error: 'File not available. Please re-upload this image.',
          title: '',
          description: '',
          keywords: '',
        });
        return;
      }

      handleUpdateRow(row.id, { status: 'generating', generatedAt: Date.now() });

      try {
        const base64 = await fileToBase64(row.file);
        const response = await generateMetadata(apiKey, base64);
        const keywordResult = processKeywords(response.keywords);

        handleUpdateRow(row.id, {
          status: 'success',
          title: response.title,
          description: response.description,
          keywords: keywordResult.normalized,
          error: undefined,
        });
      } catch (error) {
        let errorMessage = 'Unknown error occurred';

        if (error && typeof error === 'object' && 'code' in error && (error as GeminiApiError).code === 'QUOTA_EXCEEDED') {
          const quotaError = error as GeminiApiError;
          errorMessage = quotaError.message || 'API quota exceeded. Please try again later.';
          toast.error('Quota Exceeded', {
            description: 'You have reached your daily API request limit.',
            duration: 10000,
          });
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        handleUpdateRow(row.id, {
          status: 'error',
          error: errorMessage,
          title: '',
          description: '',
          keywords: '',
        });
        throw error;
      }
    },
    [handleUpdateRow]
  );

  // --- FIXED: BATCH GENERATION LOGIC ---
  const generateBatch = useCallback(
    async (rowsToGenerate: ImageRow[]) => {
      if (!apiKey) {
        toast.error('API key not configured');
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

      // FIXED: Set Concurrency to 1 (One by one)
      const concurrency = 1; 
      const queue = [...rowsToGenerate];
      const results: Array<{ success: boolean }> = [];

      const processQueue = async () => {
        while (queue.length > 0) {
          const row = queue.shift();
          if (!row) break;

          try {
            await generateForRow(row, apiKey);
            results.push({ success: true });
            
            // Wait 1 second after success to prevent Rate Limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

            setProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              inProgress: prev.inProgress - 1,
            }));
          } catch (error) {
            results.push({ success: false });
            // Wait 2 seconds after error
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setProgress((prev) => ({
              ...prev,
              failed: prev.failed + 1,
              inProgress: prev.inProgress - 1,
            }));
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, rowsToGenerate.length) }, () =>
        processQueue()
      );

      await Promise.all(workers);

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
        toast.success(`Generated metadata for ${successCount} image${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to generate metadata for ${failCount} image${failCount > 1 ? 's' : ''}`);
      }
    },
    [apiKey, generateForRow]
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

  // --- NEW: RETRY FAILED BUTTON LOGIC ---
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Adobe Stock CSV Generator</h1>
              <p className="mt-2 text-muted-foreground">
                Upload images → generate Title/Description/Keywords → export CSV
              </p>
            </div>
            <div className="flex items-center gap-3">
               {/* NEW: Retry Button (Only shows if there are errors) */}
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
                {hasKey ? 'Manage API Key' : 'Configure API Key'}
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
                  <svg
                    className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                    API Key Required
                  </h3>
                  <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
                    You have uploaded {rows.length} image{rows.length > 1 ? 's' : ''}, but you need to configure your Gemini API key to generate metadata.
                  </p>
                  <p className="mt-3 text-sm text-yellow-800 dark:text-yellow-200">
                    Get your API key from{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline hover:no-underline"
                    >
                      Google AI Studio
                    </a>
                    {' '}and click the "Configure API Key" button above to continue.
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
