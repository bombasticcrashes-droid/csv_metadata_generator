'use client';

/**
 * Results Page
 * Displays all results in a table format
 */
import { useCallback } from 'react';
import { ArrowLeft, Eye, Download, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { generateCsv, downloadCsv } from '@/app/lib/csv-utils';
import { useResults } from '@/app/context/ResultsContext';
import { toast, Toaster } from 'sonner';

export default function ResultsPage() {
    const { rows } = useResults();

    const handleExport = useCallback(() => {
        try {
            const csvContent = generateCsv(rows);
            const filename = `adobe-stock-metadata-${new Date().toISOString().split('T')[0]}.csv`;
            downloadCsv(csvContent, filename);
            toast.success(`CSV exported successfully`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export CSV');
        }
    }, [rows]);

    // Only show successful rows in results - errors should stay on upload page for retry
    const successfulRows = rows.filter((r) => r.status === 'success');

    if (successfulRows.length === 0) {
        return (
            <main className="min-h-screen bg-background">
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <div className="mb-6">
                        <Link href="/">
                            <Button variant="ghost" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Upload
                            </Button>
                        </Link>
                    </div>
                    <Card className="border-2">
                        <CardContent className="p-12">
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <Eye className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No results yet</h3>
                                <p className="text-sm text-muted-foreground max-w-md mb-4">
                                    Generate metadata for your images to see results here.
                                </p>
                                <Link href="/">
                                    <Button>Go to Upload & Configure</Button>
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
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Upload
                        </Button>
                    </Link>
                    {successfulRows.length > 0 && (
                        <Button onClick={handleExport} size="lg" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export CSV ({successfulRows.length} ready)
                        </Button>
                    )}
                </div>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Results ({successfulRows.length})</span>
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                All Successful
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">Preview</TableHead>
                                        <TableHead className="min-w-[200px]">Filename</TableHead>
                                        <TableHead className="min-w-[250px]">Title</TableHead>
                                        <TableHead className="min-w-[300px]">Description</TableHead>
                                        <TableHead className="min-w-[200px]">Keywords</TableHead>
                                        <TableHead className="w-24">Status</TableHead>
                                        <TableHead className="w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {successfulRows.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <Link href={`/results/${row.id}`}>
                                                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                                                        {row.preview ? (
                                                            <img
                                                                src={row.preview}
                                                                alt={row.filename}
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const parent = target.parentElement;
                                                                    if (parent && !parent.querySelector('.image-fallback')) {
                                                                        const fallback = document.createElement('div');
                                                                        fallback.className = 'image-fallback h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-1 text-center';
                                                                        fallback.textContent = row.filename.substring(0, 10);
                                                                        parent.appendChild(fallback);
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-1 text-center">
                                                                {row.filename.substring(0, 10)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/results/${row.id}`} className="hover:underline">
                                                    <p className="text-sm font-medium truncate max-w-[200px]">{row.filename}</p>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm truncate max-w-[250px]" title={row.title}>
                                                    {row.title || <span className="text-muted-foreground">—</span>}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm line-clamp-2 max-w-[300px]" title={row.description}>
                                                    {row.description || <span className="text-muted-foreground">—</span>}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm truncate max-w-[200px]" title={row.keywords}>
                                                    {row.keywords ? (
                                                        <span className="text-muted-foreground">
                                                            {row.keywords.split(',').length} keywords
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Success
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Link href={`/results/${row.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Toaster position="top-right" richColors closeButton />
        </main>
    );
}

