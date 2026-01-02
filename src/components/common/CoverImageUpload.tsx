import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

type CoverImageUploadProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  /**
   * When this value changes, the internal file input + local error/destroy state is reset.
   * Useful for "Add Book" vs "Edit Book" flows when the offcanvas stays mounted.
   */
  resetSignal?: number | string;
  maxSizeMB?: number;
  disabled?: boolean;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function isLikelyImage(value: string): boolean {
  return (
    value.startsWith('data:image/') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  );
}

/**
 * Preline-inspired image uploader with explicit "Destroy" and "Reinitialize" controls.
 *
 * Reference concept: Preline "Destroy and Reinitialize" example
 * https://preline.co/docs/file-upload.html
 */
export function CoverImageUpload({
  label,
  value,
  onChange,
  resetSignal,
  maxSizeMB = 2,
  disabled = false,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileMeta, setLastFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canInteract = !disabled && !isDestroyed;

  useEffect(() => {
    // Hard reset local UI state when parent tells us a new form session began.
    setIsDestroyed(false);
    setError(null);
    setLastFileMeta(null);
    setIsDragging(false);
    setInputKey((k) => k + 1);
  }, [resetSignal]);

  const previewUrl = useMemo(() => {
    if (!value || !isLikelyImage(value)) return '';
    return value;
  }, [value]);

  const readFileAsDataUrl = async (file: File) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File exceeds size limit. Please upload a file smaller than ${maxSizeMB}MB.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    setError(null);
    setLastFileMeta({ name: file.name, size: file.size });

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    onChange(dataUrl);
  };

  const onBrowse = () => {
    if (!canInteract) return;
    inputRef.current?.click();
  };

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await readFileAsDataUrl(file);
    } catch {
      setError('Failed to read file. Please try again.');
    } finally {
      // Allow selecting the same file twice by forcing a new input element next time.
      setInputKey((k) => k + 1);
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canInteract) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      await readFileAsDataUrl(file);
    } catch {
      setError('Failed to read file. Please try again.');
    } finally {
      setInputKey((k) => k + 1);
    }
  };

  const destroy = () => {
    setIsDestroyed(true);
    setError(null);
    setLastFileMeta(null);
    onChange('');
    setInputKey((k) => k + 1);
  };

  const reinitialize = () => {
    setIsDestroyed(false);
    setError(null);
    setLastFileMeta(null);
    setIsDragging(false);
    setInputKey((k) => k + 1);
  };

  const clearImage = () => {
    onChange('');
    setError(null);
    setLastFileMeta(null);
    setInputKey((k) => k + 1);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>

      {isDestroyed ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            File upload is destroyed. Click reinitialize to enable it again.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={reinitialize}
              disabled={disabled}
            >
              Reinitialize file upload
            </button>
          </div>
        </div>
      ) : (
        <div
          className={[
            'rounded-xl border p-4 transition',
            isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white',
            canInteract ? 'cursor-pointer hover:border-slate-300' : 'opacity-60 cursor-not-allowed',
          ].join(' ')}
          role="button"
          tabIndex={0}
          aria-disabled={!canInteract}
          onClick={onBrowse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onBrowse();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!canInteract) return;
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={onDrop}
        >
          <input
            key={inputKey}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInputChange}
            disabled={!canInteract}
          />

          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  className="h-20 w-16 object-cover rounded-md border border-slate-200 bg-white"
                />
              ) : (
                <div className="h-20 w-16 rounded-md border border-dashed border-slate-300 bg-slate-50" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-700">
                <span className="font-semibold">Drop your image here</span> or{' '}
                <span className="font-semibold text-primary-600">browse</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                PNG/JPG/WEBP/GIF up to {maxSizeMB}MB.
              </div>

              {lastFileMeta ? (
                <div className="mt-2 text-xs text-slate-600 truncate">
                  {lastFileMeta.name} · {formatBytes(lastFileMeta.size)}
                </div>
              ) : null}

              {error ? (
                <div className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                onBrowse();
              }}
              disabled={!canInteract}
            >
              Choose image
            </button>

            <button
              type="button"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              disabled={!canInteract || !value}
            >
              Clear
            </button>

            <button
              type="button"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                destroy();
              }}
              disabled={disabled}
            >
              Destroy file upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


