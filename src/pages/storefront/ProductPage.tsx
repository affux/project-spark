import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Loader2, 
  Package, 
  Minus, 
  Plus,
  Store,
  AlertTriangle,
  Shield,
  Truck,
  RefreshCw,
  Heart
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkout, CheckoutData } from '@/components/checkout/Checkout';
import { ProductMediaGallery } from '@/components/storefront/ProductMediaGallery';
import { ProductReviews } from '@/components/storefront/ProductReviews';
import { cn } from '@/lib/utils';

interface ProductDetails {
  id: string;
  product_id: string;
  selling_price: number;
  custom_description: string | null;
  is_active: boolean;
  user_id: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    stock: number;
  };
  store: {
    storefront_name: string | null;
    storefront_slug: string | null;
  };
}

const ProductPage = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings: publicSettings } = usePublicSettings();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['public-product', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('storefront_products')
        .select(`
          id,
          product_id,
          selling_price,
          custom_description,
          is_active,
          user_id,
          products!inner(
            id,
            name,
            description,
            image_url,
            category,
            stock
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      if (!data) return null;

      const { data: storeData } = await supabase
        .from('profiles')
        .select('storefront_name, storefront_slug')
        .eq('user_id', data.user_id)
        .single();

      const productsData = data.products as unknown as ProductDetails['product'];

      return {
        id: data.id,
        product_id: data.product_id,
        selling_price: Number(data.selling_price),
        custom_description: data.custom_description,
        is_active: data.is_active,
        user_id: data.user_id,
        product: productsData,
        store: storeData || { storefront_name: null, storefront_slug: null },
      } as ProductDetails;
    },
    enabled: !!productId,
  });

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.product.stock || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    if (!publicSettings.storefront_ordering_enabled) {
      toast({
        title: 'Ordering Disabled',
        description: publicSettings.storefront_ordering_disabled_message,
        variant: 'destructive',
      });
      return;
    }

    if (product.product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = async (data: CheckoutData) => {
    if (!product) return;

    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('create-public-order', {
        body: {
          storefront_product_id: product.id,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone || undefined,
          customer_address: data.customerAddress,
          quantity: quantity,
        },
      });

      if (error) throw error;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to place order');
      }

      toast({
        title: 'Order Placed Successfully!',
        description: `Your order #${response.order_number} has been placed. Check your email for details.`,
      });

      setIsCheckoutOpen(false);
      navigate(`/store/${slug}`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
            <p className="text-gray-500">
              The product you're looking for doesn't exist or is no longer available.
            </p>
          </div>
          <Button onClick={() => navigate(`/store/${slug}`)} className="gap-2 bg-gray-900 hover:bg-gray-800 text-white">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Button>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.product.stock <= 0;
  const totalPrice = product.selling_price * quantity;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => navigate(`/store/${slug}`)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </Button>
            {product.store.storefront_name && (
              <Link 
                to={`/store/${product.store.storefront_slug}`}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Store className="w-4 h-4" />
                <span className="font-medium">{product.store.storefront_name}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Product Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Ordering Disabled Banner */}
        {!publicSettings.storefront_ordering_enabled && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {publicSettings.storefront_ordering_disabled_message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Product Image/Media Gallery */}
          <div className="space-y-4">
            <ProductMediaGallery
              productId={product.product.id}
              fallbackImageUrl={product.product.image_url}
              productName={product.product.name}
            />
            <div className="flex items-center gap-2">
              {product.product.category && (
                <Badge className="text-sm px-4 py-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200">
                  {product.product.category}
                </Badge>
              )}
              {isOutOfStock && (
                <Badge className="text-sm px-4 py-1 bg-red-100 text-red-700 border-0">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                {product.product.name}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                {product.custom_description || product.product.description || 'Premium quality product'}
              </p>
            </div>

            {/* Price */}
            <div className="py-6 border-y border-gray-100">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${product.selling_price.toFixed(2)}
                </span>
              </div>
              {!isOutOfStock && (
                <p className="text-sm text-gray-500 mt-2">
                  {product.product.stock} items available
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-12 w-12 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-16 text-center font-semibold text-lg text-gray-900">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-12 w-12 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-gray-500">
                    Total: <span className="font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className={cn(
                  "flex-1 h-14 text-lg font-semibold rounded-xl gap-3 bg-gray-900 hover:bg-gray-800 text-white",
                  "shadow-lg hover:shadow-xl transition-all duration-300",
                  (isOutOfStock || !publicSettings.storefront_ordering_enabled) && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleBuyNow}
                disabled={isOutOfStock || !publicSettings.storefront_ordering_enabled}
              >
                <ShoppingBag className="w-5 h-5" />
                {!publicSettings.storefront_ordering_enabled 
                  ? 'Ordering Disabled' 
                  : isOutOfStock 
                    ? 'Out of Stock' 
                    : 'Buy Now'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-14 rounded-xl border-gray-200 hover:bg-gray-100 text-gray-600"
              >
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: Shield, label: 'Secure Checkout' },
                { icon: Truck, label: 'Fast Shipping' },
                { icon: RefreshCw, label: 'Easy Returns' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-3 rounded-xl bg-gray-50">
                  <item.icon className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Product Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">SKU</span>
                  <span className="font-medium text-gray-900">{product.product_id.slice(0, 8).toUpperCase()}</span>
                </div>
                {product.product.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium text-gray-900">{product.product.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Availability</span>
                  <span className={cn(
                    "font-medium",
                    isOutOfStock ? "text-red-600" : "text-green-600"
                  )}>
                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Reviews Section */}
        <div className="mt-16 pt-12 border-t border-gray-100">
          <ProductReviews
            productId={product.product.id}
            storefrontProductId={product.id}
          />
        </div>
      </main>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto bg-white">
          <Checkout
            cart={[{
              id: product.id,
              name: product.product.name,
              price: product.selling_price,
              quantity: quantity,
              image: product.product.image_url || undefined,
            }]}
            total={totalPrice}
            storeName={product.store.storefront_name || 'Store'}
            onBack={() => setIsCheckoutOpen(false)}
            onSubmit={handleSubmitOrder}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPage;
