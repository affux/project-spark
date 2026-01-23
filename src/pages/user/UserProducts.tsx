import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductCardNew } from '@/components/dashboard/ProductCardNew';
import { useProducts, Product } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Store, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const UserProducts: React.FC = () => {
  const { user } = useAuth();
  const { 
    products, 
    storefrontProductIds, 
    categories, 
    isLoading, 
    addToStorefront,
    isAdding 
  } = useProducts();
  const { settingsMap, isLoading: isLoadingSettings } = usePlatformSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const { toast } = useToast();

  const markupPercentage = settingsMap.default_markup_percentage;
  const minMarkup = settingsMap.selling_percentage_min;
  const maxMarkup = settingsMap.selling_percentage_max;

  const filteredProducts = products.filter(product =>
    product.is_active &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())) &&
    (!selectedCategory || product.category === selectedCategory)
  );

  const { isApproved } = useAuth();

  const handleAddToStorefront = (product: Product) => {
    if (!isApproved) {
      toast({
        title: 'Account Pending Approval',
        description: 'Your account must be approved before you can add products to your storefront.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedProduct(product);
    // Set initial price at minimum markup
    setSellingPrice((product.base_price * (1 + minMarkup / 100)).toFixed(2));
    setCustomDescription('');
    setIsAddDialogOpen(true);
  };

  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const price = parseFloat(sellingPrice);
    const minPrice = selectedProduct.base_price * (1 + minMarkup / 100);
    const maxPrice = selectedProduct.base_price * (1 + maxMarkup / 100);

    if (price < minPrice) {
      toast({
        title: 'Invalid Price',
        description: `Minimum markup is ${minMarkup}%. Price must be at least $${minPrice.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    if (price > maxPrice) {
      toast({
        title: 'Invalid Price',
        description: `Maximum markup is ${maxMarkup}%. Price cannot exceed $${maxPrice.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await addToStorefront({
        productId: selectedProduct.id,
        sellingPrice: price,
        customDescription: customDescription || undefined,
      });
      setIsAddDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isLoading || isLoadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Browse Products</h1>
            <p className="text-muted-foreground mt-1">
              Add products from the main catalog to your storefront with custom pricing.
            </p>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/dashboard/storefront">
              <Store className="w-4 h-4" />
              View My Storefront
            </Link>
          </Button>
        </div>

        {/* Info Banner */}
        <div className="dashboard-card bg-muted/50 border-muted">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> Browse products below and add them to your storefront. 
            Set your own selling price (must be higher than the base price shown). Your profit = Selling Price - Base Price.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={selectedCategory === null ? 'default' : 'outline'} 
              size="sm" 
              className="gap-2"
              onClick={() => setSelectedCategory(null)}
            >
              <Filter className="w-4 h-4" />
              All
            </Button>
            {categories.map(category => (
              <Button 
                key={category} 
                variant={selectedCategory === category ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setSelectedCategory(category as string)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => {
            const isInStorefront = storefrontProductIds.has(product.id);
            return (
              <ProductCardNew
                key={product.id}
                product={product}
                mode="user"
                isInStorefront={isInStorefront}
                onAddToStorefront={isInStorefront ? undefined : handleAddToStorefront}
                delay={index * 50}
              />
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {products.length === 0 
                ? 'No products available in the catalog yet.'
                : 'No products found matching your search.'}
            </p>
          </div>
        )}

        {/* Add to Storefront Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleConfirmAdd}>
              <DialogHeader>
                <DialogTitle>Add to Storefront</DialogTitle>
                <DialogDescription>
                  Set your selling price for this product. Your profit is the difference between your price and the base price.
                </DialogDescription>
              </DialogHeader>
              {selectedProduct && (
                <div className="py-4 space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-muted/50">
                    {selectedProduct.image_url ? (
                      <img 
                        src={selectedProduct.image_url} 
                        alt={selectedProduct.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No image</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{selectedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {selectedProduct.description || 'No description'}
                      </p>
                      <p className="text-sm font-medium text-accent mt-1">
                        Base Price: ${selectedProduct.base_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="selling-price">Your Selling Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
                      <Input
                        id="selling-price"
                        type="number"
                        step="0.01"
                        min={(selectedProduct.base_price * (1 + minMarkup / 100)).toFixed(2)}
                        max={(selectedProduct.base_price * (1 + maxMarkup / 100)).toFixed(2)}
                        value={sellingPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSellingPrice(value);
                        }}
                        className="text-lg font-semibold pl-8"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: maxMarkup - minMarkup + 1 }, (_, i) => minMarkup + i).map(percent => (
                        <Button
                          key={percent}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSellingPrice((selectedProduct.base_price * (1 + percent / 100)).toFixed(2))}
                          className={parseFloat(sellingPrice) === parseFloat((selectedProduct.base_price * (1 + percent / 100)).toFixed(2)) ? 'border-primary bg-primary/10' : ''}
                        >
                          +{percent}%
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set your markup between {minMarkup}% to {maxMarkup}% of base price (${(selectedProduct.base_price * (1 + minMarkup / 100)).toFixed(2)} - ${(selectedProduct.base_price * (1 + maxMarkup / 100)).toFixed(2)})
                    </p>
                    {parseFloat(sellingPrice) > selectedProduct.base_price && (
                      <p className="text-sm text-green-600">
                        Your profit: ${(parseFloat(sellingPrice) - selectedProduct.base_price).toFixed(2)} per sale
                        ({((parseFloat(sellingPrice) / selectedProduct.base_price - 1) * 100).toFixed(0)}% markup)
                      </p>
                    )}
                    {parseFloat(sellingPrice) < selectedProduct.base_price * (1 + minMarkup / 100) && (
                      <p className="text-sm text-destructive">
                        Minimum markup is {minMarkup}% (${(selectedProduct.base_price * (1 + minMarkup / 100)).toFixed(2)})
                      </p>
                    )}
                    {parseFloat(sellingPrice) > selectedProduct.base_price * (1 + maxMarkup / 100) && (
                      <p className="text-sm text-destructive">
                        Maximum markup is {maxMarkup}% (${(selectedProduct.base_price * (1 + maxMarkup / 100)).toFixed(2)})
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="custom-description">Custom Description (Optional)</Label>
                    <Textarea
                      id="custom-description"
                      placeholder="Add your own description or leave empty to use the original..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add to Storefront'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserProducts;
