import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProofImageGalleryProps {
  images: string[];
}

export const ProofImageGallery: React.FC<ProofImageGalleryProps> = ({ images }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(true);

  // Generate signed URLs for private bucket images
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!images || images.length === 0) {
        setLoadingUrls(false);
        return;
      }

      setLoadingUrls(true);
      const urls: Record<number, string> = {};

      for (let i = 0; i < images.length; i++) {
        const imagePath = images[i];
        
        // Check if it's already a full URL (public bucket or external)
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          urls[i] = imagePath;
        } else {
          // It's a storage path, generate signed URL for private bucket
          try {
            const { data, error } = await supabase.storage
              .from('proof-images')
              .createSignedUrl(imagePath, 3600); // 1 hour expiry

            if (error) {
              console.error('Error generating signed URL:', error);
              // Try without the bucket prefix if path includes it
              const cleanPath = imagePath.replace(/^proof-images\//, '');
              const { data: retryData, error: retryError } = await supabase.storage
                .from('proof-images')
                .createSignedUrl(cleanPath, 3600);
              
              if (retryError) {
                console.error('Retry error:', retryError);
                urls[i] = imagePath; // Fallback to original
              } else if (retryData?.signedUrl) {
                urls[i] = retryData.signedUrl;
              }
            } else if (data?.signedUrl) {
              urls[i] = data.signedUrl;
            }
          } catch (err) {
            console.error('Failed to generate signed URL:', err);
            urls[i] = imagePath;
          }
        }
      }

      setSignedUrls(urls);
      setLoadingUrls(false);
    };

    generateSignedUrls();
  }, [images]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set([...prev, index]));
  };

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : (prev ?? 0) - 1));
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : (prev ?? 0) + 1));
  };

  if (loadingUrls) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((_, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg border border-border bg-muted flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((_, index) => {
          const imageUrl = signedUrls[index];
          
          return (
            <div
              key={index}
              className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg border border-border bg-muted"
              onClick={() => setSelectedIndex(index)}
            >
              {!loadedImages.has(index) && (
                <div className="absolute inset-0 animate-pulse bg-muted-foreground/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`Proof ${index + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    "group-hover:scale-105",
                    loadedImages.has(index) ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={() => handleImageLoad(index)}
                  onError={(e) => {
                    console.error('Image load error for index', index);
                    // Mark as loaded to hide spinner
                    handleImageLoad(index);
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center min-h-[50vh]">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && signedUrls[selectedIndex] && (
              <img
                src={signedUrls[selectedIndex]}
                alt={`Proof ${selectedIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}

            {/* Counter */}
            {images.length > 1 && selectedIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                {selectedIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
