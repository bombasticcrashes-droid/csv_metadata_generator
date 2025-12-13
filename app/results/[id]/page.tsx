'use client';

/**
 * Individual Result Detail Page
 * Shows detailed view of a single result with full editing capabilities
 */
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { parseKeywords } from '@/app/lib/keyword-normalizer';
import { useResults } from '@/app/context/ResultsContext';
import { toast, Toaster } from 'sonner';

export default function ResultDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { getRow } = useResults();
    const [expandedKeywords, setExpandedKeywords] = useState(false);

    const row = getRow(id);

    useEffect(() => {
        if (!row && id) {
            toast.error('Result not found');
            router.push('/results');
        } else if (row && row.status !== 'success') {
            // Only successful results should be accessible
            toast.error('This result is not available. Only successful results can be viewed.');
            router.push('/results');
        }
    }, [row, id, router]);

    const handleExport = () => {
        if (!row || row.status !== 'success') {
            toast.error('Cannot export: result is not ready');
            return;
        }

        try {
            const csvContent = `Filename,Title,Description,Keywords\n${row.filename},"${row.title}","${row.description}","${row.keywords}"`;
            const filename = `adobe-stock-${row.filename.replace(/\.[^/.]+$/, '')}-${new Date().toISOString().split('T')[0]}.csv`;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export CSV');
        }
    };


    if (!row) {
        return (
            <main className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <div className="mb-6">
                        <Link href="/results">
                            <Button variant="ghost" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Results
                            </Button>
                        </Link>
                    </div>
                    <Card className="border-2">
                        <CardContent className="p-12">
                            <div className="flex flex-col items-center justify-center text-center">
                                <h3 className="text-lg font-semibold mb-2">Result not found</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    The result you're looking for doesn't exist.
                                </p>
                                <Link href="/results">
                                    <Button>Go to Results</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/results">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Results
                        </Button>
                    </Link>
                    {row.status === 'success' && (
                        <Button onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export This Result
                        </Button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Image Preview */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{row.filename}</span>
                                <Badge
                                    variant={
                                        row.status === 'success'
                                            ? 'default'
                                            : row.status === 'error'
                                                ? 'destructive'
                                                : 'secondary'
                                    }
                                >
                                    {row.status}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                                {row.preview ? (
                                    <img
                                        src={row.preview}
                                        alt={row.filename}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent && !parent.querySelector('.image-fallback')) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'image-fallback h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center';
                                                fallback.textContent = `Preview not available: ${row.filename}`;
                                                parent.appendChild(fallback);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
                                        Preview not available: {row.filename}
                                    </div>
                                )}
                            </div>
                            {row.error && (
                                <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                    {row.error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata Form */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={row.title || ''}
                                    readOnly
                                    placeholder="No title"
                                    className="bg-muted cursor-default"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={row.description || ''}
                                    readOnly
                                    placeholder="No description"
                                    className="min-h-32 resize-none bg-muted cursor-default"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="keywords">Keywords</Label>
                                    {row.keywords && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setExpandedKeywords(!expandedKeywords)}
                                        >
                                            {expandedKeywords ? (
                                                <>
                                                    <EyeOff className="mr-1 h-3 w-3" />
                                                    Hide Preview
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    Show Preview
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <Textarea
                                    id="keywords"
                                    value={row.keywords || ''}
                                    readOnly
                                    placeholder="No keywords"
                                    className="min-h-32 resize-none bg-muted cursor-default"
                                />
                                {expandedKeywords && row.keywords && (
                                    <div className="rounded-md border bg-muted/50 p-3">
                                        <div className="flex flex-wrap gap-2">
                                            {parseKeywords(row.keywords).map((keyword, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                    {keyword}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {parseKeywords(row.keywords).length} keywords
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Toaster position="top-right" richColors closeButton />
        </main>
    );
}

