'use client';

/**
 * BatchToolbarCompact Component
 * Compact toolbar for batch generation displayed below the dropzone
 */
import { Sparkles, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ImageRow, GenerationProgress } from '@/app/types';

interface BatchToolbarCompactProps {
    rows: ImageRow[];
    progress: GenerationProgress;
    isGenerating: boolean;
    onGenerate: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    hasApiKey: boolean;
}

export function BatchToolbarCompact({
    rows,
    progress,
    isGenerating,
    onGenerate,
    onSelectAll,
    onDeselectAll,
    hasApiKey,
}: BatchToolbarCompactProps) {
    const pendingRows = rows.filter((r) => r.status === 'pending');
    const selectedRows = rows.filter((r) => r.selected && r.status === 'pending');
    const selectedCount = rows.filter((r) => r.selected).length;
    const hasSelected = selectedCount > 0;
    const allPendingSelected = pendingRows.length > 0 && selectedRows.length === pendingRows.length;

    // Determine what will be generated
    const willGenerateSelected = hasSelected && selectedRows.length > 0;
    const generateCount = willGenerateSelected ? selectedRows.length : pendingRows.length;
    const generateLabel = willGenerateSelected
        ? `Generate Selected (${selectedRows.length})`
        : `Generate All (${pendingRows.length})`;

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* Selection Controls */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                    disabled={pendingRows.length === 0 || isGenerating}
                    className="gap-1.5"
                >
                    {allPendingSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                        <Square className="h-4 w-4" />
                    )}
                    Select All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDeselectAll}
                    disabled={selectedCount === 0 || isGenerating}
                    className="gap-1.5"
                >
                    Deselect All
                </Button>

                {/* Status Badge */}
                <Badge variant="secondary" className="gap-1.5">
                    <CheckSquare className="h-3 w-3" />
                    {selectedCount} selected
                </Badge>

                {/* Generate Button */}
                {hasApiKey && (
                    <Button
                        onClick={onGenerate}
                        disabled={generateCount === 0 || isGenerating}
                        size="sm"
                        className="gap-1.5"
                    >
                        <Sparkles className="h-4 w-4" />
                        {isGenerating ? 'Generating...' : generateLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
