import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProductMedia, ProductMedia } from '@/hooks/useProductMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  Video, 
  Upload, 
  X, 
  GripVertical, 
  Loader2, 
  Link as LinkIcon,
  Plus,
  Trash2,
  ImagePlus,
  Copy,
  Crop
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ImageCropper } from './ImageCropper';

interface ProductMediaManagerProps {
  productId: string;
}

interface SortableGalleryItemProps {
  item: ProductMedia;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onCopyToPrimary?: (url: string) => void;
  isCopying?: boolean;
  isPrimary?: boolean;
}

const SortableGalleryItem: React.FC<SortableGalleryItemProps> = ({ 
  item, 
  onDelete, 
  isDeleting,
  onCopyToPrimary,
  isCopying,
  isPrimary,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVideo = item.media_type === 'video';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group bg-card border rounded-lg overflow-hidden aspect-square cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-primary z-10",
        isPrimary ? "border-amber-500 border-2" : "border-border"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Delete Button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
      </Button>

      {/* Copy to Primary Button - only for images */}
      {!isVideo && onCopyToPrimary && !isPrimary && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1 left-1 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onCopyToPrimary(item.url);
          }}
          disabled={isCopying}
          title="Set as primary image"
        >
          {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
        </Button>
      )}

      {/* Primary Badge */}
      {isPrimary && (
        <Badge 
          className="absolute top-1 left-1 z-10 text-[10px] px-1.5 py-0 bg-amber-500 text-white"
        >
          ★ Primary
        </Badge>
      )}

      {/* Video Badge */}
      {isVideo && (
        <Badge 
          variant="secondary" 
          className="absolute bottom-1 left-1 z-10 text-[10px] px-1 py-0"
        >
          <Video className="w-2.5 h-2.5 mr-0.5" />
          Video
        </Badge>
      )}

      {/* Media Display */}
      {isVideo ? (
        <video
          src={item.url}
          className="w-full h-full object-cover pointer-events-none"
          muted
          preload="metadata"
        />
      ) : (
        <img
          src={item.url}
          alt={item.alt_text || 'Product image'}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}
    </div>
  );
};

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({ productId }) => {
  const { toast } = useToast();
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'image' | 'video'>('image');
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isProductImageOpen, setIsProductImageOpen] = useState(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState(true);
  const [isPrimaryDragOver, setIsPrimaryDragOver] = useState(false);
  const primaryDropRef = useRef<HTMLDivElement>(null);
  
  // Cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  // Fetch current product primary image
  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase
        .from('products')
        .select('image_url')
        .eq('id', productId)
        .single();
      if (data) {
        setPrimaryImageUrl(data.image_url);
      }
    };
    fetchProduct();
  }, [productId]);

  const {
    media,
    isLoading,
    addMedia,
    isAddingMedia,
    deleteMedia,
    isDeletingMedia,
    reorderMedia,
    uploadMedia,
  } = useProductMedia(productId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = media.findIndex((item) => item.id === active.id);
      const newIndex = media.findIndex((item) => item.id === over.id);
      
      const newOrder = arrayMove(media, oldIndex, newIndex);
      
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));
      
      reorderMedia(updates);
    }
  };

  // Upload the cropped primary image blob
  const uploadPrimaryImageBlob = async (blob: Blob) => {
    setIsUploadingPrimary(true);
    try {
      const file = new File([blob], `primary-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadMedia(productId, file, 'image');
      
      // Set as primary image on product
      const { error } = await supabase
        .from('products')
        .update({ image_url: url })
        .eq('id', productId);

      if (error) throw error;

      // Also add to media gallery
      await addMedia({
        product_id: productId,
        media_type: 'image',
        url,
      });

      setPrimaryImageUrl(url);
      setShowCropper(false);
      setCropImageSrc(null);
      setPendingCropFile(null);
      toast({
        title: 'Product Image Updated',
        description: 'Primary product image has been set.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPrimary(false);
      if (primaryFileInputRef.current) {
        primaryFileInputRef.current.value = '';
      }
    }
  };

  // Open cropper when file is selected - PNG/JPG only
  const openCropperForFile = (file: File) => {
    const isPng = file.type === 'image/png';
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    
    if (!isPng && !isJpg) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PNG and JPG images are allowed.',
        variant: 'destructive',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setPendingCropFile(file);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePrimaryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropperForFile(file);
  };

  // Drag and drop handlers for primary image
  const handlePrimaryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPrimaryDragOver(true);
  };

  const handlePrimaryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!primaryDropRef.current?.contains(e.relatedTarget as Node)) {
      setIsPrimaryDragOver(false);
    }
  };

  const handlePrimaryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPrimaryDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      openCropperForFile(file);
    }
  };

  // Copy gallery image to primary
  const handleCopyToPrimary = async (url: string) => {
    setIsSettingPrimary(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: url })
        .eq('id', productId);

      if (error) throw error;

      setPrimaryImageUrl(url);
      toast({
        title: 'Primary Image Updated',
        description: 'Gallery image set as primary.',
      });
    } catch (error) {
      console.error('Error copying to primary:', error);
      toast({
        title: 'Error',
        description: 'Failed to set as primary image.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const handleRemovePrimaryImage = async () => {
    setIsSettingPrimary(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: null })
        .eq('id', productId);

      if (error) throw error;

      setPrimaryImageUrl(null);
      toast({
        title: 'Image Removed',
        description: 'Primary product image has been removed.',
      });
    } catch (error) {
      console.error('Error removing primary image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove primary image.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingGallery(true);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      try {
        // Only allow PNG and JPG images
        const isPng = file.type === 'image/png';
        const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg';

        if (!isPng && !isJpg) {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not a PNG or JPG image.`,
            variant: 'destructive',
          });
          failCount++;
          continue;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB for images
        if (file.size > maxSize) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds 10MB limit.`,
            variant: 'destructive',
          });
          failCount++;
          continue;
        }

        const url = await uploadMedia(productId, file, 'image');
        await addMedia({
          product_id: productId,
          media_type: 'image',
          url,
        });
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
        failCount++;
      }
    }

    if (files.length > 1) {
      toast({
        title: failCount === 0 ? 'Upload Complete' : 'Upload Partially Complete',
        description: `Uploaded ${successCount} of ${files.length} files.`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
    }

    setIsUploadingGallery(false);
    setUploadProgress(null);
    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.value = '';
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    try {
      await addMedia({
        product_id: productId,
        media_type: urlType,
        url: urlInput.trim(),
      });
      setUrlInput('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Error adding URL:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Image Section */}
      <Collapsible open={isProductImageOpen} onOpenChange={setIsProductImageOpen}>
        <div className="border border-border rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <Label className="text-sm font-semibold cursor-pointer">Product image</Label>
              <div className="flex items-center gap-1">
                {isProductImageOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div 
              ref={primaryDropRef}
              onDragOver={handlePrimaryDragOver}
              onDragLeave={handlePrimaryDragLeave}
              onDrop={handlePrimaryDrop}
              className={cn(
                "p-4 space-y-3 relative transition-all duration-200",
                isPrimaryDragOver && "bg-primary/5"
              )}
            >
              {/* Drag Overlay for Primary */}
              {isPrimaryDragOver && (
                <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm rounded-lg z-20 flex flex-col items-center justify-center border-2 border-dashed border-primary m-2">
                  <Upload className="w-10 h-10 text-primary mb-2" />
                  <p className="text-primary font-medium text-sm">Drop to set as primary</p>
                </div>
              )}

              {primaryImageUrl ? (
                <div className="space-y-2">
                  <div 
                    className="relative aspect-square max-w-[280px] mx-auto border border-border rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => primaryFileInputRef.current?.click()}
                  >
                    <img
                      src={primaryImageUrl}
                      alt="Product primary image"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Click or drop to change</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Click the image or drag & drop to update
                  </p>
                  <button
                    onClick={handleRemovePrimaryImage}
                    disabled={isSettingPrimary}
                    className="text-sm text-destructive hover:underline flex items-center gap-1 mx-auto"
                  >
                    {isSettingPrimary ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Remove product image
                  </button>
                </div>
              ) : (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isPrimaryDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => primaryFileInputRef.current?.click()}
                >
                  {isUploadingPrimary ? (
                    <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-2" />
                  ) : (
                    <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isUploadingPrimary ? 'Uploading...' : 'Click or drag & drop to set product image'}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Hidden primary file input - PNG/JPG only */}
      <input
        ref={primaryFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handlePrimaryUpload}
        className="hidden"
      />

      {/* Product Gallery Section */}
      <Collapsible open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <div className="border border-border rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <Label className="text-sm font-semibold cursor-pointer">Product gallery</Label>
              <div className="flex items-center gap-1">
                {isGalleryOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-3">
              {/* Upload Progress */}
              {isUploadingGallery && uploadProgress && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Uploading...</span>
                        <span className="text-muted-foreground">
                          {uploadProgress.current} / {uploadProgress.total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gallery Grid */}
              {media.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={media.map(m => m.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {media.map((item) => (
                        <SortableGalleryItem
                          key={item.id}
                          item={item}
                          onDelete={deleteMedia}
                          isDeleting={isDeletingMedia}
                          onCopyToPrimary={item.media_type === 'image' ? handleCopyToPrimary : undefined}
                          isCopying={isSettingPrimary}
                          isPrimary={primaryImageUrl === item.url}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No gallery images or videos yet
                </p>
              )}

              {/* Add gallery images link */}
              <div className="pt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={isUploadingGallery}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {isUploadingGallery ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add product gallery images
                </button>
                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  Add from URL
                </button>
              </div>

              {/* URL Input */}
              {showUrlInput && (
                <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Enter image or video URL..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={urlType === 'image' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUrlType('image')}
                        className="h-7 text-xs"
                      >
                        <Image className="w-3 h-3 mr-1" />
                        Image
                      </Button>
                      <Button
                        type="button"
                        variant={urlType === 'video' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUrlType('video')}
                        className="h-7 text-xs"
                      >
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddUrl}
                      disabled={!urlInput.trim() || isAddingMedia}
                      className="h-7"
                    >
                      {isAddingMedia ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowUrlInput(false);
                        setUrlInput('');
                      }}
                      className="h-7"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Drag images to reorder. First image in gallery shows after the primary.
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Hidden gallery file input - PNG/JPG only */}
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        multiple
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {/* Image Cropper Dialog */}
      {cropImageSrc && (
        <ImageCropper
          open={showCropper}
          onClose={() => {
            setShowCropper(false);
            setCropImageSrc(null);
            setPendingCropFile(null);
            if (primaryFileInputRef.current) {
              primaryFileInputRef.current.value = '';
            }
          }}
          imageSrc={cropImageSrc}
          onCropComplete={uploadPrimaryImageBlob}
          aspectRatio={1}
          isLoading={isUploadingPrimary}
        />
      )}
    </div>
  );
};
