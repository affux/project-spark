import React from 'react';
import { Order, OrderStatus } from '@/types';
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
import { Eye, CreditCard, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OrdersTableProps {
  orders: Order[];
  userRole: 'admin' | 'user';
  onViewOrder?: (order: Order) => void;
  onPayOrder?: (order: Order) => void;
  onCompleteOrder?: (order: Order) => void;
}

const statusVariants: Record<OrderStatus, 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled'> = {
  pending_payment: 'pending',
  paid_by_user: 'paid',
  processing: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
  postpaid_pending: 'paid',
};

const statusLabels: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  paid_by_user: 'Paid by User',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  postpaid_pending: 'Paid by User (Postpaid)',
};

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  userRole,
  onViewOrder,
  onPayOrder,
  onCompleteOrder,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Order ID</TableHead>
            <TableHead className="font-semibold">Product</TableHead>
            {userRole === 'admin' && <TableHead className="font-semibold">Dropshipper</TableHead>}
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold text-right">Amount</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-primary">{order.id}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img 
                    src={order.product.image} 
                    alt={order.product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <span className="font-medium truncate max-w-[150px]">{order.product.name}</span>
                </div>
              </TableCell>
              {userRole === 'admin' && (
                <TableCell className="text-muted-foreground">{order.user.name}</TableCell>
              )}
              <TableCell>
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div>
                  <p className="font-semibold">${(order.sellingPrice * order.quantity).toFixed(2)}</p>
                  {userRole === 'admin' && (
                    <p className="text-xs text-muted-foreground">
                      Base: ${(order.basePrice * order.quantity).toFixed(2)}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariants[order.status]}>
                  {statusLabels[order.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
                      variant="accent"
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
                      variant="success"
                      size="sm"
                      onClick={() => onCompleteOrder?.(order)}
                      className="gap-1"
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
    </div>
  );
};
