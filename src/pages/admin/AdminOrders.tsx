import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Eye, 
  CheckCircle,
  Package,
  Loader2,
  User,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  ExternalLink,
  MousePointerClick,
  Plus,
  Upload,
  MessageSquare,
  FileCheck,
  Download,
  Image as ImageIcon,
  ZoomIn,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminOrders, AdminOrder } from '@/hooks/useAdminOrders';
import { CreateOrderDialog } from '@/components/admin/CreateOrderDialog';
import { BulkOrderDialog } from '@/components/admin/BulkOrderDialog';
import { AdminOrderChatModal } from '@/components/admin/AdminOrderChatModal';
import { OrderStatusProgress } from '@/components/order/OrderStatusProgress';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { useOrderStatusHistory } from '@/hooks/useOrderStatusHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useOrderRealtimeAdmin } from '@/hooks/useRealtimeSubscription';
import { useOrderUnreadCounts } from '@/hooks/useOrderUnreadCounts';
import { NotificationHistoryPanel } from '@/components/admin/NotificationHistoryPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type OrderStatus = AdminOrder['status'] | 'all';

const statusFilters: { value: OrderStatus; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid by User' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

type DropshipperFilter = 'all' | string;

const statusColors: Record<string, string> = {
  pending_payment: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  paid_by_user: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

const extractObjectPathFromPaymentProofUrl = (urlOrPath: string): string | null => {
  if (!urlOrPath) return null;
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath;

  try {
    const url = new URL(urlOrPath);
    const marker = `/${PAYMENT_PROOF_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

const getProofFilename = (urlOrPath: string): string => {
  try {
    if (/^https?:\/\//i.test(urlOrPath)) {
      const url = new URL(urlOrPath);
      return decodeURIComponent(url.pathname.split('/').pop() || 'payment-proof');
    }
  } catch {
    // ignore
  }

  return decodeURIComponent(urlOrPath.split('/').pop() || 'payment-proof');
};

const AdminOrders: React.FC = () => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [dropshipperFilter, setDropshipperFilter] = useState<DropshipperFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentLinkDialogOpen, setIsPaymentLinkDialogOpen] = useState(false);
  const [isBulkPaymentLinkDialogOpen, setIsBulkPaymentLinkDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isBulkOrderDialogOpen, setIsBulkOrderDialogOpen] = useState(false);
  const [paymentLinkInput, setPaymentLinkInput] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [chatOrder, setChatOrder] = useState<AdminOrder | null>(null);
  const [isProofPreviewOpen, setIsProofPreviewOpen] = useState(false);

  const [proofObjectPath, setProofObjectPath] = useState<string | null>(null);
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [isProofUrlLoading, setIsProofUrlLoading] = useState(false);
  const [isProofDownloading, setIsProofDownloading] = useState(false);
  
  const { 
    orders, 
    orderCounts, 
    isLoading, 
    updateStatus,
    isUpdatingStatus,
    updatePaymentLink,
    isUpdatingPaymentLink,
    bulkUpdatePaymentLink,
    isBulkUpdatingPaymentLink,
    createOrder,
    isCreatingOrder,
    bulkCreateOrders,
    isBulkCreatingOrders,
  } = useAdminOrders();

  // Enable real-time updates
  useOrderRealtimeAdmin();
  
  // Order status history for timeline
  const { history: statusHistory } = useOrderStatusHistory(selectedOrder?.id);
  
  // Unread message counts
  const { getUnreadCount } = useOrderUnreadCounts();

  const proofFileName = selectedOrder?.payment_proof_url
    ? getProofFilename(selectedOrder.payment_proof_url)
    : null;

  const isProofImage = !!proofFileName && /\.(jpg|jpeg|png|webp|gif)$/i.test(proofFileName);

  useEffect(() => {
    const proofUrl = selectedOrder?.payment_proof_url;

    if (!isViewDialogOpen || !proofUrl) {
      setProofObjectPath(null);
      setProofSignedUrl(null);
      setIsProofUrlLoading(false);
      return;
    }

    const objectPath = extractObjectPathFromPaymentProofUrl(proofUrl);
    setProofObjectPath(objectPath);
    setProofSignedUrl(null);

    if (!objectPath) return;

    let cancelled = false;
    setIsProofUrlLoading(true);

    (async () => {
      const { data, error } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .createSignedUrl(objectPath, 60 * 10);

      if (cancelled) return;
      if (error) throw error;

      setProofSignedUrl(data?.signedUrl ?? null);
    })()
      .catch((err) => {
        console.error('Failed to create signed proof URL:', err);
        setProofSignedUrl(null);
        toast({
          title: 'Proof unavailable',
          description: 'Could not generate a secure link for the payment proof.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (!cancelled) setIsProofUrlLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isViewDialogOpen, selectedOrder?.payment_proof_url, toast]);

  const handleDownloadProof = async () => {
    const proofUrl = selectedOrder?.payment_proof_url;
    if (!proofUrl) return;

    const objectPath = proofObjectPath ?? extractObjectPathFromPaymentProofUrl(proofUrl);

    if (!objectPath) {
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setIsProofDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .download(objectPath);

      if (error) throw error;

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = getProofFilename(proofUrl);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Proof download failed:', err);
      toast({
        title: 'Download failed',
        description: 'Could not download the payment proof.',
        variant: 'destructive',
      });
    } finally {
      setIsProofDownloading(false);
    }
  };

  // Get unique dropshippers for filter dropdown
  const uniqueDropshippers = React.useMemo(() => {
    const dropshipperMap = new Map<string, { id: string; name: string }>();
    orders.forEach(order => {
      if (order.dropshipper && !dropshipperMap.has(order.dropshipper.id)) {
        dropshipperMap.set(order.dropshipper.id, { 
          id: order.dropshipper.id, 
          name: order.dropshipper.name 
        });
      }
    });
    return Array.from(dropshipperMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.dropshipper?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDropshipper = dropshipperFilter === 'all' || order.dropshipper?.id === dropshipperFilter;
    
    return matchesSearch && matchesStatus && matchesDropshipper;
  });

  const handleViewOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: AdminOrder['status'], order?: AdminOrder) => {
    updateStatus({ orderId, status: newStatus, order });
  };

  const handleOpenPaymentLinkDialog = (order: AdminOrder) => {
    setSelectedOrder(order);
    setPaymentLinkInput(order.payment_link || '');
    setIsPaymentLinkDialogOpen(true);
  };

  const handleSavePaymentLink = () => {
    if (!selectedOrder) return;
    updatePaymentLink({ orderId: selectedOrder.id, paymentLink: paymentLinkInput });
    setIsPaymentLinkDialogOpen(false);
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleOpenBulkPaymentLinkDialog = () => {
    setPaymentLinkInput('');
    setIsBulkPaymentLinkDialogOpen(true);
  };

  const handleSaveBulkPaymentLink = () => {
    bulkUpdatePaymentLink({ orderIds: selectedOrderIds, paymentLink: paymentLinkInput });
    setIsBulkPaymentLinkDialogOpen(false);
    setSelectedOrderIds([]);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full rounded-xl" />
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
            <h1 className="text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage all orders across dropshippers. {orders.length} orders total.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <NotificationHistoryPanel
              onOpenChat={(orderId, orderNumber) => {
                const order = orders.find(o => o.id === orderId);
                if (order) setChatOrder(order);
              }}
            />
            <Button onClick={() => setIsCreateOrderDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Order
            </Button>
            <Button onClick={() => setIsBulkOrderDialogOpen(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Create
            </Button>
            {selectedOrderIds.length > 0 && (
              <Button onClick={handleOpenBulkPaymentLinkDialog} variant="outline" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                Set Payment Link ({selectedOrderIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* Create Order Dialog */}
        <CreateOrderDialog
          open={isCreateOrderDialogOpen}
          onOpenChange={setIsCreateOrderDialogOpen}
          onCreateOrder={(data) => {
            createOrder(data);
            setIsCreateOrderDialogOpen(false);
          }}
          isCreating={isCreatingOrder}
        />

        {/* Bulk Order Dialog */}
        <BulkOrderDialog
          open={isBulkOrderDialogOpen}
          onOpenChange={setIsBulkOrderDialogOpen}
          onCreateOrders={(data) => {
            bulkCreateOrders(data);
            setIsBulkOrderDialogOpen(false);
          }}
          isCreating={isBulkCreatingOrders}
        />

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
          
          {/* Dropshipper Filter */}
          <Select
            value={dropshipperFilter}
            onValueChange={(value) => setDropshipperFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Dropshippers" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dropshippers</SelectItem>
              {uniqueDropshippers.map(dropshipper => (
                <SelectItem key={dropshipper.id} value={dropshipper.id}>
                  {dropshipper.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                  {orderCounts[filter.value as keyof typeof orderCounts] || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="dashboard-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Dropshipper</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedOrderIds.includes(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.product?.image_url ? (
                        <img 
                          src={order.product.image_url} 
                          alt={order.product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate max-w-[120px]">{order.product?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[100px] block">{order.dropshipper?.name}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">${(order.selling_price * order.quantity).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value as AdminOrder['status'], order)}
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger className={cn("w-[140px] h-8 text-xs border", statusColors[order.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                        <SelectItem value="paid_by_user">Paid by User</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order.payment_link ? (
                        <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <LinkIcon className="w-3 h-3" /> Link Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          No Link
                        </Badge>
                      )}
                      {order.payment_link_clicked_at && (
                        <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                          <MousePointerClick className="w-3 h-3" />
                          Clicked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setChatOrder(order)}
                        title="Chat as Customer"
                        className="relative"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        {getUnreadCount(order.id) > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {getUnreadCount(order.id) > 9 ? '9+' : getUnreadCount(order.id)}
                          </span>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenPaymentLinkDialog(order)}
                        title="Set Payment Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(order.id, 'completed', order)}
                          disabled={isUpdatingStatus}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredOrders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        )}

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order {selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Status Progress */}
                <OrderStatusProgress status={selectedOrder.status} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer
                    </p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </p>
                    <p className="font-medium">{selectedOrder.customer_email}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Address
                    </p>
                    <p className="font-medium">{selectedOrder.customer_address}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-4">
                    {selectedOrder.product?.image_url ? (
                      <img 
                        src={selectedOrder.product.image_url} 
                        alt={selectedOrder.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{selectedOrder.product?.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {selectedOrder.quantity}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Selling Price
                    </p>
                    <p className="font-semibold">${selectedOrder.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Base Price</p>
                    <p className="font-medium">${selectedOrder.base_price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-medium text-emerald-600">
                      ${((selectedOrder.selling_price - selectedOrder.base_price) * selectedOrder.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Dropshipper</p>
                    <p className="font-medium">{selectedOrder.dropshipper?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.dropshipper?.storefront_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Created
                    </p>
                    <p className="font-medium">
                      {format(new Date(selectedOrder.created_at), 'PPp')}
                    </p>
                  </div>
                </div>

                {/* Payment Link Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" /> Payment Link
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenPaymentLinkDialog(selectedOrder)}
                    >
                      {selectedOrder.payment_link ? 'Edit' : 'Add'} Link
                    </Button>
                  </div>
                  {selectedOrder.payment_link ? (
                    <a 
                      href={selectedOrder.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                    >
                      {selectedOrder.payment_link}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No payment link set</p>
                  )}
                  {selectedOrder.payment_link_clicked_at && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-500/10 p-2 rounded-lg">
                      <MousePointerClick className="w-4 h-4" />
                      Link clicked at {format(new Date(selectedOrder.payment_link_clicked_at), 'PPp')}
                    </div>
                  )}
                </div>

                {/* Payment Proof Section */}
                {selectedOrder.payment_proof_url && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileCheck className="w-4 h-4" /> Payment Proof
                      </p>
                      <div className="flex items-center gap-2">
                        {isProofImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsProofPreviewOpen(true)}
                            className="gap-1 text-primary"
                            disabled={isProofUrlLoading && !proofSignedUrl}
                          >
                            {isProofUrlLoading && !proofSignedUrl ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                            Zoom
                          </Button>
                        )}

                        {!isProofImage && proofSignedUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(proofSignedUrl, '_blank', 'noopener,noreferrer')}
                            className="gap-1 text-primary"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadProof}
                          disabled={isProofDownloading || isProofUrlLoading}
                          className="gap-1 text-primary"
                        >
                          {isProofDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Download
                        </Button>
                      </div>
                    </div>

                    {isProofImage ? (
                      <div
                        className="relative rounded-lg overflow-hidden border bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setIsProofPreviewOpen(true)}
                      >
                        {isProofUrlLoading && !proofSignedUrl ? (
                          <div className="p-8 flex items-center justify-center text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : proofSignedUrl ? (
                          <img
                            src={proofSignedUrl}
                            alt="Payment proof"
                            className="max-h-64 w-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Secure proof link unavailable. Click Download to view.</p>
                          </div>
                        )}
                        <div className="hidden p-4 text-center text-muted-foreground">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Image failed to load. Click Download to view.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border bg-muted/30 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{proofFileName || 'Payment Proof Document'}</p>
                          <p className="text-xs text-muted-foreground">Use Download to save the file.</p>
                        </div>
                        {proofSignedUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(proofSignedUrl, '_blank', 'noopener,noreferrer')}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Timeline */}
                {statusHistory.length > 0 && (
                  <div className="border-t pt-4">
                    <OrderTimeline history={statusHistory} />
                  </div>
                )}

                <div className="flex justify-between items-center border-t pt-4">
                  <Badge className={cn("border", statusColors[selectedOrder.status])}>
                    {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <Button 
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, 'completed', selectedOrder);
                        setIsViewDialogOpen(false);
                      }}
                      disabled={isUpdatingStatus}
                      className="gap-2"
                    >
                      {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                      Mark as Completed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Link Dialog */}
        <Dialog open={isPaymentLinkDialogOpen} onOpenChange={setIsPaymentLinkDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Set Payment Link</DialogTitle>
              <DialogDescription>
                Add a payment link for order {selectedOrder?.order_number}. Users will use this link to make payments.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentLink">Payment Link URL</Label>
                <Input
                  id="paymentLink"
                  type="url"
                  placeholder="https://pay.example.com/..."
                  value={paymentLinkInput}
                  onChange={(e) => setPaymentLinkInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full URL including https://
                </p>
              </div>
              {selectedOrder?.payment_link && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-muted-foreground mb-1">Current link:</p>
                  <a 
                    href={selectedOrder.payment_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    {selectedOrder.payment_link}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSavePaymentLink}
                disabled={isUpdatingPaymentLink}
                className="gap-2"
              >
                {isUpdatingPaymentLink && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Payment Link Dialog */}
        <Dialog open={isBulkPaymentLinkDialogOpen} onOpenChange={setIsBulkPaymentLinkDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Set Payment Link for Multiple Orders</DialogTitle>
              <DialogDescription>
                This link will be applied to {selectedOrderIds.length} selected order(s).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkPaymentLink">Payment Link URL</Label>
                <Input
                  id="bulkPaymentLink"
                  type="url"
                  placeholder="https://pay.example.com/..."
                  value={paymentLinkInput}
                  onChange={(e) => setPaymentLinkInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full URL including https://
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                <p>This will overwrite any existing payment links for the selected orders.</p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsBulkPaymentLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveBulkPaymentLink}
                disabled={isBulkUpdatingPaymentLink || !paymentLinkInput.trim()}
                className="gap-2"
              >
                {isBulkUpdatingPaymentLink && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply to {selectedOrderIds.length} Orders
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Order Chat Modal */}
        {chatOrder && (
          <AdminOrderChatModal
            isOpen={!!chatOrder}
            onClose={() => setChatOrder(null)}
            orderId={chatOrder.id}
            orderNumber={chatOrder.order_number}
            dropshipperName={chatOrder.dropshipper?.name || 'Unknown'}
          />
        )}

        {/* Payment Proof Preview Modal */}
        <Dialog open={isProofPreviewOpen} onOpenChange={setIsProofPreviewOpen}>
          <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-2 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Payment Proof Preview</DialogTitle>
            </DialogHeader>
            <div className="relative max-h-[85vh] overflow-auto">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
                onClick={() => setIsProofPreviewOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>

              {isProofImage ? (
                proofSignedUrl ? (
                  <img
                    src={proofSignedUrl}
                    alt="Payment proof"
                    className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="p-10 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )
              ) : (
                <div className="p-6 space-y-3">
                  <p className="text-sm text-muted-foreground">Preview is not available for this file type.</p>
                  <div className="flex gap-2">
                    {proofSignedUrl && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(proofSignedUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Open
                      </Button>
                    )}
                    <Button onClick={handleDownloadProof} disabled={isProofDownloading} className="gap-2">
                      {isProofDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;