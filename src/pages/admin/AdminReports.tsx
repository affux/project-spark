import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Loader2,
  FileText
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAdminReports } from '@/hooks/useAdminReports';
import { downloadCSV } from '@/lib/exportUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const AdminReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const { 
    orders,
    stats, 
    dropshipperPerformance,
    productPerformance,
    isLoading 
  } = useAdminReports(dateRange?.from || null, dateRange?.to || null);

  const handleExportOrders = () => {
    const data = orders.map(order => ({
      'Order Number': order.order_number,
      'Customer': order.customer_name,
      'Email': order.customer_email,
      'Product': order.product_name || 'N/A',
      'Dropshipper': order.dropshipper_name || 'N/A',
      'Quantity': order.quantity,
      'Revenue': (order.selling_price * order.quantity).toFixed(2),
      'Profit': ((order.selling_price - order.base_price) * order.quantity).toFixed(2),
      'Status': order.status.replace(/_/g, ' '),
      'Date': format(new Date(order.created_at), 'yyyy-MM-dd'),
    }));
    downloadCSV(data, `orders-report-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportDropshippers = () => {
    const data = dropshipperPerformance.map(a => ({
      'Dropshipper': a.name,
      'Total Orders': a.totalOrders,
      'Total Revenue': a.totalRevenue.toFixed(2),
      'Total Profit': a.totalProfit.toFixed(2),
      'Completed Orders': a.completedOrders,
      'Completion Rate': a.totalOrders > 0 
        ? ((a.completedOrders / a.totalOrders) * 100).toFixed(1) + '%'
        : '0%',
    }));
    downloadCSV(data, `dropshipper-performance-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportProducts = () => {
    const data = productPerformance.map(p => ({
      'Product': p.name,
      'Units Sold': p.totalSold,
      'Total Orders': p.totalOrders,
      'Total Revenue': p.totalRevenue.toFixed(2),
    }));
    downloadCSV(data, `product-performance-${format(new Date(), 'yyyy-MM-dd')}`);
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
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analyze performance and download reports.
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Select date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-foreground">${stats.averageOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Summary */}
        <div className="flex gap-4 flex-wrap">
          <Badge variant="secondary" className="py-2 px-4 text-sm">
            Completed: {stats.completedOrders}
          </Badge>
          <Badge variant="secondary" className="py-2 px-4 text-sm bg-amber-500/10 text-amber-600">
            Pending: {stats.pendingOrders}
          </Badge>
          <Badge variant="secondary" className="py-2 px-4 text-sm bg-red-500/10 text-red-600">
            Cancelled: {stats.cancelledOrders}
          </Badge>
        </div>

        {/* Dropshipper Performance */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Dropshipper Performance</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportDropshippers} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dropshipper</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dropshipperPerformance.slice(0, 10).map((dropshipper) => (
                <TableRow key={dropshipper.user_id}>
                  <TableCell className="font-medium">{dropshipper.name}</TableCell>
                  <TableCell className="text-right">{dropshipper.totalOrders}</TableCell>
                  <TableCell className="text-right">${dropshipper.totalRevenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    ${dropshipper.totalProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {dropshipper.totalOrders > 0 
                        ? ((dropshipper.completedOrders / dropshipper.totalOrders) * 100).toFixed(0)
                        : 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {dropshipperPerformance.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No dropshipper data for selected period.
            </div>
          )}
        </div>

        {/* Product Performance */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Product Performance</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportProducts} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productPerformance.slice(0, 10).map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{product.totalSold}</TableCell>
                  <TableCell className="text-right">{product.totalOrders}</TableCell>
                  <TableCell className="text-right">${product.totalRevenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {productPerformance.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No product data for selected period.
            </div>
          )}
        </div>

        {/* Export All Orders */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Export Full Report</h2>
              <p className="text-sm text-muted-foreground">
                Download all {orders.length} orders for the selected period.
              </p>
            </div>
            <Button onClick={handleExportOrders} className="gap-2">
              <Download className="w-4 h-4" />
              Export Orders CSV
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
