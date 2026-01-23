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
import { Loader2, Package, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface OrderEntry {
  id: string;
  storefront_product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  quantity: number;
}

interface BulkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrders: (data: {
    dropshipper_user_id: string;
    orders: Array<{
      storefront_product_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_address: string;
      quantity: number;
      selling_price: number;
      base_price: number;
      productName?: string;
    }>;
  }) => void;
  isCreating: boolean;
}

const createEmptyOrder = (): OrderEntry => ({
  id: crypto.randomUUID(),
  storefront_product_id: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_address: '',
  quantity: 1,
});

export const BulkOrderDialog: React.FC<BulkOrderDialogProps> = ({
  open,
  onOpenChange,
  onCreateOrders,
  isCreating,
}) => {
  const { toast } = useToast();
  const [dropshippers, setDropshippers] = useState<DropshipperUser[]>([]);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [isLoadingDropshippers, setIsLoadingDropshippers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [selectedDropshipper, setSelectedDropshipper] = useState('');
  const [orders, setOrders] = useState<OrderEntry[]>([createEmptyOrder()]);

  // Fetch dropshippers on mount
  useEffect(() => {
    const fetchDropshippers = async () => {
      setIsLoadingDropshippers(true);
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'user');

        if (!userRoles || userRoles.length === 0) {
          setDropshippers([]);
          return;
        }

        const userIds = userRoles.map(r => r.user_id);

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
      setSelectedDropshipper('');
      setOrders([createEmptyOrder()]);
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

  const addOrder = () => {
    setOrders([...orders, createEmptyOrder()]);
  };

  const removeOrder = (id: string) => {
    if (orders.length > 1) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const updateOrder = (id: string, field: keyof OrderEntry, value: string | number) => {
    setOrders(orders.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const getProductData = (storefrontProductId: string) => {
    return products.find(p => p.id === storefrontProductId);
  };

  const handleSubmit = () => {
    if (!selectedDropshipper) {
      toast({
        title: 'Missing Information',
        description: 'Please select a dropshipper.',
        variant: 'destructive',
      });
      return;
    }

    // Validate all orders
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.storefront_product_id || !order.customer_name || !order.customer_email || !order.customer_address) {
        toast({
          title: 'Missing Information',
          description: `Please fill in all required fields for order #${i + 1}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const orderData = orders.map(order => {
      const productData = getProductData(order.storefront_product_id);
      return {
        storefront_product_id: order.storefront_product_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        quantity: order.quantity,
        selling_price: productData?.selling_price || 0,
        base_price: productData?.product.base_price || 0,
        productName: productData?.product.name,
      };
    });

    onCreateOrders({
      dropshipper_user_id: selectedDropshipper,
      orders: orderData,
    });
  };

  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => {
    const productData = getProductData(order.storefront_product_id);
    return sum + (productData ? productData.selling_price * order.quantity : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Order Creation</DialogTitle>
          <DialogDescription>
            Create multiple orders at once for a dropshipper.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select Dropshipper */}
          <div className="space-y-2">
            <Label>Select Dropshipper *</Label>
            <Select
              value={selectedDropshipper}
              onValueChange={(v) => {
                setSelectedDropshipper(v);
                setOrders([createEmptyOrder()]);
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

          {/* Orders List */}
          {selectedDropshipper && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <div key={order.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Order #{index + 1}</h4>
                      {orders.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOrder(order.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Product Selection */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Product *</Label>
                        <Select
                          value={order.storefront_product_id}
                          onValueChange={(v) => updateOrder(order.id, 'storefront_product_id', v)}
                          disabled={isLoadingProducts}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex items-center gap-2">
                                  {product.product.image_url ? (
                                    <img
                                      src={product.product.image_url}
                                      alt={product.product.name}
                                      className="w-5 h-5 rounded object-cover"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  {product.product.name} - ${product.selling_price.toFixed(2)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Customer Name *</Label>
                        <Input
                          className="h-9"
                          value={order.customer_name}
                          onChange={(e) => updateOrder(order.id, 'customer_name', e.target.value)}
                          placeholder="Name"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Customer Email *</Label>
                        <Input
                          className="h-9"
                          type="email"
                          value={order.customer_email}
                          onChange={(e) => updateOrder(order.id, 'customer_email', e.target.value)}
                          placeholder="Email"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          className="h-9"
                          value={order.customer_phone}
                          onChange={(e) => updateOrder(order.id, 'customer_phone', e.target.value)}
                          placeholder="Phone"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          className="h-9"
                          type="number"
                          min={1}
                          value={order.quantity}
                          onChange={(e) => updateOrder(order.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Address *</Label>
                        <Textarea
                          className="min-h-[60px]"
                          value={order.customer_address}
                          onChange={(e) => updateOrder(order.id, 'customer_address', e.target.value)}
                          placeholder="Full shipping address"
                        />
                      </div>
                    </div>

                    {order.storefront_product_id && (
                      <div className="text-right text-sm">
                        <span className="text-muted-foreground">Subtotal: </span>
                        <span className="font-medium">
                          ${((getProductData(order.storefront_product_id)?.selling_price || 0) * order.quantity).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addOrder}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Order
                </Button>
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {selectedDropshipper && orders.length > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">Total Orders: </span>
                  <span className="text-lg font-bold">{totalOrders}</span>
                </div>
                <div>
                  <span className="font-medium">Total Amount: </span>
                  <span className="text-lg font-bold">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating || !selectedDropshipper}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating {totalOrders} Orders...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Create {totalOrders} Orders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
