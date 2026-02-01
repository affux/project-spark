import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Loader2,
  Package,
  Search,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { useAdminProducts, Product } from '@/hooks/useAdminProducts';
import { useToast } from '@/hooks/use-toast';

interface CreateCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCatalogDialog: React.FC<CreateCatalogDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { products, addProduct, isAddingProduct } = useAdminProducts();
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [catalogName, setCatalogName] = useState('');
  const [catalogDescription, setCatalogDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activeProducts = products.filter(p => p.is_active);
  
  const filteredProducts = activeProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleCreateCatalog = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product for the catalog.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Get selected product details
      const catalogProducts = products.filter(p => selectedProducts.has(p.id));
      
      // Create a catalog summary/export
      const catalogData = {
        name: catalogName || `Catalog ${new Date().toLocaleDateString()}`,
        description: catalogDescription,
        products: catalogProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          base_price: p.base_price,
          stock: p.stock,
          image_url: p.image_url,
        })),
        created_at: new Date().toISOString(),
        total_products: catalogProducts.length,
        total_value: catalogProducts.reduce((sum, p) => sum + p.base_price, 0),
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${catalogData.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Catalog Created',
        description: `Successfully created catalog with ${catalogProducts.length} products.`,
      });

      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating catalog:', error);
      toast({
        title: 'Error',
        description: 'Failed to create catalog. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSearchQuery('');
    setSelectedProducts(new Set());
    setCatalogName('');
    setCatalogDescription('');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Create Product Catalog
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Select products to include in your catalog'
              : 'Add catalog details and export'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <>
            {/* Search and Select All */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="whitespace-nowrap"
              >
                {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0
                  ? 'Deselect All'
                  : 'Select All'
                }
              </Button>
            </div>

            {/* Selected Count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredProducts.length} products available
              </span>
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" />
                {selectedProducts.size} selected
              </Badge>
            </div>

            {/* Products List */}
            <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleToggleProduct(product.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProducts.has(product.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleToggleProduct(product.id)}
                      />
                      <div className="w-10 h-10 rounded bg-muted/50 overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category || 'Uncategorized'} • ${product.base_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={selectedProducts.size === 0}
              >
                Continue ({selectedProducts.size})
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Catalog Details Form */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="catalog-name">Catalog Name</Label>
                <Input
                  id="catalog-name"
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  placeholder={`Catalog ${new Date().toLocaleDateString()}`}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="catalog-desc">Description (Optional)</Label>
                <Textarea
                  id="catalog-desc"
                  value={catalogDescription}
                  onChange={(e) => setCatalogDescription(e.target.value)}
                  placeholder="Add a description for this catalog..."
                  rows={3}
                />
              </div>

              {/* Selected Products Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Products</span>
                  <Badge>{selectedProducts.size} items</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedProducts).slice(0, 5).map((id) => {
                    const product = products.find(p => p.id === id);
                    return product ? (
                      <Badge key={id} variant="outline" className="gap-1">
                        {product.name.length > 20 
                          ? product.name.substring(0, 20) + '...' 
                          : product.name
                        }
                        <button
                          onClick={() => handleToggleProduct(id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {selectedProducts.size > 5 && (
                    <Badge variant="secondary">+{selectedProducts.size - 5} more</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Total catalog value: $
                  {products
                    .filter(p => selectedProducts.has(p.id))
                    .reduce((sum, p) => sum + p.base_price, 0)
                    .toFixed(2)
                  }
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleCreateCatalog} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Create Catalog
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
