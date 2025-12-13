'use client';

/**
 * UploadDropzone Component
 * Beautiful drag-and-drop zone for multi-image upload with previews and validation
 */
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateImageFile, formatFileSize, createPreviewUrl, revokePreviewUrl, fileToBase64 } from '@/app/lib/image-utils';
import { UPLOAD_CONFIG } from '@/app/constants';
import { toast } from 'sonner';
import type { ImageRow } from '@/app/types';

interface UploadDropzoneProps {
    onFilesAdded: (rows: ImageRow[]) => void;
    existingFiles?: ImageRow[];
    onRemove?: (id: string) => void;
    onToggleSelect?: (id: string) => void;
    onClearProcessed?: () => void;
    isGenerating?: boolean;
    toolbar?: React.ReactNode;
}

export function UploadDropzone({ onFilesAdded, existingFiles = [], onRemove, onToggleSelect, onClearProcessed, isGenerating = false, toolbar }: UploadDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const createImageRow = useCallback(async (file: File): Promise<ImageRow> => {
        const id = `${file.name}-${file.size}-${Date.now()}`;
        // Use data URL instead of blob URL so it persists across page refreshes
        const preview = await fileToBase64(file);

        return {
            id,
            file,
            fileSize: file.size,
            filename: file.name,
            preview,
            title: '',
            description: '',
            keywords: '',
            status: 'pending',
            selected: false,
        };
    }, []);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: any[]) => {
            // Handle rejected files
            if (rejectedFiles.length > 0) {
                rejectedFiles.forEach(({ file, errors }) => {
                    errors.forEach((error: any) => {
                        if (error.code === 'file-too-large') {
                            toast.error(`${file.name}: File too large (max ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB)`);
                        } else if (error.code === 'file-invalid-type') {
                            toast.error(`${file.name}: Invalid file type`);
                        } else {
                            toast.error(`${file.name}: ${error.message}`);
                        }
                    });
                });
            }

            // Validate and process accepted files
            const validFiles: File[] = [];
            const existingFilenames = new Set(existingFiles.map(f => f.filename));

            acceptedFiles.forEach((file) => {
                // Check for duplicates
                if (existingFilenames.has(file.name)) {
                    toast.warning(`${file.name} is already uploaded`);
                    return;
                }

                // Validate file
                const validation = validateImageFile(file);
                if (!validation.isValid) {
                    toast.error(`${file.name}: ${validation.error}`);
                    return;
                }

                validFiles.push(file);
            });

            // Check batch limit
            const totalFiles = existingFiles.length + validFiles.length;
            if (totalFiles > UPLOAD_CONFIG.MAX_FILES_PER_BATCH) {
                const allowed = UPLOAD_CONFIG.MAX_FILES_PER_BATCH - existingFiles.length;
                toast.error(`Maximum ${UPLOAD_CONFIG.MAX_FILES_PER_BATCH} files allowed. You can add ${allowed} more.`);
                validFiles.splice(allowed);
            }

            if (validFiles.length > 0) {
                // Clear processed images before adding new ones
                if (onClearProcessed) {
                    onClearProcessed();
                }

                // Convert files to ImageRows with data URL previews
                Promise.all(validFiles.map(createImageRow))
                    .then((newRows) => {
                        onFilesAdded(newRows);
                        toast.success(`Added ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}`);
                    })
                    .catch((error) => {
                        console.error('Error creating image rows:', error);
                        toast.error('Failed to process some images');
                    });
            }
        },
        [createImageRow, existingFiles, onFilesAdded, onClearProcessed]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
        },
        maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
        multiple: true,
        noClick: isGenerating,
        noKeyboard: isGenerating,
        disabled: isGenerating,
        onDragEnter: () => !isGenerating && setIsDragging(true),
        onDragLeave: () => setIsDragging(false),
        onDropAccepted: () => setIsDragging(false),
        onDropRejected: () => setIsDragging(false),
    });

    const handleRemovePreview = useCallback((preview: string) => {
        revokePreviewUrl(preview);
    }, []);

    return (
        <Card className="border-2 border-dashed transition-colors">
            <CardContent className="p-6">
                <div
                    {...getRootProps()}
                    className={`
            relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
            transition-all ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${isDragActive || isDragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                        }
          `}
                >
                    <input {...getInputProps()} disabled={isGenerating} />

                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="rounded-full bg-primary/10 p-4">
                            {isDragActive || isDragging ? (
                                <Upload className="h-8 w-8 text-primary animate-bounce" />
                            ) : (
                                <ImageIcon className="h-8 w-8 text-primary" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">
                                {isDragActive || isDragging ? 'Drop images here' : 'Upload Images'}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Drag and drop images here, or click to browse
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {UPLOAD_CONFIG.SUPPORTED_EXTENSIONS.join(', ')}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB per file
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Up to {UPLOAD_CONFIG.MAX_FILES_PER_BATCH} files
                            </Badge>
                        </div>

                        <Button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isGenerating) {
                                    open();
                                }
                            }}
                            className="mt-2"
                            disabled={isGenerating}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {isGenerating ? 'Processing...' : 'Select Images'}
                        </Button>
                    </div>
                </div>

                {/* Batch Toolbar - Show between dropzone and images */}
                {toolbar && (
                    <div className="mt-6">
                        {toolbar}
                    </div>
                )}

                {existingFiles.length > 0 ? (
                    <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-medium">
                                Uploaded Images ({existingFiles.length})
                            </h4>
                            <Badge variant="secondary">{existingFiles.length} / {UPLOAD_CONFIG.MAX_FILES_PER_BATCH}</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {existingFiles.map((row) => (
                                <div
                                    key={row.id}
                                    className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all ${row.selected ? 'ring-2 ring-primary ring-offset-2' : ''
                                        }`}
                                >
                                    {(() => {
                                        // Regenerate preview from file if available and preview is missing
                                        if (!row.preview && row.file) {
                                            // Create preview on the fly from File object
                                            const previewUrl = URL.createObjectURL(row.file);
                                            return (
                                                <img
                                                    src={previewUrl}
                                                    alt={row.filename}
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent && !parent.querySelector('.image-fallback')) {
                                                            const fallback = document.createElement('div');
                                                            fallback.className = 'image-fallback h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-2 text-center';
                                                            fallback.textContent = row.filename;
                                                            parent.appendChild(fallback);
                                                        }
                                                    }}
                                                />
                                            );
                                        }

                                        // Use stored preview if available
                                        if (row.preview) {
                                            return (
                                                <img
                                                    src={row.preview}
                                                    alt={row.filename}
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent && !parent.querySelector('.image-fallback')) {
                                                            const fallback = document.createElement('div');
                                                            fallback.className = 'image-fallback h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-2 text-center';
                                                            fallback.textContent = row.filename;
                                                            parent.appendChild(fallback);
                                                        }
                                                    }}
                                                />
                                            );
                                        }

                                        // Fallback: show filename if no preview and no file
                                        return (
                                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-xs p-2 text-center">
                                                {row.filename}
                                            </div>
                                        );
                                    })()}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                                        <div className="text-center text-white text-xs px-2">
                                            <p className="truncate font-medium">{row.filename}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatFileSize(row.file?.size || row.fileSize || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Checkbox on hover */}
                                    {onToggleSelect && (
                                        <div
                                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSelect(row.id);
                                            }}
                                        >
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-background border-2 border-primary/50"
                                            >
                                                {row.selected ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                    {onRemove && (
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(row.id);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <div className="absolute bottom-1 left-1 flex gap-1">
                                        <Badge
                                            variant={row.status === 'success' ? 'default' : row.status === 'error' ? 'destructive' : 'secondary'}
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {row.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mt-6">
                        <Card className="border-2 border-dashed">
                            <CardContent className="p-12">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="rounded-full bg-muted p-4 mb-4">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No Pending Images</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                                        Please upload images to generate metadata. Once images are processed, they will be moved to the Results page.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

