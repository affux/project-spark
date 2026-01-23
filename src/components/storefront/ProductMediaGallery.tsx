import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Play, Package, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ProductMedia {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  sort_order: number;
  alt_text: string | null;
}

interface ProductMediaGalleryProps {
  productId: string;
  fallbackImageUrl?: string | null;
  productName: string;
  className?: string;
}

export const ProductMediaGallery: React.FC<ProductMediaGalleryProps> = ({
  productId,
  fallbackImageUrl,
  productName,
  className,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['product-media', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProductMedia[];
    },
  });

  // If no media items, show fallback image or placeholder
  const hasMedia = mediaItems.length > 0;
  const displayItems: ProductMedia[] = hasMedia 
    ? mediaItems 
    : fallbackImageUrl 
      ? [{ id: 'fallback', media_type: 'image', url: fallbackImageUrl, sort_order: 0, alt_text: productName }]
      : [];

  if (displayItems.length === 0) {
    return (
      <div className={cn("aspect-square rounded-3xl overflow-hidden bg-card border border-border flex items-center justify-center", className)}>
        <div className="text-center">
          <Package className="w-24 h-24 text-muted-foreground/50 mx-auto" />
          <p className="text-muted-foreground mt-2">No image</p>
        </div>
      </div>
    );
  }

  const currentItem = displayItems[activeIndex];
  const isVideo = currentItem?.media_type === 'video';

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? displayItems.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === displayItems.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image/Video */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-card border border-border group">
        {isVideo ? (
          <video
            src={currentItem.url}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          />
        ) : (
          <>
            <img
              src={currentItem.url}
              alt={currentItem.alt_text || productName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Zoom Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={() => setIsLightboxOpen(true)}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Navigation Arrows */}
        {displayItems.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Pagination Dots */}
        {displayItems.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {displayItems.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === activeIndex 
                    ? "bg-primary w-6" 
                    : "bg-background/60 hover:bg-background/80"
                )}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayItems.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                "flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all",
                index === activeIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setActiveIndex(index)}
            >
              {item.media_type === 'video' ? (
                <div className="w-full h-full bg-muted flex items-center justify-center relative">
                  <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt_text || `${productName} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            {isVideo ? (
              <video
                src={currentItem.url}
                className="w-full h-auto max-h-[90vh] object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={currentItem.url}
                alt={currentItem.alt_text || productName}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            )}

            {/* Navigation in Lightbox */}
            {displayItems.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
              {activeIndex + 1} / {displayItems.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};