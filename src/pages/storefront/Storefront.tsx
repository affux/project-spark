import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicStorefront, PublicStorefrontProduct } from '@/hooks/usePublicStorefront';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X,
  ArrowRight,
  Store,
  Loader2,
  Sparkles,
  Star,
  MessageSquare,
  AlertTriangle,
  Shield,
  Truck,
  Clock,
  CreditCard,
  RefreshCw,
  Headphones,
  Mail,
  Phone,
  CheckCircle2,
  Award,
  Lock,
  Heart,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Checkout, CheckoutData } from '@/components/checkout/Checkout';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { FeaturedProductsCarousel } from '@/components/storefront/FeaturedProductsCarousel';

interface CartItem {
  product: PublicStorefrontProduct;
  quantity: number;
}

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

const Storefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { store, products, isLoading, isStoreNotFound } = usePublicStorefront(slug);
  const { settings: publicSettings, isLoading: isLoadingSettings } = usePublicSettings();
  const { settingsMap } = usePlatformSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bannerUrl = store?.storefront_banner || DEFAULT_BANNER;

  const filteredProducts = products.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sp.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: PublicStorefrontProduct) => {
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
        description: `${product.product.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.product.stock) {
          toast({
            title: 'Maximum Quantity Reached',
            description: `Only ${product.product.stock} units available.`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({
      title: 'Added to Cart',
      description: `${product.product.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          if (delta > 0 && newQuantity > item.product.product.stock) {
            toast({
              title: 'Maximum Quantity Reached',
              description: `Only ${item.product.product.stock} units available.`,
              variant: 'destructive',
            });
            return item;
          }
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!publicSettings.storefront_ordering_enabled) {
      toast({
        title: 'Ordering Disabled',
        description: publicSettings.storefront_ordering_disabled_message,
        variant: 'destructive',
      });
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = async (data: CheckoutData) => {
    setIsSubmitting(true);

    try {
      for (const item of cart) {
        const { data: response, error } = await supabase.functions.invoke('create-public-order', {
          body: {
            storefront_product_id: item.product.id,
            customer_name: data.customerName,
            customer_email: data.customerEmail,
            customer_phone: data.customerPhone || undefined,
            customer_address: data.customerAddress,
            quantity: item.quantity,
          },
        });

        if (error) {
          console.error('Order creation error:', error);
          throw new Error(error.message || 'Failed to create order');
        }

        if (response?.disabled) {
          throw new Error(response?.error || 'Order creation is currently disabled. Please contact the store owner to place your order.');
        }

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to create order');
        }
      }

      setCart([]);
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Order not available. Please contact the store owner.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto" />
          <p className="text-gray-500 animate-pulse">Loading store...</p>
        </div>
      </div>
    );
  }

  if (isStoreNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Store className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Store Not Found</h1>
          <p className="text-gray-500 mb-6">The store you're looking for doesn't exist.</p>
          <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800 text-white">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const checkoutCart = cart.map(item => ({
    id: item.product.id,
    name: item.product.product.name,
    price: item.product.selling_price,
    quantity: item.quantity,
    image: item.product.product.image_url || undefined,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
                <span className="text-white font-bold text-lg">
                  {store?.display_name?.charAt(0) || store?.storefront_name?.charAt(0) || 'S'}
                </span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 text-lg tracking-tight">{store?.storefront_name || 'Store'}</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Premium Shopping
                </p>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 rounded-full border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-300 transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="hidden sm:flex h-10 w-10 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <Heart className="w-5 h-5" />
              </Button>
              
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="relative gap-2 rounded-full h-11 px-5 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 transition-all duration-300">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="hidden sm:inline font-medium">Cart</span>
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-gray-900 text-white text-xs font-bold animate-scale-in">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col bg-white border-gray-100">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-gray-900">
                      <ShoppingCart className="w-5 h-5" />
                      Shopping Cart
                    </SheetTitle>
                    <SheetDescription className="text-gray-500">
                      {cart.length === 0 ? 'Your cart is empty' : `${cartItemCount} item(s) in your cart`}
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {cart.map((item, index) => (
                      <div 
                        key={item.product.id} 
                        className="flex gap-4 p-4 rounded-2xl bg-gray-50 animate-slide-up hover:bg-gray-100 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.product.product.image_url ? (
                          <img
                            src={item.product.product.image_url}
                            alt={item.product.product.name}
                            className="w-20 h-20 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {item.product.product.name}
                          </h4>
                          <p className="text-sm text-gray-900 font-bold mt-1">
                            ${item.product.selling_price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full border-gray-200 hover:bg-gray-100"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full border-gray-200 hover:bg-gray-100"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500 rounded-full"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {cart.length > 0 && (
                    <SheetFooter className="border-t border-gray-100 pt-4">
                      <div className="w-full space-y-4">
                        <div className="flex justify-between text-xl font-bold text-gray-900">
                          <span>Total</span>
                          <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <Button 
                          className="w-full gap-2 h-12 rounded-full text-lg bg-gray-900 hover:bg-gray-800 text-white" 
                          size="lg" 
                          onClick={handleCheckout}
                        >
                          Checkout
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </SheetFooter>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-full border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative h-[320px] md:h-[420px] overflow-hidden">
        <img 
          src={bannerUrl}
          alt="Store banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4 animate-fade-in">
            <Badge className="mb-4 bg-white/90 text-gray-900 border-0 shadow-lg">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              Featured Store
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
              {store?.storefront_name || 'Our Store'}
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
              Discover amazing products at great prices
            </p>
          </div>
        </div>
      </section>

      {/* Greeting Message */}
      {publicSettings.storefront_greeting_message && (
        <div className="container mx-auto px-4 pt-8">
          <Alert className="bg-gray-50 border-gray-200 rounded-xl">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700">
              {publicSettings.storefront_greeting_message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Ordering Disabled Banner */}
      {!publicSettings.storefront_ordering_enabled && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant="destructive" className="rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {publicSettings.storefront_ordering_disabled_message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Featured Products Carousel */}
      {products.length > 0 && (
        <FeaturedProductsCarousel
          products={products}
          slug={slug || ''}
          onAddToCart={addToCart}
        />
      )}

      {/* Products */}
      <main className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              All Products
            </h3>
            <p className="text-gray-500 mt-1">
              {filteredProducts.length} products available
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">This store doesn't have any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((sp, index) => (
              <div
                key={sp.id}
                className={cn(
                  "group bg-white rounded-2xl border border-gray-100 overflow-hidden",
                  "transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-gray-200",
                  "opacity-0 animate-slide-up"
                )}
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
              >
                <Link to={`/store/${slug}/product/${sp.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <ProductThumbnail
                      productId={sp.product.id}
                      fallbackImageUrl={sp.product.image_url}
                      productName={sp.product.name}
                    />
                    {sp.product.category && (
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-white/95 text-gray-700 border-0 shadow-sm font-medium">
                          {sp.product.category}
                        </Badge>
                      </div>
                    )}
                    {sp.product.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Badge className="bg-gray-900 text-white">Out of Stock</Badge>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-md text-gray-600 hover:text-red-500"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors">
                      {sp.product.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[40px]">
                      {sp.custom_description || sp.product.description || 'Premium quality product'}
                    </p>
                  </div>
                </Link>

                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">
                      ${sp.selling_price.toFixed(2)}
                    </p>
                    <Button
                      size="sm"
                      className="rounded-full gap-2 bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all"
                      onClick={() => addToCart(sp)}
                      disabled={sp.product.stock <= 0}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found matching your search.</p>
          </div>
        )}
      </main>

      {/* Trust Badges Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gray-900 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Why Shop With Us
            </Badge>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">Trusted by Thousands</h3>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              We're committed to providing the best shopping experience with quality products and excellent service.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Shield, title: 'Secure Checkout', desc: '100% Protected' },
              { icon: Truck, title: 'Fast Shipping', desc: 'Quick Delivery' },
              { icon: RefreshCw, title: 'Easy Returns', desc: 'Hassle Free' },
              { icon: CreditCard, title: 'Safe Payments', desc: 'Multiple Options' },
              { icon: CheckCircle2, title: 'Quality Assured', desc: 'Premium Products' },
              { icon: Headphones, title: '24/7 Support', desc: 'Always Available' },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="text-center p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 group-hover:scale-110 transition-all duration-300">
                  <item.icon className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Happy Customers' },
              { value: '500+', label: 'Products Available' },
              { value: '99%', label: 'Satisfaction Rate' },
              { value: '24/7', label: 'Customer Support' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-gray-500 mt-2 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gray-900 text-white border-0">
              <MessageSquare className="w-3 h-3 mr-1" />
              Got Questions?
            </Badge>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">Frequently Asked Questions</h3>
            <p className="text-gray-500 mt-3">
              Find answers to common questions about our products and services.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {(() => {
              const defaultFaqs = [
                { id: '1', question: 'How do I place an order?', answer: 'Simply browse our products, add items to your cart, and proceed to checkout. Fill in your details and complete your order!' },
                { id: '2', question: 'What payment methods do you accept?', answer: 'We accept various payment methods including UPI, bank transfers, credit/debit cards, and more for your convenience.' },
                { id: '3', question: 'How long does shipping take?', answer: 'Shipping times vary by location, but we aim to deliver within 3-7 business days. You\'ll receive tracking information once your order ships.' },
                { id: '4', question: 'What is your return policy?', answer: 'We offer hassle-free returns within 7 days of delivery. Contact our support team to initiate a return request.' },
                { id: '5', question: 'How can I track my order?', answer: 'Once your order is shipped, you\'ll receive an email with tracking information. You can also check your order status on our website.' },
              ];
              
              let faqs = defaultFaqs;
              if (settingsMap?.faq_items) {
                try {
                  const faqValue = settingsMap.faq_items;
                  if (typeof faqValue === 'string') {
                    const parsed = JSON.parse(faqValue);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      faqs = parsed;
                    }
                  } else if (Array.isArray(faqValue) && faqValue.length > 0) {
                    faqs = faqValue;
                  }
                } catch {
                  // Use default FAQs on parse error
                }
              }
              
              return faqs.map((faq: { id: string; question: string; answer: string }, idx: number) => (
                <AccordionItem 
                  key={faq.id || idx} 
                  value={faq.id || String(idx)}
                  className="bg-white border border-gray-100 rounded-2xl px-6 overflow-hidden data-[state=open]:border-gray-200 data-[state=open]:shadow-sm transition-all"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 text-gray-900">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ));
            })()}
          </Accordion>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <Mail className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Stay Updated</h3>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Subscribe to get exclusive offers, new product updates, and special discounts delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input 
              placeholder="Enter your email" 
              className="h-12 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
            />
            <Button 
              className="h-12 px-8 rounded-full font-semibold bg-white text-gray-900 hover:bg-gray-100"
            >
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">
                    {store?.display_name?.charAt(0) || store?.storefront_name?.charAt(0) || 'S'}
                  </span>
                </div>
                <span className="font-bold text-xl text-gray-900">{store?.storefront_name}</span>
              </div>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Your trusted destination for quality products. We're committed to bringing you the best shopping experience.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-gray-900" />
                <span>100% Secure Shopping</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {['All Products', 'New Arrivals', 'Best Sellers', 'Special Offers'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Customer Service</h4>
              <ul className="space-y-3">
                {['Track Order', 'Shipping Info', 'Returns & Exchanges', 'Contact Us'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Get in Touch</h4>
              <ul className="space-y-4">
                {publicSettings.storefront_contact_email && (
                  <li className="flex items-start gap-3 text-gray-500">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <span>{publicSettings.storefront_contact_email}</span>
                  </li>
                )}
                {publicSettings.storefront_contact_phone && (
                  <li className="flex items-start gap-3 text-gray-500">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <span>{publicSettings.storefront_contact_phone}</span>
                  </li>
                )}
                {publicSettings.storefront_business_hours && (
                  <li className="flex items-start gap-3 text-gray-500">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <span>{publicSettings.storefront_business_hours}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Payment Methods & Copyright */}
          <div className="border-t border-gray-100 mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} {store?.storefront_name || 'Store'}. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Secure Payment:</span>
                <TooltipProvider>
                  <div className="flex items-center gap-2">
                    {publicSettings.storefront_payment_icons?.visa && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
                            <svg viewBox="0 0 48 48" className="w-8 h-4">
                              <path fill="#1565C0" d="M45,35c0,2.2-1.8,4-4,4H7c-2.2,0-4-1.8-4-4V13c0-2.2,1.8-4,4-4h34c2.2,0,4,1.8,4,4V35z"/>
                              <path fill="#FFF" d="M15.2,19l-3.2,10h2.6l0.5-1.5h2.9l0.5,1.5h2.6l-3.2-10H15.2z M15.6,25.5l0.9-2.8l0.9,2.8H15.6z"/>
                              <polygon fill="#FFF" points="22,29 24.2,29 24.2,21.5 26.8,29 28.4,29 31,21.5 31,29 33.2,29 33.2,19 29.8,19 27.6,25.5 25.4,19 22,19"/>
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visa</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {publicSettings.storefront_payment_icons?.mastercard && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
                            <svg viewBox="0 0 48 48" className="w-8 h-4">
                              <path fill="#FF9800" d="M32,24c0,4.4-3.6,8-8,8s-8-3.6-8-8s3.6-8,8-8S32,19.6,32,24"/>
                              <path fill="#D50000" d="M24,16c-4.4,0-8,3.6-8,8s3.6,8,8,8c1.8,0,3.5-0.6,4.9-1.7C27.1,28.9,26,26.6,26,24s1.1-4.9,2.9-6.3C27.5,16.6,25.8,16,24,16"/>
                              <path fill="#FF9800" d="M40,24c0,4.4-3.6,8-8,8c-1.8,0-3.5-0.6-4.9-1.7c1.8-1.4,2.9-3.7,2.9-6.3s-1.1-4.9-2.9-6.3c1.4-1.1,3.1-1.7,4.9-1.7C36.4,16,40,19.6,40,24"/>
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mastercard</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {publicSettings.storefront_payment_icons?.apple_pay && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
                            <svg viewBox="0 0 48 48" className="w-8 h-4">
                              <path fill="#1565C0" d="M18.7,13.8L18.7,13.8C18.1,14.6,17,15.2,16,15.1c-0.1-1,0.4-2.1,1-2.8c0.7-0.8,1.8-1.4,2.7-1.4C19.8,11.9,19.3,13,18.7,13.8"/>
                              <path fill="#1565C0" d="M19.6,15.4c-1.5-0.1-2.8,0.8-3.5,0.8c-0.7,0-1.8-0.8-3-0.8c-1.5,0-3,0.9-3.7,2.3c-1.6,2.8-0.4,6.9,1.1,9.2c0.8,1.1,1.7,2.4,2.9,2.3c1.1,0,1.6-0.8,2.9-0.8c1.4,0,1.8,0.8,3,0.8c1.2,0,2-1.1,2.8-2.2c0.9-1.3,1.2-2.5,1.3-2.6c0-0.1-2.4-0.9-2.4-3.7c0-2.3,1.9-3.4,2-3.5C21.7,15.8,20.1,15.4,19.6,15.4"/>
                              <path fill="#1565C0" d="M30.3,12v17h2.6v-5.8h3.6c3.3,0,5.6-2.3,5.6-5.6c0-3.3-2.3-5.6-5.5-5.6H30.3z M32.9,14.3h3c2.3,0,3.5,1.2,3.5,3.3c0,2.1-1.3,3.3-3.5,3.3h-3V14.3z"/>
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Apple Pay</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {publicSettings.storefront_payment_icons?.paypal && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
                            <svg viewBox="0 0 48 48" className="w-8 h-4">
                              <path fill="#1565C0" d="M15.4,17.6h4.2l2.5-6.7c0.1-0.3,0.5-0.3,0.6,0l2.5,6.7h4.2l-3.4,2.5l1.3,4c0.1,0.3-0.2,0.5-0.5,0.3l-3.4-2.5l-3.4,2.5c-0.2,0.2-0.6,0-0.5-0.3l1.3-4L15.4,17.6z"/>
                              <path fill="#1565C0" d="M45,35c0,2.2-1.8,4-4,4H7c-2.2,0-4-1.8-4-4V13c0-2.2,1.8-4,4-4h34c2.2,0,4,1.8,4,4V35z" fillOpacity="0"/>
                              <path fill="#039BE5" d="M3,24.5v10c0,2.5,2,4.5,4.5,4.5h33c2.5,0,4.5-2,4.5-4.5v-10H3z"/>
                              <path fill="#01579B" d="M45,24.5H3v-15C3,7,5,5,7.5,5h33C43,5,45,7,45,9.5V24.5z"/>
                              <path fill="#FFF" d="M18.6,14.5c0-0.6-0.5-1.1-1.1-1.1h-4.1c-0.6,0-1.1,0.5-1.1,1.1v4.1c0,0.6,0.5,1.1,1.1,1.1h4.1c0.6,0,1.1-0.5,1.1-1.1V14.5z"/>
                              <path fill="#1565C0" d="M17.5,15.5c0-0.3-0.2-0.5-0.5-0.5h-2c-0.3,0-0.5,0.2-0.5,0.5v2c0,0.3,0.2,0.5,0.5,0.5h2c0.3,0,0.5-0.2,0.5-0.5V15.5z"/>
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>PayPal</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {publicSettings.storefront_payment_icons?.secure_checkout && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                            <Lock className="w-4 h-4 text-gray-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Secure Checkout</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-white">
          <Checkout
            cart={checkoutCart}
            total={cartTotal}
            storeName={store?.storefront_name || 'Store'}
            onSubmit={handleSubmitOrder}
            onBack={handleCloseCheckout}
            isSubmitting={isSubmitting}
            onUpdateQuantity={updateQuantity}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Storefront;
