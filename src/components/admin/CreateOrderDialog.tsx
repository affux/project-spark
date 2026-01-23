import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DropshipperUser {
  user_id: string;
  name: string;
  email: string;
  storefront_name: string | null;
}

interface StorefrontProduct {
  id: string;
  selling_price: number;
  product: {
    id: string;
    name: string;
    base_price: number;
    image_url: string | null;
  };
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (data: {
    dropshipper_user_id: string;
    storefront_product_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address: string;
    quantity: number;
    selling_price: number;
    base_price: number;
    productName?: string;
  }) => void;
  isCreating: boolean;
}

export const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  open,
  onOpenChange,
  onCreateOrder,
  isCreating,
}) => {
  const { toast } = useToast();
  const [dropshippers, setDropshippers] = useState<DropshipperUser[]>([]);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [isLoadingDropshippers, setIsLoadingDropshippers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [selectedDropshipper, setSelectedDropshipper] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    quantity: 1,
  });

  // Fetch dropshippers on mount
  useEffect(() => {
    const fetchDropshippers = async () => {
      setIsLoadingDropshippers(true);
      try {
        // Get user roles with 'user' role
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'user');

        if (!userRoles || userRoles.length === 0) {
          setDropshippers([]);
          return;
        }

        const userIds = userRoles.map(r => r.user_id);

        // Get profiles for those users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email, storefront_name')
          .in('user_id', userIds)
          .eq('user_status', 'approved');

        setDropshippers(profiles || []);
      } catch (error) {
        console.error('Error fetching dropshippers:', error);
      } finally {
        setIsLoadingDropshippers(false);
      }
    };

    if (open) {
      fetchDropshippers();
    }
  }, [open]);

  // Fetch storefront products when dropshipper is selected
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedDropshipper) {
        setProducts([]);
        return;
      }

      setIsLoadingProducts(true);
      try {
        const { data } = await supabase
          .from('storefront_products')
          .select(`
            id,
            selling_price,
            products!inner(
              id,
              name,
              base_price,
              image_url
            )
          `)
          .eq('user_id', selectedDropshipper)
          .eq('is_active', true);

        const mapped = (data || []).map((sp: any) => ({
          id: sp.id,
          selling_price: Number(sp.selling_price),
          product: {
            id: sp.products.id,
            name: sp.products.name,
            base_price: Number(sp.products.base_price),
            image_url: sp.products.image_url,
          },
        }));

        setProducts(mapped);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedDropshipper]);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const handleSubmit = () => {
    if (!selectedDropshipper || !selectedProduct || !selectedProductData) {
      toast({
        title: 'Missing Information',
        description: 'Please select a dropshipper and product.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_address) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required customer fields.',
        variant: 'destructive',
      });
      return;
    }

    onCreateOrder({
      dropshipper_user_id: selectedDropshipper,
      storefront_product_id: selectedProduct,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone,
      customer_address: formData.customer_address,
      quantity: formData.quantity,
      selling_price: selectedProductData.selling_price,
      base_price: selectedProductData.product.base_price,
      productName: selectedProductData.product.name,
    });

    // Reset form
    setSelectedDropshipper('');
    setSelectedProduct('');
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      quantity: 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create an order on behalf of a dropshipper user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Dropshipper */}
          <div className="space-y-2">
            <Label>Select Dropshipper *</Label>
            <Select
              value={selectedDropshipper}
              onValueChange={(v) => {
                setSelectedDropshipper(v);
                setSelectedProduct('');
              }}
              disabled={isLoadingDropshippers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDropshippers ? 'Loading...' : 'Select a dropshipper'} />
              </SelectTrigger>
              <SelectContent>
                {dropshippers.map((dropshipper) => (
                  <SelectItem key={dropshipper.user_id} value={dropshipper.user_id}>
                    {dropshipper.name} ({dropshipper.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Product */}
          {selectedDropshipper && (
            <div className="space-y-2">
              <Label>Select Product *</Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
                disabled={isLoadingProducts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingProducts ? 'Loading...' : 'Select a product'} />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 && !isLoadingProducts ? (
                    <div className="p-2 text-sm text-muted-foreground">No products in storefront</div>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center gap-2">
                          {product.product.image_url ? (
                            <img
                              src={product.product.image_url}
                              alt={product.product.name}
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          )}
                          {product.product.name} - ${product.selling_price.toFixed(2)}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Product Summary */}
          {selectedProductData && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-3">
                {selectedProductData.product.image_url ? (
                  <img
                    src={selectedProductData.product.image_url}
                    alt={selectedProductData.product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedProductData.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Selling: ${selectedProductData.selling_price.toFixed(2)} | Base: ${selectedProductData.product.base_price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Customer Information</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="Enter customer email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="Enter customer phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_address">Customer Address *</Label>
                <Textarea
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  placeholder="Enter full shipping address"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Order Total */}
          {selectedProductData && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-medium">Order Total</span>
                <span className="text-lg font-bold">
                  ${(selectedProductData.selling_price * formData.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
