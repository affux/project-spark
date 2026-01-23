import React from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  mode: 'admin' | 'user' | 'storefront';
  customPrice?: number;
  onAddToStorefront?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  className?: string;
  delay?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  mode,
  customPrice,
  onAddToStorefront,
  onEdit,
  onView,
  onAddToCart,
  className,
  delay = 0,
}) => {
  const displayPrice = customPrice ?? product.basePrice;

  return (
    <div 
      className={cn(
        "group bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {mode === 'admin' && (
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant={product.isActive ? 'active' : 'inactive'}>
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {product.category}
          </Badge>
        </div>

        {mode !== 'storefront' && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
            {mode === 'admin' && (
              <>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="flex-1 bg-card/90 backdrop-blur-sm"
                  onClick={() => onView?.(product)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onEdit?.(product)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
            {mode === 'user' && (
              <Button 
                size="sm" 
                variant="accent"
                className="w-full"
                onClick={() => onAddToStorefront?.(product)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add to Storefront
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${displayPrice.toFixed(2)}
            </p>
            {mode === 'admin' && (
              <p className="text-xs text-muted-foreground">
                Stock: {product.stock} • SKU: {product.sku}
              </p>
            )}
            {mode === 'user' && (
              <p className="text-xs text-muted-foreground">
                Base price (your cost)
              </p>
            )}
          </div>

          {mode === 'storefront' && (
            <Button 
              variant="accent" 
              size="sm"
              onClick={() => onAddToCart?.(product)}
            >
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
