import React, { useState, useEffect } from 'react';
import { Image, Video, Trash2, Copy, Check, Loader2, FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminMediaUploader } from './AdminMediaUploader';
import { useAdminMediaUpload, UploadedMedia } from '@/hooks/useAdminMediaUpload';
import { cn } from '@/lib/utils';

interface AdminMediaLibraryProps {
  onSelect?: (url: string) => void;
  selectionMode?: boolean;
  folder?: string;
}

const FOLDERS = [
  { id: 'products', label: 'Products', icon: Image },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'announcements', label: 'Announcements', icon: Image },
  { id: 'general', label: 'General', icon: FolderOpen },
];

export const AdminMediaLibrary: React.FC<AdminMediaLibraryProps> = ({
  onSelect,
  selectionMode = false,
  folder: initialFolder,
}) => {
  const [activeFolder, setActiveFolder] = useState(initialFolder || 'products');
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<UploadedMedia | null>(null);
  const { listMedia, deleteMedia } = useAdminMediaUpload();

  const loadMedia = async () => {
    setIsLoading(true);
    const result = await listMedia(activeFolder);
    setMedia(result);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMedia();
  }, [activeFolder]);

  const handleUpload = (uploaded: UploadedMedia) => {
    setMedia(prev => [uploaded, ...prev]);
    if (selectionMode && onSelect) {
      onSelect(uploaded.url);
    }
  };

  const handleDelete = async (item: UploadedMedia) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    const fullPath = `${activeFolder}/${item.name}`;
    const success = await deleteMedia(fullPath);
    if (success) {
      setMedia(prev => prev.filter(m => m.id !== item.id));
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Media Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeFolder} onValueChange={setActiveFolder}>
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            {FOLDERS.map(folder => (
              <TabsTrigger key={folder.id} value={folder.id} className="text-sm gap-1.5">
                <folder.icon className="w-3.5 h-3.5" />
                {folder.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FOLDERS.map(folder => (
            <TabsContent key={folder.id} value={folder.id} className="space-y-4 mt-4">
              {/* Upload Section */}
              <AdminMediaUploader
                folder={folder.id}
                onUpload={handleUpload}
                accept="all"
              />

              {/* Media Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : media.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No media in this folder yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {media.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative border rounded-lg overflow-hidden bg-muted transition-all",
                        selectionMode && "cursor-pointer hover:ring-2 hover:ring-primary"
                      )}
                      onClick={() => selectionMode && onSelect?.(item.url)}
                    >
                      <div className="aspect-square">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Video className="w-10 h-10 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onClick={(e) => {
                              if (!selectionMode) {
                                e.stopPropagation();
                                setPreviewMedia(item);
                              }
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {selectionMode ? (
                          <Button size="sm" variant="secondary">
                            Select
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyUrl(item.url);
                              }}
                            >
                              {copiedUrl === item.url ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 bg-background/80">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewMedia?.name}</DialogTitle>
          </DialogHeader>
          {previewMedia && (
            <div className="mt-4">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="w-full rounded-lg"
                />
              )}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(previewMedia.size)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyUrl(previewMedia.url)}
                  >
                    {copiedUrl === previewMedia.url ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDelete(previewMedia);
                      setPreviewMedia(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
