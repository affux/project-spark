import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  BarChart3,
  Award,
  Target,
} from 'lucide-react';
import { useMyProofStats, useMyProofTrends } from '@/hooks/useProofAnalytics';
import { format } from 'date-fns';

export const UserProofAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange, 10);

  const { data: stats, isLoading: isLoadingStats } = useMyProofStats();
  const { data: trends, isLoading: isLoadingTrends } = useMyProofTrends(days);

  const formatDateLabel = (date: string) => {
    return format(new Date(date), 'MMM d');
  };

  // Calculate streak (consecutive days with submissions)
  const calculateStreak = () => {
    if (!trends || trends.length === 0) return 0;
    let streak = 0;
    const reversedTrends = [...trends].reverse();
    for (const day of reversedTrends) {
      if (day.total > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">My Analytics</h2>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-warning">{stats?.pending || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">
                  {stats?.approvalRate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Of reviewed submissions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{streak} days</div>
                <p className="text-xs text-muted-foreground">Consecutive submissions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span>Pending</span>
                    </div>
                    <span className="font-medium">{stats?.pending || 0}</span>
                  </div>
                  <Progress
                    value={stats?.total ? (stats.pending / stats.total) * 100 : 0}
                    className="h-2 bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Approved</span>
                    </div>
                    <span className="font-medium">{stats?.approved || 0}</span>
                  </div>
                  <Progress
                    value={stats?.total ? (stats.approved / stats.total) * 100 : 0}
                    className="h-2 bg-muted [&>div]:bg-success"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span>Rejected</span>
                    </div>
                    <span className="font-medium">{stats?.rejected || 0}</span>
                  </div>
                  <Progress
                    value={stats?.total ? (stats.rejected / stats.total) * 100 : 0}
                    className="h-2 bg-muted [&>div]:bg-destructive"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Review Time</span>
                    <span className="font-semibold">
                      {stats?.avgReviewTime ? `${stats.avgReviewTime.toFixed(1)} hours` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-success">
                        {stats?.approvalRate.toFixed(0) || 0}%
                      </span>
                      {stats && stats.approvalRate >= 80 && (
                        <Award className="w-4 h-4 text-warning" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reviewed</span>
                    <span className="font-semibold">
                      {(stats?.approved || 0) + (stats?.rejected || 0)} / {stats?.total || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Submission Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTrends ? (
            <Skeleton className="h-[250px] w-full" />
          ) : trends && trends.some((t) => t.total > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  stackId="1"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success) / 0.5)"
                  name="Approved"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stackId="1"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.5)"
                  name="Rejected"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stackId="1"
                  stroke="hsl(var(--warning))"
                  fill="hsl(var(--warning) / 0.5)"
                  name="Pending"
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No submissions in this period</p>
                <p className="text-sm">Start submitting proofs to see your trends!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
