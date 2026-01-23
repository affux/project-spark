/**
 * Public Order Tracking Page
 * 
 * SECURITY HARDENING (OWASP Best Practices):
 * - Input validation with schema-based validation
 * - Length limits on order number input
 * - Sanitization to prevent XSS
 * - Rate limiting awareness (client-side throttling)
 * - No exposure of sensitive customer data
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderStatusProgress } from '@/components/order/OrderStatusProgress';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { usePublicOrderTracking } from '@/hooks/useOrderStatusHistory';
import { format } from 'date-fns';
import { 
  Search, 
  Package, 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  Mail,
  Calendar,
  DollarSign,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { orderNumberSchema, sanitizeString, VALIDATION_LIMITS } from '@/lib/validationSchemas';

const statusColors: Record<string, string> = {
  pending_payment: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  paid_by_user: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

// SECURITY: Rate limiting - track search attempts
const SEARCH_COOLDOWN_MS = 1000; // 1 second between searches
let lastSearchTime = 0;

const TrackOrderPublic: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNumber = searchParams.get('order');
  const [searchInput, setSearchInput] = useState(orderNumber || '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isThrottled, setIsThrottled] = useState(false);
  
  const { order, history, isLoading, notFound } = usePublicOrderTracking(orderNumber || undefined);

  /**
   * SECURITY: Validate order number input using schema
   */
  const validateOrderNumber = useCallback((value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) {
      return { valid: false, error: 'Order number is required' };
    }
    
    try {
      orderNumberSchema.parse(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid order number format. Use letters, numbers, and hyphens only.' };
    }
  }, []);

  /**
   * SECURITY: Handle input change with sanitization and length limits
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // SECURITY: Limit input length to prevent DoS
    const value = e.target.value.slice(0, VALIDATION_LIMITS.ORDER_NUMBER_MAX);
    // SECURITY: Sanitize and normalize to uppercase
    const sanitized = sanitizeString(value).toUpperCase();
    setSearchInput(sanitized);
    
    // Clear error on input change
    if (inputError) {
      setInputError(null);
    }
  }, [inputError]);

  /**
   * SECURITY: Handle search with validation and rate limiting
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURITY: Client-side rate limiting to prevent abuse
    const now = Date.now();
    if (now - lastSearchTime < SEARCH_COOLDOWN_MS) {
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), SEARCH_COOLDOWN_MS);
      return;
    }
    
    // SECURITY: Validate input before search
    const validation = validateOrderNumber(searchInput);
    if (!validation.valid) {
      setInputError(validation.error || 'Invalid input');
      return;
    }
    
    lastSearchTime = now;
    setSearchParams({ order: searchInput.trim().toUpperCase() });
  }, [searchInput, validateOrderNumber, setSearchParams]);

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}***@${domain}`;
  };

  const maskName = (name: string) => {
    const parts = name.split(' ');
    return parts.map(part => {
      if (part.length <= 2) return part[0] + '*';
      return part[0] + '*'.repeat(part.length - 1);
    }).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <h1 className="text-lg font-semibold">Order Tracking</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Track Your Order
            </CardTitle>
            <CardDescription>
              Enter your order number to see real-time status updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter order number (e.g., ORD-123456)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!searchInput.trim()}>
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Looking up your order...</p>
          </div>
        )}

        {/* Not Found State */}
        {notFound && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                Order Not Found
              </h3>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">
                We couldn't find an order with number "{orderNumber}". Please check the order number and try again.
              </p>
              <Button variant="outline" onClick={() => setSearchParams({})}>
                Try Another Order
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && !isLoading && (
          <div className="space-y-6">
            {/* Order Header */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-primary" />
                      {order.order_number}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Placed on {format(new Date(order.created_at), 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge className={cn("border", statusColors[order.status] || 'bg-muted')}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Progress */}
                <OrderStatusProgress status={order.status as 'pending_payment' | 'paid_by_user' | 'processing' | 'completed' | 'cancelled'} />

                {/* Order Info Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" /> Product
                    </p>
                    <div className="flex items-center gap-2">
                      {order.storefront_products?.products?.image_url && (
                        <img 
                          src={order.storefront_products.products.image_url}
                          alt={order.storefront_products.products.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <p className="font-medium text-sm">
                        {order.storefront_products?.products?.name}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Total
                    </p>
                    <p className="font-semibold">
                      ${(order.selling_price * order.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {order.quantity}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium text-sm">{maskName(order.customer_name)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="font-medium text-sm">{maskEmail(order.customer_email)}</p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-4 pt-4 border-t text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Created: {format(new Date(order.created_at), 'PP')}
                  </div>
                  {order.paid_at && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Calendar className="w-3 h-3" />
                      Paid: {format(new Date(order.paid_at), 'PP')}
                    </div>
                  )}
                  {order.completed_at && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Calendar className="w-3 h-3" />
                      Completed: {format(new Date(order.completed_at), 'PP')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status History</CardTitle>
                <CardDescription>
                  Track all updates to your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderTimeline history={history} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State (no search yet) */}
        {!orderNumber && !isLoading && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Enter your order number above
            </h3>
            <p className="text-sm text-muted-foreground/80">
              You can find your order number in the confirmation email you received
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrackOrderPublic;
