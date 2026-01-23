import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Star, ShoppingCart, Sparkles, Heart, Package } from 'lucide-react';
import { PublicStorefrontProduct } from '@/hooks/usePublicStorefront';
import { cn } from '@/lib/utils';

interface FeaturedProductsCarouselProps {
  products: PublicStorefrontProduct[];
  slug: string;
  onAddToCart: (product: PublicStorefrontProduct) => void;
}

export const FeaturedProductsCarousel: React.FC<FeaturedProductsCarouselProps> = ({
  products,
  slug,
  onAddToCart,
}) => {
  const featuredProducts = products.slice(0, 8);

  if (featuredProducts.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Badge className="mb-3 bg-gray-900 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Best Sellers</h2>
            <p className="text-gray-500 mt-1">Our most popular products</p>
          </div>
        </div>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {featuredProducts.map((product, index) => (
              <CarouselItem
                key={product.id}
                className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <Card className="group overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 h-full bg-white rounded-2xl">
                  <Link to={`/store/${slug}/product/${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      {product.product.image_url ? (
                        <img
                          src={product.product.image_url}
                          alt={product.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {index < 3 && (
                        <Badge className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 border-0 shadow-sm">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Top Seller
                        </Badge>
                      )}
                      {product.product.stock <= 0 && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Badge className="bg-gray-900 text-white text-sm">
                            Out of Stock
                          </Badge>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-8 w-8 rounded-full bg-white/95 hover:bg-white shadow-md text-gray-600 hover:text-red-500"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-5 space-y-3">
                    <Link to={`/store/${slug}/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors">
                        {product.product.name}
                      </h3>
                    </Link>
                    {product.product.category && (
                      <Badge className="text-xs bg-gray-100 text-gray-600 border-0 hover:bg-gray-200">
                        {product.product.category}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xl font-bold text-gray-900">
                        ${product.selling_price.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        className={cn(
                          "gap-1 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-md",
                          product.product.stock <= 0 && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          onAddToCart(product);
                        }}
                        disabled={product.product.stock <= 0}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-4 bg-white border-gray-200 hover:bg-gray-100 text-gray-600" />
          <CarouselNext className="hidden sm:flex -right-4 bg-white border-gray-200 hover:bg-gray-100 text-gray-600" />
        </Carousel>
      </div>
    </section>
  );
};
