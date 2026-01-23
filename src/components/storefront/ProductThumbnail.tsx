import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Images, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductMedia {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  sort_order: number;
}

interface ProductThumbnailProps {
  productId: string;
  fallbackImageUrl?: string | null;
  productName: string;
  className?: string;
}

export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  productId,
  fallbackImageUrl,
  productName,
  className,
}) => {
  const { data: mediaItems = [] } = useQuery({
    queryKey: ['product-media', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_media')
        .select('id, media_type, url, sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true })
        .limit(5);

      if (error) return [];
      return data as ProductMedia[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine what to show
  const firstMedia = mediaItems[0];
  const imageUrl = firstMedia?.url || fallbackImageUrl;
  const hasMultipleMedia = mediaItems.length > 1 || (mediaItems.length === 1 && fallbackImageUrl);
  const mediaCount = mediaItems.length || (fallbackImageUrl ? 1 : 0);
  const isVideo = firstMedia?.media_type === 'video';

  if (!imageUrl) {
    return (
      <div className={cn("w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center", className)}>
        <span className="text-muted-foreground">No image</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {isVideo ? (
        <>
          <video
            src={imageUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="w-6 h-6 text-foreground" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      )}

      {/* Media count badge */}
      {mediaCount > 1 && (
        <Badge 
          variant="secondary" 
          className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm gap-1"
        >
          <Images className="w-3 h-3" />
          {mediaCount}
        </Badge>
      )}
    </div>
  );
};