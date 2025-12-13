'use client';

/**
 * ApiKeyModal Component
 * Modal dialog for managing Gemini API key with validation and testing
 */
import { useState, useEffect, useRef } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Trash2, TestTube, X } from 'lucide-react';
import { useApiKeyContext } from '@/app/context/ApiKeyContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ApiKeyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
    const { apiKey, hasKey, isTesting, validation, saveKey, removeKey, testKey, clearValidation } = useApiKeyContext();
    const [inputValue, setInputValue] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load existing key into input when modal opens or key changes
    useEffect(() => {
        if (open && apiKey && !inputValue) {
            setInputValue(apiKey);
        }
    }, [open, apiKey, inputValue]);

    // Clear errors and reset input when modal closes
    useEffect(() => {
        if (!open) {
            clearValidation();
            setInputValue(apiKey || '');
            setShowKey(false);
        }
    }, [open, clearValidation, apiKey]);

    // Focus input when modal opens - handled by onOpenAutoFocus on DialogContent

    const handleSave = async () => {
        if (!inputValue.trim()) {
            toast.error('Please enter an API key');
            return;
        }

        // Don't save if the key hasn't changed
        if (hasKey && apiKey && inputValue.trim() === apiKey.trim()) {
            toast.info('API key unchanged');
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveKey(inputValue);
            if (result.isValid) {
                toast.success(hasKey ? 'API key updated successfully' : 'API key saved successfully');
                // Modal stays open after saving
            } else {
                toast.error(result.error || 'Failed to save API key');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        const keyToTest = inputValue.trim() || apiKey;
        if (!keyToTest) {
            toast.error('Please enter an API key to test');
            return;
        }

        toast.loading('Testing API key...', { id: 'test-key' });
        try {
            const result = await testKey(keyToTest);
            if (result.isValid) {
                toast.success('API key is valid and working!', { id: 'test-key' });
            } else {
                toast.error(result.error || 'API key test failed', { id: 'test-key' });
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to test API key', { id: 'test-key' });
        }
    };

    const handleRemove = () => {
        if (window.confirm('Are you sure you want to remove the API key?')) {
            removeKey();
            setInputValue('');
            toast.success('API key removed');
            onOpenChange(false);
        }
    };

    const getStatusBadge = () => {
        if (isTesting) {
            return (
                <Badge variant="secondary" className="gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Testing...
                </Badge>
            );
        }

        if (validation) {
            if (validation.isValid) {
                return (
                    <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                    </Badge>
                );
            } else {
                return (
                    <Badge variant="destructive" className="gap-1.5">
                        <XCircle className="h-3 w-3" />
                        Invalid
                    </Badge>
                );
            }
        }

        if (hasKey) {
            return (
                <Badge variant="default" className="gap-1.5">
                    <Key className="h-3 w-3" />
                    Configured
                </Badge>
            );
        }

        return null;
    };

    const handleClose = () => {
        if (!isSaving && !isTesting) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => {
            // Prevent default closing behavior - only allow programmatic closing
        }}>
            <DialogContent
                className="sm:max-w-[600px]"
                showCloseButton={false}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    // Use requestAnimationFrame to ensure DOM is ready, then focus input
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            inputRef.current?.focus();
                            inputRef.current?.select();
                        }, 150);
                    });
                }}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            <DialogTitle>Gemini API Key</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusBadge()}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleClose}
                                disabled={isSaving || isTesting}
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <DialogDescription>
                        Enter your Google Gemini API key to enable metadata generation
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {hasKey && !inputValue && (
                        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                            API key is configured. Enter a new key below to update it.
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-sm font-medium">
                            API Key
                        </Label>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                id="api-key"
                                type={showKey ? 'text' : 'password'}
                                placeholder="Enter your Gemini API key"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSave();
                                    }
                                }}
                                className="pr-10"
                                disabled={isSaving || isTesting}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowKey(!showKey)}
                                disabled={!inputValue}
                            >
                                {showKey ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                                Don't have an API key? Get one from
                            </p>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                Google AI Studio
                                <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {validation && !validation.isValid && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {validation.error}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={!inputValue.trim() || isSaving || isTesting}
                            className="flex-1 min-w-[120px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Key className="mr-2 h-4 w-4" />
                                    {hasKey ? 'Update Key' : 'Save Key'}
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleTest}
                            variant="outline"
                            disabled={(!inputValue.trim() && !apiKey) || isSaving || isTesting}
                            className="flex-1 min-w-[120px]"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <TestTube className="mr-2 h-4 w-4" />
                                    Test Key
                                </>
                            )}
                        </Button>

                        {hasKey && (
                            <Button
                                onClick={handleRemove}
                                variant="destructive"
                                disabled={isSaving || isTesting}
                                className="flex-1 min-w-[120px]"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

