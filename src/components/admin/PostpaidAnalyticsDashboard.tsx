import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Users,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

interface PostpaidAnalyticsDashboardProps {
  className?: string;
}

export const PostpaidAnalyticsDashboard: React.FC<PostpaidAnalyticsDashboardProps> = ({ className }) => {
  const { user, session } = useAuth();
  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';

  // Fetch postpaid overview stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['postpaid-analytics-stats'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('postpaid_enabled, postpaid_credit_limit, postpaid_used, postpaid_due_cycle');

      if (error) throw error;

      const enabledUsers = profiles?.filter(p => p.postpaid_enabled) || [];
      const usersWithDues = enabledUsers.filter(p => Number(p.postpaid_used) > 0);
      const totalCreditLimit = enabledUsers.reduce((sum, p) => sum + Number(p.postpaid_credit_limit), 0);
      const totalOutstanding = enabledUsers.reduce((sum, p) => sum + Number(p.postpaid_used), 0);
      const totalAvailable = totalCreditLimit - totalOutstanding;
      const utilizationRate = totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0;

      return {
        totalUsers: profiles?.length || 0,
        enabledUsers: enabledUsers.length,
        usersWithDues: usersWithDues.length,
        totalCreditLimit,
        totalOutstanding,
        totalAvailable,
        utilizationRate,
      };
    },
    enabled: !!user && user.role === 'admin' && !!session,
  });

  // Fetch recent transactions for chart
  const { data: transactionData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['postpaid-analytics-transactions'],
    queryFn: async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'MMM dd'),
          start: startOfDay(date).toISOString(),
          end: endOfDay(date).toISOString(),
        };
      });

      const results = await Promise.all(
        last7Days.map(async (day) => {
          const { data: transactions } = await supabase
            .from('postpaid_transactions')
            .select('amount, transaction_type')
            .gte('created_at', day.start)
            .lte('created_at', day.end);

          const creditUsed = (transactions || [])
            .filter(t => t.transaction_type === 'credit_used')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const creditRepaid = (transactions || [])
            .filter(t => t.transaction_type === 'credit_repaid')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          return {
            date: day.date,
            creditUsed,
            creditRepaid,
          };
        })
      );

      return results;
    },
    enabled: !!user && user.role === 'admin' && !!session,
  });

  // Fetch distribution data for pie chart
  const { data: distributionData, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ['postpaid-analytics-distribution'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('postpaid_enabled, postpaid_used, postpaid_credit_limit');

      const enabled = profiles?.filter(p => p.postpaid_enabled) || [];
      
      const noUsage = enabled.filter(p => Number(p.postpaid_used) === 0).length;
      const lowUsage = enabled.filter(p => {
        const usage = Number(p.postpaid_used) / Number(p.postpaid_credit_limit);
        return usage > 0 && usage <= 0.5;
      }).length;
      const mediumUsage = enabled.filter(p => {
        const usage = Number(p.postpaid_used) / Number(p.postpaid_credit_limit);
        return usage > 0.5 && usage <= 0.8;
      }).length;
      const highUsage = enabled.filter(p => {
        const usage = Number(p.postpaid_used) / Number(p.postpaid_credit_limit);
        return usage > 0.8;
      }).length;

      return [
        { name: 'No Usage', value: noUsage },
        { name: 'Low (1-50%)', value: lowUsage },
        { name: 'Medium (51-80%)', value: mediumUsage },
        { name: 'High (81-100%)', value: highUsage },
      ].filter(d => d.value > 0);
    },
    enabled: !!user && user.role === 'admin' && !!session,
  });

  if (isLoadingStats || isLoadingTransactions || isLoadingDistribution) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Postpaid Credit Analytics
            </CardTitle>
            <CardDescription>
              Track credit usage trends and outstanding balances
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-primary border-primary/50">
            {stats?.enabledUsers || 0} Active Users
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Credit Limit</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {currencySymbol}{(stats?.totalCreditLimit || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Outstanding Dues</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {currencySymbol}{(stats?.totalOutstanding || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.usersWithDues || 0} users with dues
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Available Credit</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {currencySymbol}{(stats?.totalAvailable || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Utilization Rate</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {(stats?.utilizationRate || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Trend */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-4">7-Day Transaction Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={transactionData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, '']}
                />
                <Bar dataKey="creditUsed" name="Credit Used" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="creditRepaid" name="Credit Repaid" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-muted-foreground">Credit Used</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">Credit Repaid</span>
              </div>
            </div>
          </div>

          {/* Usage Distribution */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-4">Credit Usage Distribution</h3>
            {distributionData && distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No postpaid users yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
