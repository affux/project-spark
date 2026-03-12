import React, { useState } from 'react';
import { DashboardOrder } from '@/hooks/useUserDashboard';
import { AdminOrder } from '@/hooks/useAdminDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, CheckCircle, CreditCard, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { maskEmail, maskPhoneNumber } from '@/lib/maskingUtils';
import { OrderChatModal } from '@/components/order/OrderChatModal';

type OrderType = DashboardOrder | AdminOrder;

interface OrdersTableNewProps {
  orders: OrderType[];
  userRole: 'admin' | 'user';
  onViewOrder?: (order: OrderType) => void;
  onPayOrder?: (order: OrderType) => void;
  onCompleteOrder?: (order: OrderType) => void;
  onOpenChat?: (order: OrderType) => void;
}

const statusVariants: Record<string, 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled'> = {
  pending_payment: 'pending',
  paid_by_user: 'paid',
  processing: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
  postpaid_pending: 'paid',
};

const statusLabels: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid_by_user: 'Paid by User',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  postpaid_pending: 'Paid by User (Postpaid)',
};

export const OrdersTableNew: React.FC<OrdersTableNewProps> = ({
  orders,
  userRole,
  onViewOrder,
  onPayOrder,
  onCompleteOrder,
  onOpenChat,
}) => {
  const [chatOrder, setChatOrder] = useState<OrderType | null>(null);
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No orders found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold text-foreground">Order ID</TableHead>
            <TableHead className="font-semibold text-foreground">Product</TableHead>
            <TableHead className="font-semibold text-foreground">Qty</TableHead>
            {userRole === 'admin' && <TableHead className="font-semibold text-foreground">Dropshipper</TableHead>}
            <TableHead className="font-semibold text-foreground">Customer</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
            <TableHead className="font-semibold text-foreground">Status & Time</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-primary">{order.order_number}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {order.product?.image_url ? (
                    <img 
                      src={order.product.image_url} 
                      alt={order.product.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                  <span className="font-medium text-foreground truncate max-w-[150px]">
                    {order.product?.name || 'Unknown Product'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-medium text-foreground">{order.quantity}</TableCell>
              {userRole === 'admin' && (
                <TableCell className="text-muted-foreground">
                  {(order as AdminOrder).dropshipper?.name || 'Unknown'}
                </TableCell>
              )}
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {userRole === 'user' ? maskEmail(order.customer_email) : order.customer_email}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div>
                  <p className="font-semibold text-foreground">${(order.selling_price * order.quantity).toFixed(2)}</p>
                  {userRole === 'admin' && (
                    <p className="text-xs text-muted-foreground">
                      Base: ${(order.base_price * order.quantity).toFixed(2)}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={statusVariants[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {userRole === 'user' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setChatOrder(order)}
                      className="h-8 w-8"
                      title="Chat with customer"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewOrder?.(order)}
                    className="h-8 w-8"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {userRole === 'user' && order.status === 'pending_payment' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onPayOrder?.(order)}
                      className="gap-1"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay
                    </Button>
                  )}
                  {userRole === 'admin' && order.status === 'paid_by_user' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onCompleteOrder?.(order)}
                      className="gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Fulfill
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Order Chat Modal */}
      {chatOrder && (
        <OrderChatModal
          isOpen={!!chatOrder}
          onClose={() => setChatOrder(null)}
          orderId={chatOrder.id}
          orderNumber={chatOrder.order_number}
        />
      )}
    </div>
  );
};
