
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Note: Using Textarea, not Input
import { useApiKeyContext } from '@/app/context/ApiKeyContext';
import { toast } from 'sonner';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const { apiKey, setApiKey } = useApiKeyContext();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue(apiKey || '');
    }
  }, [open, apiKey]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error('Please enter at least one API key');
      return;
    }
    
    // Validate keys check
    const keys = trimmed.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
    
    if (keys.length === 0) {
        toast.error('Invalid API keys format');
        return;
    }

    setApiKey(trimmed); 
    toast.success(`Saved ${keys.length} API Key(s)`);
    onOpenChange(false);
  };

  const handleRemove = () => {
    setApiKey('');
    setValue('');
    toast.success('API Keys removed');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Gemini API Keys</DialogTitle>
          <DialogDescription>
            Paste your Google Gemini API keys below. 
            <strong>Paste one key per line</strong>. 
            The system will automatically switch keys if one hits the limit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            {/* YE BADA BOX HAI (Textarea) */}
            <Textarea
              id="apiKey"
              placeholder="Paste keys here (one per line)...&#10;AIzaSy...&#10;AIzaSy..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Get keys from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {apiKey && (
            <Button variant="destructive" onClick={handleRemove} className="mr-auto">
              Remove All
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
