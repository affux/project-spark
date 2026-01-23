import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDashboard, DashboardOrder } from '@/hooks/useUserDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { OrderStatusProgress } from '@/components/order/OrderStatusProgress';
import { USDWalletPayment } from '@/components/user/USDWalletPayment';
import { USDTIcon } from '@/components/icons/USDTIcon';
import { EarningsChart } from '@/components/user/EarningsChart';
import { OrderStatusChart } from '@/components/user/OrderStatusChart';
import { downloadCSV } from '@/lib/exportUtils';

import { Search, CreditCard, AlertCircle, Loader2, CheckCircle2, Wallet, ArrowRight, Smartphone, Building, Upload, FileCheck, ZoomIn, X, Download, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrderRealtimeUser } from '@/hooks/useRealtimeSubscription';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { triggerPaymentConfetti } from '@/lib/confetti';
import { usePostpaid } from '@/hooks/usePostpaid';

type OrderStatusFilter = 'all' | 'pending_payment' | 'paid_by_user' | 'processing' | 'completed';

const statusFilters: { value: OrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const UserOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { orders, isLoading, refetchOrders, profile } = useUserDashboard();
  const { settingsMap, isLoading: isLoadingSettings } = usePlatformSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  // Enable real-time updates
  useOrderRealtimeUser(user?.id);

  // Get postpaid status
  const { postpaidStatus } = usePostpaid();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const orderCounts = {
    all: orders.length,
    pending_payment: orders.filter(o => o.status === 'pending_payment').length,
    paid_by_user: orders.filter(o => o.status === 'paid_by_user').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const totalPendingAmount = orders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.base_price * o.quantity), 0);

  // Get wallet balance from profile
  const walletBalance = profile?.wallet_balance || 0;
  
  // Get minimum wallet balance for payment
  const minimumWalletBalanceForPayment = settingsMap.minimum_wallet_balance_for_payment || 0;

  // Check if wallet balance payment is enabled by admin (default to true for backward compatibility)
  const isWalletBalanceEnabled = settingsMap.payment_method_wallet_balance_enabled !== false;

  // Get enabled payment methods - include wallet balance only if enabled by admin
  const enabledPaymentMethods = [
    ...(isWalletBalanceEnabled ? [{ 
      id: 'wallet_balance', 
      name: 'Wallet Balance', 
      icon: Wallet, 
      customIcon: null, 
      enabled: true, 
      message: settingsMap.payment_method_wallet_balance_message || `Pay using your available wallet balance of $${walletBalance.toFixed(2)}`,
      isWalletBalance: true,
      isPostpaid: false,
    }] : []),
    // Postpaid option - only show if user has postpaid enabled with available credit
    ...(postpaidStatus?.enabled && postpaidStatus.availableCredit > 0 ? [{
      id: 'postpaid',
      name: 'Postpaid Credit',
      icon: CreditCard,
      customIcon: null,
      enabled: true,
      message: `Pay later using your credit line. Available: $${postpaidStatus.availableCredit.toFixed(2)}`,
      isWalletBalance: false,
      isPostpaid: true,
    }] : []),
    { id: 'upi', name: 'UPI', icon: Smartphone, customIcon: null, enabled: settingsMap.payment_method_upi_enabled, message: settingsMap.payment_method_upi_message, isWalletBalance: false, isPostpaid: false },
    { id: 'bank', name: 'Bank Transfer', icon: Building, customIcon: null, enabled: settingsMap.payment_method_bank_enabled, message: settingsMap.payment_method_bank_message, isWalletBalance: false, isPostpaid: false },
    { id: 'usd_wallet', name: 'USDT Wallet', icon: Wallet, customIcon: <USDTIcon size={20} />, enabled: settingsMap.payment_method_usd_wallet_enabled, message: settingsMap.payment_method_usd_wallet_message, walletId: settingsMap.usd_wallet_id, isWalletBalance: false, isPostpaid: false },
  ].filter(m => m.enabled);

  const handlePayOrder = (order: DashboardOrder) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod(enabledPaymentMethods.length > 0 ? enabledPaymentMethods[0].id : '');
    setPaymentProofFile(null);
    setPaymentProofPreview(null);
    setIsPayDialogOpen(true);
  };

  const validateAndSetFile = (file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return false;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPG, PNG, WebP) or PDF file',
        variant: 'destructive',
      });
      return false;
    }

    setPaymentProofFile(file);
    
    // Generate preview for image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPaymentProofPreview(null);
    }
    return true;
  };

  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Handle wallet balance payment using edge function
  const handleWalletPayment = async () => {
    if (!selectedOrder || !user?.id) return;
    
    const orderAmount = selectedOrder.base_price * selectedOrder.quantity;
    
    // Check minimum wallet balance requirement
    if (walletBalance < minimumWalletBalanceForPayment) {
      toast({
        title: 'Minimum Balance Required',
        description: `You need at least $${minimumWalletBalanceForPayment.toFixed(2)} in your wallet to use wallet payment.`,
        variant: 'destructive',
      });
      return;
    }
    
    if (walletBalance < orderAmount) {
      toast({
        title: 'Insufficient Balance',
        description: `You need $${orderAmount.toFixed(2)} but only have $${walletBalance.toFixed(2)} in your wallet.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-wallet-payment', {
        body: { orderId: selectedOrder.id }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      toast({
        title: '🎉 Payment Successful!',
        description: `$${orderAmount.toFixed(2)} has been deducted from your wallet for order ${selectedOrder.order_number}.`,
        className: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      });
      
      triggerPaymentConfetti();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      refetchOrders();
      setIsPayDialogOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Wallet payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Could not process wallet payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle postpaid credit payment
  const handlePostpaidPayment = async () => {
    if (!selectedOrder || !user?.id || !postpaidStatus) return;
    
    const orderAmount = selectedOrder.base_price * selectedOrder.quantity;
    
    // Check if user has any credit limit set (admin allowed postpaid)
    if (!postpaidStatus.enabled && postpaidStatus.creditLimit <= 0) {
      toast({
        title: 'Postpaid Not Enabled',
        description: 'Postpaid credit is not enabled for your account. Please contact admin.',
        variant: 'destructive',
      });
      return;
    }
    
    if (postpaidStatus.availableCredit < orderAmount) {
      toast({
        title: 'Insufficient Credit',
        description: `You need $${orderAmount.toFixed(2)} but only have $${postpaidStatus.availableCredit.toFixed(2)} available credit.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Use the secure database function to process postpaid payment
      const { data, error } = await supabase.rpc('process_postpaid_payment', {
        _user_id: user.id,
        _order_id: selectedOrder.id,
        _amount: orderAmount,
      });

      if (error) throw error;

      toast({
        title: '✅ Order Placed on Credit',
        description: `Order ${selectedOrder.order_number} is now pending. You will need to clear $${orderAmount.toFixed(2)} to complete this order.`,
        className: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      });
      
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['postpaid-status'] });
      queryClient.invalidateQueries({ queryKey: ['postpaid-transactions'] });
      refetchOrders();
      setIsPayDialogOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Postpaid payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Could not process postpaid payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !user?.id) return;

    // If wallet balance payment is selected, use the wallet payment handler
    if (selectedPaymentMethod === 'wallet_balance') {
      return handleWalletPayment();
    }

    // If postpaid payment is selected, use the postpaid payment handler
    if (selectedPaymentMethod === 'postpaid') {
      return handlePostpaidPayment();
    }
    
    setIsProcessing(true);
    try {
      let proofUrl: string | null = null;

      // Upload payment proof if provided
      if (paymentProofFile) {
        setIsUploadingProof(true);
        const fileExt = paymentProofFile.name.split('.').pop();
        const fileName = `${user.id}/${selectedOrder.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        proofUrl = publicUrl;
        setIsUploadingProof(false);
      }

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'paid_by_user',
          paid_at: new Date().toISOString(),
          payment_proof_url: proofUrl
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'payment_confirmed',
            userId: user.id,
            userName: profile?.name || 'User',
            userEmail: profile?.email || user.email,
            orderNumber: selectedOrder.order_number,
            productName: selectedOrder.product?.name || 'Product',
            amount: selectedOrder.base_price * selectedOrder.quantity,
            orderStatus: 'paid_by_user',
            previousStatus: 'pending_payment'
          }
        });
      } catch (emailError) {
        console.log('Email notification failed, but payment was successful:', emailError);
      }

      toast({
        title: '🎉 Payment Confirmed Successfully!',
        description: `Your payment of $${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)} for order ${selectedOrder.order_number} has been submitted${proofUrl ? ' with proof document' : ''}. Admin will process it shortly.`,
        className: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      });
      
      // Trigger confetti animation
      triggerPaymentConfetti();
      
      refetchOrders();
      setIsPayDialogOpen(false);
      setSelectedOrder(null);
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsUploadingProof(false);
    }
  };

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage orders from your storefront.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const exportData = orders.map(order => ({
                'Order ID': order.order_number,
                'Product': order.product?.name || 'N/A',
                'Customer': order.customer_name,
                'Quantity': order.quantity,
                'Selling Price': order.selling_price.toFixed(2),
                'Base Price': order.base_price.toFixed(2),
                'Profit': ((order.selling_price - order.base_price) * order.quantity).toFixed(2),
                'Status': order.status.replace(/_/g, ' '),
                'Date': new Date(order.created_at).toLocaleDateString(),
              }));
              downloadCSV(exportData, `my-orders-report-${new Date().toISOString().split('T')[0]}`);
              toast({
                title: 'Report Downloaded',
                description: 'Your orders report has been downloaded as CSV.',
              });
            }}
            disabled={orders.length === 0}
          >
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </div>

        {/* Pending Payments Alert */}
        {totalPendingAmount > 0 && (
          <div className="dashboard-card trading-glow bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  You have {orderCounts.pending_payment} order(s) awaiting payment
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Total payable: ${totalPendingAmount.toFixed(2)}. Pay now to enable order fulfillment.
                </p>
              </div>
            </div>
            <Button 
              variant="accent" 
              className="gap-2"
              onClick={() => setStatusFilter('pending_payment')}
            >
              <CreditCard className="w-4 h-4" />
              View Pending
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map(filter => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className="gap-2"
              >
                {filter.label}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-1",
                    statusFilter === filter.value && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {orderCounts[filter.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <OrdersTableNew
          orders={filteredOrders}
          userRole="user"
          onViewOrder={(order) => toast({ title: 'View Order', description: `Viewing ${order.order_number}` })}
          onPayOrder={handlePayOrder}
        />

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {orders.length === 0 
                ? "You don't have any orders yet."
                : "No orders found matching your criteria."}
            </p>
          </div>
        )}

        {/* Charts Section - Below Orders Table */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EarningsChart orders={orders} currencySymbol="$" />
            <OrderStatusChart orders={orders} />
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 flex-shrink-0">
              <DialogTitle>Pay for Order</DialogTitle>
              <DialogDescription>
                Pay the base price to admin to enable order fulfillment.
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="max-h-[60vh] overflow-y-auto px-6">
              <div className="py-4 space-y-4">
                {/* Order Progress Indicator */}
                <OrderStatusProgress status={selectedOrder.status} />

                {/* PROMINENT Amount Payable to Admin */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                      Amount You Pay to {settingsMap.site_name || 'Admin'}
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                    ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)}
                  </div>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    Base price × {selectedOrder.quantity} unit(s)
                  </p>
                </div>

                {/* Order Details */}
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-medium">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{selectedOrder.product?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer Paid</span>
                    <span className="font-medium">${(selectedOrder.selling_price * selectedOrder.quantity).toFixed(2)}</span>
                  </div>
                </div>

                {/* Profit & Wallet Credit Info */}
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700 dark:text-green-300">After Completion, Your Wallet Gets:</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      ${(selectedOrder.selling_price * selectedOrder.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 dark:text-green-400">Your Net Profit:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${((selectedOrder.selling_price - selectedOrder.base_price) * selectedOrder.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                {enabledPaymentMethods.length > 0 && (
                  <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                    <p className="text-sm font-medium">Select Payment Method</p>
                    <RadioGroup 
                      value={selectedPaymentMethod} 
                      onValueChange={setSelectedPaymentMethod}
                      className="space-y-2"
                    >
                      {enabledPaymentMethods.map((method) => {
                        const isWalletBalance = method.id === 'wallet_balance';
                        const isPostpaid = method.id === 'postpaid';
                        const orderAmount = selectedOrder.base_price * selectedOrder.quantity;
                        const hasEnoughBalance = walletBalance >= orderAmount;
                        const hasEnoughCredit = postpaidStatus?.availableCredit ? postpaidStatus.availableCredit >= orderAmount : false;
                        
                        return (
                          <div 
                            key={method.id} 
                            className={cn(
                              "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                              selectedPaymentMethod === method.id 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50",
                              isWalletBalance && "bg-gradient-to-r from-emerald-500/10 to-green-500/5",
                              isPostpaid && "bg-gradient-to-r from-blue-500/10 to-indigo-500/5"
                            )}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                          >
                            <RadioGroupItem value={method.id} id={method.id} />
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              isWalletBalance ? "bg-emerald-500/20" : isPostpaid ? "bg-blue-500/20" : "bg-muted"
                            )}>
                              {method.customIcon ? method.customIcon : <method.icon className={cn("w-4 h-4", isWalletBalance && "text-emerald-600", isPostpaid && "text-blue-600")} />}
                            </div>
                            <div className="flex-1">
                              <Label htmlFor={method.id} className="cursor-pointer font-medium flex items-center gap-2">
                                {method.name}
                                {isWalletBalance && (
                                  <Badge variant="secondary" className={cn(
                                    "text-xs",
                                    hasEnoughBalance 
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    ${walletBalance.toFixed(2)}
                                  </Badge>
                                )}
                                {isPostpaid && (
                                  <Badge variant="secondary" className={cn(
                                    "text-xs",
                                    hasEnoughCredit 
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    ${postpaidStatus?.availableCredit?.toFixed(2) || '0.00'}
                                  </Badge>
                                )}
                              </Label>
                              {isWalletBalance && !hasEnoughBalance && (
                                <p className="text-xs text-red-500 mt-0.5">
                                  Insufficient balance (need ${orderAmount.toFixed(2)})
                                </p>
                              )}
                              {isPostpaid && !hasEnoughCredit && (
                                <p className="text-xs text-red-500 mt-0.5">
                                  Insufficient credit (need ${orderAmount.toFixed(2)})
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>
                    
                    {/* Wallet Balance Payment Info */}
                    {selectedPaymentMethod === 'wallet_balance' && (
                      <div className={cn(
                        "mt-3 p-4 rounded-lg border",
                        walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                              ? "bg-emerald-100 dark:bg-emerald-900/50"
                              : "bg-red-100 dark:bg-red-900/50"
                          )}>
                            <Wallet className={cn(
                              "w-5 h-5",
                              walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium",
                              walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-red-700 dark:text-red-300"
                            )}>
                              {walletBalance < minimumWalletBalanceForPayment
                                ? `Minimum balance of $${minimumWalletBalanceForPayment.toFixed(2)} required`
                                : walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                                  ? "Ready to pay from wallet"
                                  : "Insufficient wallet balance"
                              }
                            </p>
                            <p className={cn(
                              "text-sm",
                              walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            )}>
                              Balance: ${walletBalance.toFixed(2)} • Required: ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {walletBalance >= minimumWalletBalanceForPayment && walletBalance >= (selectedOrder.base_price * selectedOrder.quantity) && (
                          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2 pl-13">
                            The amount will be instantly deducted from your wallet.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Postpaid Credit Payment Info */}
                    {selectedPaymentMethod === 'postpaid' && postpaidStatus && (
                      <div className={cn(
                        "mt-3 p-4 rounded-lg border",
                        postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                              ? "bg-blue-100 dark:bg-blue-900/50"
                              : "bg-red-100 dark:bg-red-900/50"
                          )}>
                            <CreditCard className={cn(
                              "w-5 h-5",
                              postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-red-600 dark:text-red-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium",
                              postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-red-700 dark:text-red-300"
                            )}>
                              {postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "Ready to use postpaid credit"
                                : "⛔ Insufficient Postpaid Limit"
                              }
                            </p>
                            <div className={cn(
                              "text-sm space-y-1",
                              postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity)
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-red-600 dark:text-red-400"
                            )}>
                              <p>Credit Limit: ${postpaidStatus.creditLimit.toFixed(2)}</p>
                              <p>Available Credit: ${postpaidStatus.availableCredit.toFixed(2)}</p>
                              <p>Order Amount: ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        {postpaidStatus.availableCredit >= (selectedOrder.base_price * selectedOrder.quantity) ? (
                          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-2 pl-13">
                            ⚠️ This order will be marked as "Postpaid Pending". You must clear dues to complete the order.
                          </p>
                        ) : (
                          <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700">
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                              Your postpaid limit is ${postpaidStatus.creditLimit.toFixed(2)}, but the order value is ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)}.
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Please choose another payment method or reduce the order value.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show selected payment method message - for non-wallet/non-postpaid methods */}
                    {selectedPaymentMethod && selectedPaymentMethod !== 'usd_wallet' && selectedPaymentMethod !== 'wallet_balance' && selectedPaymentMethod !== 'postpaid' && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {enabledPaymentMethods.find(m => m.id === selectedPaymentMethod)?.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* USD Wallet Payment - Show QR and Copy Address */}
                {selectedPaymentMethod === 'usd_wallet' && selectedOrder && (
                  <USDWalletPayment 
                    showPayButton={false}
                    className="border-primary/30"
                    orderAmount={selectedOrder.base_price * selectedOrder.quantity}
                  />
                )}

                {enabledPaymentMethods.length === 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No payment methods are currently enabled. Please contact admin.
                    </p>
                  </div>
                )}

                {/* Payment Instructions - Hide for wallet balance and postpaid */}
                {selectedPaymentMethod !== 'wallet_balance' && selectedPaymentMethod !== 'postpaid' && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Payment Instructions
                    </p>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>1. Make payment using the selected method above</p>
                      <p>2. Upload your payment proof/screenshot below</p>
                      <p>3. Click "Confirm Payment" to submit</p>
                    </div>
                  </div>
                )}

                {/* Payment Proof Upload Section - Hide for wallet balance and postpaid */}
                {selectedPaymentMethod !== 'wallet_balance' && selectedPaymentMethod !== 'postpaid' && (
                  <div 
                    className={cn(
                      "p-4 rounded-xl space-y-3 transition-all duration-200",
                      isDragOver 
                        ? "bg-primary/10 border-2 border-primary border-dashed ring-4 ring-primary/20" 
                        : "bg-muted/50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Payment Proof <span className="text-red-500">*</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to upload a screenshot or document.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleProofFileSelect}
                          className="hidden"
                        />
                        <div className={cn(
                          "flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
                          isDragOver
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : paymentProofFile 
                              ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                        )}>
                          {isDragOver ? (
                            <>
                              <Upload className="w-8 h-8 text-primary animate-bounce" />
                              <span className="text-sm font-medium text-primary">
                                Drop file here
                              </span>
                            </>
                          ) : paymentProofFile ? (
                            <>
                              <FileCheck className="w-6 h-6 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate max-w-[200px]">
                                {paymentProofFile.name}
                              </span>
                              <span className="text-xs text-green-600/70">
                                {(paymentProofFile.size / 1024).toFixed(1)} KB
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click or drag file here
                              </span>
                              <span className="text-xs text-muted-foreground/70">
                                JPG, PNG, WebP, PDF (max 10MB)
                              </span>
                            </>
                          )}
                        </div>
                      </label>
                      {paymentProofFile && !isDragOver && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPaymentProofFile(null);
                            setPaymentProofPreview(null);
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    {/* Image Preview with Zoom */}
                    {paymentProofPreview && (
                      <div className="mt-3 p-2 border rounded-lg bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">Preview:</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="gap-1 h-7 text-xs"
                          >
                            <ZoomIn className="w-3 h-3" />
                            Zoom
                          </Button>
                        </div>
                        <img 
                          src={paymentProofPreview} 
                          alt="Payment proof preview" 
                          className="max-h-48 w-full object-contain rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setIsPreviewModalOpen(true)}
                        />
                      </div>
                    )}
                    
                    {/* PDF file indicator */}
                    {paymentProofFile && !paymentProofPreview && (
                      <div className="mt-3 p-3 border rounded-lg bg-background flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">PDF document selected</span>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground">
                      Supported formats: JPG, PNG, WebP, PDF (max 10MB)
                    </p>
                  </div>
                )}
              </div>
              </div>
            )}
            <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => setIsPayDialogOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmPayment} 
                className="gap-2" 
                disabled={
                  isProcessing || 
                  isUploadingProof || 
                  !selectedPaymentMethod ||
                  // For wallet balance: check if enough balance AND minimum requirement
                  (selectedPaymentMethod === 'wallet_balance' && selectedOrder && (walletBalance < minimumWalletBalanceForPayment || walletBalance < (selectedOrder.base_price * selectedOrder.quantity))) ||
                  // For postpaid: check if enough credit
                  (selectedPaymentMethod === 'postpaid' && selectedOrder && (!postpaidStatus?.availableCredit || postpaidStatus.availableCredit < (selectedOrder.base_price * selectedOrder.quantity))) ||
                  // For other methods: require payment proof
                  (selectedPaymentMethod !== 'wallet_balance' && selectedPaymentMethod !== 'postpaid' && !paymentProofFile)
                }
              >
                {isProcessing || isUploadingProof ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploadingProof ? 'Uploading Proof...' : 'Processing...'}
                  </>
                ) : selectedPaymentMethod === 'wallet_balance' ? (
                  <>
                    <Wallet className="w-4 h-4" />
                    Pay ${selectedOrder ? (selectedOrder.base_price * selectedOrder.quantity).toFixed(2) : '0.00'} from Wallet
                  </>
                ) : selectedPaymentMethod === 'postpaid' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Use Postpaid Credit (${selectedOrder ? (selectedOrder.base_price * selectedOrder.quantity).toFixed(2) : '0.00'})
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Proof Preview Modal */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b flex-row items-center justify-between">
              <DialogTitle>Payment Proof Preview</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] flex items-center justify-center bg-muted/20">
              {paymentProofPreview && (
                <img 
                  src={paymentProofPreview} 
                  alt="Payment proof full preview" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserOrders;
