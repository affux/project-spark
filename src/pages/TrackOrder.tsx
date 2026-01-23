import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  selling_price: number;
  quantity: number;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  product: {
    name: string;
    image_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending_payment: {
    label: 'Pending Payment',
    color: 'bg-amber-500',
    icon: <Clock className="w-5 h-5" />,
    description: 'Awaiting payment confirmation from the seller.',
  },
  paid_by_user: {
    label: 'Payment Received',
    color: 'bg-blue-500',
    icon: <Package className="w-5 h-5" />,
    description: 'Payment confirmed. Your order is being prepared.',
  },
  processing: {
    label: 'Processing',
    color: 'bg-indigo-500',
    icon: <Truck className="w-5 h-5" />,
    description: 'Your order is being processed and will be shipped soon.',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-500',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Your order has been delivered successfully.',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    icon: <AlertCircle className="w-5 h-5" />,
    description: 'This order has been cancelled.',
  },
};

const TrackOrder: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim() || !email.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both order number and email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          customer_name,
          customer_email,
          selling_price,
          quantity,
          created_at,
          paid_at,
          completed_at,
          storefront_products!inner (
            products!inner (
              name,
              image_url
            )
          )
        `)
        .eq('order_number', orderNumber.trim().toUpperCase())
        .eq('customer_email', email.trim().toLowerCase())
        .single();

      if (error || !data) {
        setOrder(null);
        toast({
          title: 'Order Not Found',
          description: 'No order found with the provided details. Please check and try again.',
          variant: 'destructive',
        });
      } else {
        const orderData: OrderDetails = {
          id: data.id,
          order_number: data.order_number,
          status: data.status,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          selling_price: data.selling_price,
          quantity: data.quantity,
          created_at: data.created_at,
          paid_at: data.paid_at,
          completed_at: data.completed_at,
          product: data.storefront_products?.products ? {
            name: data.storefront_products.products.name,
            image_url: data.storefront_products.products.image_url,
          } : null,
        };
        setOrder(orderData);
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      setOrder(null);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusSteps = () => {
    const steps = ['pending_payment', 'paid_by_user', 'processing', 'completed'];
    const currentIndex = order ? steps.indexOf(order.status) : -1;
    
    if (order?.status === 'cancelled') {
      return null;
    }

    return steps.map((step, index) => ({
      ...statusConfig[step],
      status: step,
      isActive: index <= currentIndex,
      isCurrent: index === currentIndex,
    }));
  };

  const statusSteps = order ? getStatusSteps() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">
            Enter your order number and email to check the status of your order.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
            <CardDescription>
              Find your order number in the confirmation email you received.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., ORD-123456"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Track Order
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Result */}
        {searched && !isSearching && (
          <>
            {order ? (
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Order {order.order_number}
                        <Badge variant={order.status === 'completed' ? 'completed' : order.status === 'cancelled' ? 'cancelled' : 'processing'}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Placed on {format(new Date(order.created_at), 'MMMM dd, yyyy')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Product Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    {order.product?.image_url ? (
                      <img
                        src={order.product.image_url}
                        alt={order.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {order.product?.name || 'Product'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {order.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${(order.selling_price * order.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {statusSteps ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">Order Status</h3>
                      <div className="relative">
                        {statusSteps.map((step, index) => (
                          <div key={step.status} className="flex gap-4 pb-6 last:pb-0">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                                  step.isActive ? step.color : 'bg-muted'
                                }`}
                              >
                                {step.icon}
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div
                                  className={`w-0.5 flex-1 mt-2 ${
                                    step.isActive && statusSteps[index + 1]?.isActive
                                      ? 'bg-primary'
                                      : 'bg-muted'
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex-1 pt-1.5">
                              <p
                                className={`font-medium ${
                                  step.isCurrent
                                    ? 'text-foreground'
                                    : step.isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {step.label}
                              </p>
                              {step.isCurrent && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {step.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200">
                            Order Cancelled
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {statusConfig.cancelled.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="grid gap-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Customer Name</span>
                      <span className="font-medium text-foreground">{order.customer_name}</span>
                    </div>
                    {order.paid_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Date</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(order.paid_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    {order.completed_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completed Date</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(order.completed_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Order Not Found
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Please check your order number and email address, then try again.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
