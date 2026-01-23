import React, { useRef, useState } from 'react';
import { Upload, X, Image, Video, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAdminMediaUpload, UploadedMedia } from '@/hooks/useAdminMediaUpload';
import { cn } from '@/lib/utils';

interface AdminMediaUploaderProps {
  folder?: string;
  onUpload?: (media: UploadedMedia) => void;
  onMultipleUpload?: (media: UploadedMedia[]) => void;
  multiple?: boolean;
  accept?: 'images' | 'videos' | 'all';
  maxFiles?: number;
  className?: string;
  compact?: boolean;
  showPreview?: boolean;
  currentMedia?: string | null;
  onRemove?: () => void;
}

export const AdminMediaUploader: React.FC<AdminMediaUploaderProps> = ({
  folder = 'general',
  onUpload,
  onMultipleUpload,
  multiple = false,
  accept = 'all',
  maxFiles = 5,
  className,
  compact = false,
  showPreview = true,
  currentMedia,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { uploadMedia, uploadMultiple, isUploading, uploadProgress } = useAdminMediaUpload();

  const getAcceptTypes = () => {
    switch (accept) {
      case 'images':
        return 'image/jpeg,image/png,image/gif,image/webp';
      case 'videos':
        return 'video/mp4,video/webm';
      default:
        return 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const validFiles = files.slice(0, multiple ? maxFiles : 1);

    if (multiple && onMultipleUpload) {
      const results = await uploadMultiple(validFiles, folder);
      onMultipleUpload(results);
    } else if (onUpload) {
      const result = await uploadMedia(validFiles[0], folder);
      if (result) {
        onUpload(result);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {currentMedia && showPreview && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted">
            <img
              src={currentMedia}
              alt="Current media"
              className="w-full h-full object-cover"
            />
            {onRemove && (
              <button
                onClick={onRemove}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {currentMedia ? 'Change' : 'Upload'}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes()}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors text-center",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto h-2" />
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-3">
              {accept !== 'videos' && <Image className="w-8 h-8 text-muted-foreground" />}
              {accept !== 'images' && <Video className="w-8 h-8 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium mb-1">
              Drag and drop {multiple ? 'files' : 'a file'} here
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              or click to browse
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose {multiple ? 'Files' : 'File'}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              {accept === 'images' && 'JPEG, PNG, GIF, WebP'}
              {accept === 'videos' && 'MP4, WebM'}
              {accept === 'all' && 'Images & Videos'}
              {' • Max 10MB'}
            </p>
          </>
        )}
      </div>

      {/* Current Media Preview */}
      {currentMedia && showPreview && (
        <div className="mt-4 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            {currentMedia.match(/\.(mp4|webm)$/i) ? (
              <video
                src={currentMedia}
                className="max-w-full h-auto max-h-48"
                controls
              />
            ) : (
              <img
                src={currentMedia}
                alt="Current media"
                className="max-w-full h-auto max-h-48"
              />
            )}
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="absolute top-2 right-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
