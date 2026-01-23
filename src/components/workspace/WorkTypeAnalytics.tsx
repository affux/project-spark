import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  CalendarIcon,
  Filter,
  Download,
  FileSpreadsheet,
  Users,
  Briefcase,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useWorkTypeAnalytics, useAllUsersForFilter, useAllWorkTitlesForFilter } from '@/hooks/useWorkTypeAnalytics';
import { format, subDays } from 'date-fns';
import { downloadCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(217, 91%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(160, 60%, 45%)',
  'hsl(35, 85%, 55%)',
];

export const WorkTypeAnalytics: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWorkTitle, setSelectedWorkTitle] = useState<string>('all');
  const [productLinkFilter, setProductLinkFilter] = useState<string>('all');

  const { data: allUsers } = useAllUsersForFilter();
  const { data: allWorkTitles } = useAllWorkTitlesForFilter();

  const { data, isLoading, refetch } = useWorkTypeAnalytics({
    startDate: startDate || null,
    endDate: endDate || null,
    userId: selectedUser !== 'all' ? selectedUser : null,
    status: selectedStatus !== 'all' ? selectedStatus : null,
    workTitle: selectedWorkTitle !== 'all' ? selectedWorkTitle : null,
    hasProductLink: productLinkFilter === 'with' ? true : productLinkFilter === 'without' ? false : null,
  });

  const clearFilters = () => {
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    setSelectedUser('all');
    setSelectedStatus('all');
    setSelectedWorkTitle('all');
    setProductLinkFilter('all');
  };

  const hasActiveFilters = selectedUser !== 'all' || selectedStatus !== 'all' || selectedWorkTitle !== 'all' || productLinkFilter !== 'all';

  // Prepare pie chart data
  const pieData = useMemo(() => {
    if (!data?.usageStats) return [];
    return data.usageStats.slice(0, 8).map((stat, index) => ({
      name: stat.work_title.length > 15 
        ? stat.work_title.substring(0, 15) + '...' 
        : stat.work_title,
      fullName: stat.work_title,
      value: stat.total_count,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [data?.usageStats]);

  // Prepare bar chart data
  const barData = useMemo(() => {
    if (!data?.usageStats) return [];
    return data.usageStats.slice(0, 10).map((stat) => ({
      name: stat.work_title.length > 12 
        ? stat.work_title.substring(0, 12) + '...' 
        : stat.work_title,
      fullName: stat.work_title,
      approved: stat.approved_count,
      pending: stat.pending_count,
      rejected: stat.rejected_count,
    }));
  }, [data?.usageStats]);

  const exportUsageToCSV = () => {
    if (!data?.usageStats) return;
    const csvData = data.usageStats.map((s) => ({
      'Work Type': s.work_title,
      'Total Submissions': s.total_count,
      'Approved': s.approved_count,
      'Pending': s.pending_count,
      'Rejected': s.rejected_count,
      'Approval Rate (%)': s.approval_rate.toFixed(1),
      'Unique Users': s.unique_users,
    }));
    downloadCSV(csvData, `work-type-usage-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Work type usage exported to CSV');
  };

  const exportUserBreakdownToCSV = () => {
    if (!data?.userBreakdown) return;
    const csvData = data.userBreakdown.map((s) => ({
      'User Name': s.user_name,
      'User Email': s.user_email,
      'Work Type': s.work_title,
      'Total Submissions': s.submission_count,
      'Approved': s.approved_count,
      'Pending': s.pending_count,
      'Rejected': s.rejected_count,
    }));
    downloadCSV(csvData, `user-work-type-breakdown-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('User breakdown exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportUsageToCSV} disabled={!data?.usageStats?.length}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Usage Stats (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportUserBreakdownToCSV} disabled={!data?.userBreakdown?.length}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export User Breakdown (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {allUsers?.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Work Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Work Type</label>
              <Select value={selectedWorkTitle} onValueChange={setSelectedWorkTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {allWorkTitles?.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Link Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                Product Link
              </label>
              <Select value={productLinkFilter} onValueChange={setProductLinkFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="with">With Product Link</SelectItem>
                  <SelectItem value="without">Without Product Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Types</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.usageStats?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Unique work types used</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.totalProofs || 0}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.allUsers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">With submissions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-lg font-bold truncate">
                  {data?.usageStats?.[0]?.work_title || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.usageStats?.[0]?.total_count || 0} submissions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Type Distribution</CardTitle>
            <CardDescription>Top 8 most used work types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [value, props.payload.fullName]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Status by Work Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status by Work Type</CardTitle>
            <CardDescription>Top 10 work types with status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="approved" name="Approved" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="hsl(var(--warning))" />
                  <Bar dataKey="rejected" name="Rejected" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Work Type Usage Statistics
          </CardTitle>
          <CardDescription>Detailed breakdown of all work types</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.usageStats && data.usageStats.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Type</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                    <TableHead className="text-center">Approval Rate</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.usageStats.map((stat) => (
                    <TableRow key={stat.work_title}>
                      <TableCell className="font-medium">{stat.work_title}</TableCell>
                      <TableCell className="text-center font-bold">{stat.total_count}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-success/10 text-success">
                          {stat.approved_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          {stat.pending_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">
                          {stat.rejected_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${stat.approval_rate}%` }}
                            />
                          </div>
                          <span className="text-sm">{stat.approval_rate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{stat.unique_users}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No work type data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Activity by Work Type
          </CardTitle>
          <CardDescription>Individual user submissions per work type</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.userBreakdown && data.userBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">
                      <CheckCircle className="w-4 h-4 inline text-success" />
                    </TableHead>
                    <TableHead className="text-center">
                      <Clock className="w-4 h-4 inline text-warning" />
                    </TableHead>
                    <TableHead className="text-center">
                      <XCircle className="w-4 h-4 inline text-destructive" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.userBreakdown.slice(0, 20).map((stat, index) => (
                    <TableRow key={`${stat.user_id}-${stat.work_title}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{stat.user_name}</div>
                          <div className="text-xs text-muted-foreground">{stat.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{stat.work_title}</TableCell>
                      <TableCell className="text-center font-bold">{stat.submission_count}</TableCell>
                      <TableCell className="text-center text-success">{stat.approved_count}</TableCell>
                      <TableCell className="text-center text-warning">{stat.pending_count}</TableCell>
                      <TableCell className="text-center text-destructive">{stat.rejected_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.userBreakdown.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing 20 of {data.userBreakdown.length} entries. Export to CSV for full data.
                </p>
              )}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No user activity data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
