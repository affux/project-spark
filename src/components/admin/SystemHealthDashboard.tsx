import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Users, 
  RefreshCw, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  FileText,
  ShoppingCart,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subHours } from 'date-fns';

interface TableStats {
  name: string;
  count: number;
  icon: React.ReactNode;
}

interface StorageBucket {
  name: string;
  fileCount: number;
  isPublic: boolean;
}

interface UserMetrics {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  newThisMonth: number;
  pendingApproval: number;
  disabledUsers: number;
}

interface SystemMetrics {
  tables: TableStats[];
  storage: StorageBucket[];
  users: UserMetrics;
  lastUpdated: Date;
  isHealthy: boolean;
}

export const SystemHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch table counts in parallel
      const [
        profilesResult,
        ordersResult,
        productsResult,
        storefrontProductsResult,
        chatMessagesResult,
        orderChatMessagesResult,
        walletTransactionsResult,
        payoutRequestsResult,
        kycSubmissionsResult,
        proofOfWorkResult,
        cryptoPaymentsResult,
        notificationsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('storefront_products').select('*', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('order_chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('wallet_transactions').select('*', { count: 'exact', head: true }),
        supabase.from('payout_requests').select('*', { count: 'exact', head: true }),
        supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('proof_of_work').select('*', { count: 'exact', head: true }),
        supabase.from('crypto_payments').select('*', { count: 'exact', head: true }),
        supabase.from('user_notifications').select('*', { count: 'exact', head: true })
      ]);

      const tables: TableStats[] = [
        { name: 'Users', count: profilesResult.count || 0, icon: <Users className="h-4 w-4" /> },
        { name: 'Orders', count: ordersResult.count || 0, icon: <ShoppingCart className="h-4 w-4" /> },
        { name: 'Products', count: productsResult.count || 0, icon: <FileText className="h-4 w-4" /> },
        { name: 'Storefront Products', count: storefrontProductsResult.count || 0, icon: <FileText className="h-4 w-4" /> },
        { name: 'Chat Messages', count: chatMessagesResult.count || 0, icon: <MessageSquare className="h-4 w-4" /> },
        { name: 'Order Messages', count: orderChatMessagesResult.count || 0, icon: <MessageSquare className="h-4 w-4" /> },
        { name: 'Wallet Transactions', count: walletTransactionsResult.count || 0, icon: <Wallet className="h-4 w-4" /> },
        { name: 'Payout Requests', count: payoutRequestsResult.count || 0, icon: <Wallet className="h-4 w-4" /> },
        { name: 'KYC Submissions', count: kycSubmissionsResult.count || 0, icon: <FileText className="h-4 w-4" /> },
        { name: 'Proof of Work', count: proofOfWorkResult.count || 0, icon: <FileText className="h-4 w-4" /> },
        { name: 'Crypto Payments', count: cryptoPaymentsResult.count || 0, icon: <Wallet className="h-4 w-4" /> },
        { name: 'Notifications', count: notificationsResult.count || 0, icon: <MessageSquare className="h-4 w-4" /> }
      ];

      // Fetch storage buckets
      const { data: buckets } = await supabase.storage.listBuckets();
      const storageBuckets: StorageBucket[] = [];
      
      if (buckets) {
        for (const bucket of buckets) {
          try {
            const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 });
            storageBuckets.push({
              name: bucket.name,
              fileCount: files?.length || 0,
              isPublic: bucket.public
            });
          } catch {
            storageBuckets.push({
              name: bucket.name,
              fileCount: 0,
              isPublic: bucket.public
            });
          }
        }
      }

      // Fetch user metrics
      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const [
        totalUsersResult,
        activeTodayResult,
        activeWeekResult,
        newMonthResult,
        pendingResult,
        disabledResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('last_login_at', subHours(today, 24).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('last_login_at', weekAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', monthAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('user_status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('user_status', 'disabled')
      ]);

      const userMetrics: UserMetrics = {
        totalUsers: totalUsersResult.count || 0,
        activeToday: activeTodayResult.count || 0,
        activeThisWeek: activeWeekResult.count || 0,
        newThisMonth: newMonthResult.count || 0,
        pendingApproval: pendingResult.count || 0,
        disabledUsers: disabledResult.count || 0
      };

      // Check overall health
      const hasErrors = [
        profilesResult.error,
        ordersResult.error,
        productsResult.error
      ].some(err => err !== null);

      setMetrics({
        tables,
        storage: storageBuckets,
        users: userMetrics,
        lastUpdated: new Date(),
        isHealthy: !hasErrors
      });

      toast.success('System metrics refreshed');
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch system metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const totalRecords = metrics?.tables.reduce((sum, t) => sum + t.count, 0) || 0;
  const totalFiles = metrics?.storage.reduce((sum, b) => sum + b.fileCount, 0) || 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">System Health Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor database, storage, and user activity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics && (
              <Badge variant={metrics.isHealthy ? 'default' : 'destructive'} className="gap-1">
                {metrics.isHealthy ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Healthy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Issues Detected
                  </>
                )}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-primary/10' : ''}
            >
              <Zap className={`h-4 w-4 mr-1 ${autoRefresh ? 'text-primary' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <Database className="h-4 w-4" />
              <span className="text-xs font-medium">Total Records</span>
            </div>
            <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all tables</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-xs font-medium">Storage Files</span>
            </div>
            <p className="text-2xl font-bold">{totalFiles.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.storage.length || 0} buckets
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Active Today</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.users.activeToday || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {metrics?.users.totalUsers || 0} total
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">New This Month</span>
            </div>
            <p className="text-2xl font-bold">{metrics?.users.newThisMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">New registrations</p>
          </div>
        </div>

        {/* User Metrics */}
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">User Activity</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-primary">{metrics?.users.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-green-500">{metrics?.users.activeToday || 0}</p>
              <p className="text-xs text-muted-foreground">Active Today</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-blue-500">{metrics?.users.activeThisWeek || 0}</p>
              <p className="text-xs text-muted-foreground">Active This Week</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-purple-500">{metrics?.users.newThisMonth || 0}</p>
              <p className="text-xs text-muted-foreground">New This Month</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-yellow-500">{metrics?.users.pendingApproval || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-red-500">{metrics?.users.disabledUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Disabled</p>
            </div>
          </div>
          
          {/* Activity Progress */}
          {metrics && metrics.users.totalUsers > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Weekly Active Rate</span>
                <span className="font-medium">
                  {Math.round((metrics.users.activeThisWeek / metrics.users.totalUsers) * 100)}%
                </span>
              </div>
              <Progress 
                value={(metrics.users.activeThisWeek / metrics.users.totalUsers) * 100} 
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Database Tables */}
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Database Tables</h3>
            <Badge variant="secondary" className="ml-auto">
              {metrics?.tables.length || 0} tables
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics?.tables.map((table) => (
              <div 
                key={table.name}
                className="flex items-center justify-between p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">{table.icon}</div>
                  <span className="text-sm font-medium truncate">{table.name}</span>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {table.count.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Buckets */}
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Storage Buckets</h3>
            <Badge variant="secondary" className="ml-auto">
              {metrics?.storage.length || 0} buckets
            </Badge>
          </div>
          {metrics?.storage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No storage buckets configured
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metrics?.storage.map((bucket) => (
                <div 
                  key={bucket.name}
                  className="p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{bucket.name}</span>
                    <Badge variant={bucket.isPublic ? 'default' : 'secondary'} className="text-xs">
                      {bucket.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="text-xs">{bucket.fileCount} files</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Updated */}
        {metrics && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Clock className="h-4 w-4" />
            <span>Last updated: {format(metrics.lastUpdated, 'PPpp')}</span>
            {autoRefresh && (
              <Badge variant="outline" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                Auto-refreshing
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
