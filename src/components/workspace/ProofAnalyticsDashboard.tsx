import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileCheck,
  BarChart3,
  Trophy,
  Download,
  FileText,
  FileSpreadsheet,
  Briefcase,
} from 'lucide-react';
import { useProofAnalytics, useProofStats, useTopContributors, TopContributor, ProofTrendData, ProofStats } from '@/hooks/useProofAnalytics';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/exportUtils';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { WorkTypeAnalytics } from './WorkTypeAnalytics';

const COLORS = {
  pending: 'hsl(var(--warning))',
  approved: 'hsl(var(--success))',
  rejected: 'hsl(var(--destructive))',
};

const PIE_COLORS = ['hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

// Export utilities
const exportTrendsToCSV = (trends: ProofTrendData[]) => {
  const data = trends.map((t) => ({
    Date: format(new Date(t.date), 'MMM d, yyyy'),
    Pending: t.pending,
    Approved: t.approved,
    Rejected: t.rejected,
    Total: t.total,
  }));
  downloadCSV(data, `proof-trends-${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success('Trends exported to CSV');
};

const exportContributorsToCSV = (contributors: TopContributor[]) => {
  const data = contributors.map((c, i) => ({
    Rank: i + 1,
    Name: c.user_name,
    Email: c.user_email,
    'Total Submissions': c.total_submissions,
    'Approved Count': c.approved_count,
    'Approval Rate (%)': c.approval_rate.toFixed(1),
  }));
  downloadCSV(data, `top-contributors-${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success('Contributors exported to CSV');
};

const exportToPDF = (
  stats: ProofStats | undefined,
  trends: ProofTrendData[] | undefined,
  contributors: TopContributor[] | undefined,
  dateRange: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Proof of Work Analytics Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Period: Last ${dateRange} days`, pageWidth / 2, yPos + 5, { align: 'center' });
  yPos += 20;

  // Stats Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (stats) {
    const statsData = [
      ['Total Submissions', stats.total.toString()],
      ['Pending Review', stats.pending.toString()],
      ['Approved', stats.approved.toString()],
      ['Rejected', stats.rejected.toString()],
      ['Approval Rate', `${stats.approvalRate.toFixed(1)}%`],
      ['Avg Review Time', stats.avgReviewTime ? `${stats.avgReviewTime.toFixed(1)} hours` : 'N/A'],
    ];

    statsData.forEach(([label, value]) => {
      doc.text(`${label}:`, 14, yPos);
      doc.text(value, 70, yPos);
      yPos += 6;
    });
  }
  yPos += 10;

  // Top Contributors
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Contributors', 14, yPos);
  yPos += 8;

  if (contributors && contributors.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 14, yPos);
    doc.text('Name', 24, yPos);
    doc.text('Submissions', 100, yPos);
    doc.text('Approved', 130, yPos);
    doc.text('Rate', 160, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    contributors.slice(0, 10).forEach((c, i) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text((i + 1).toString(), 14, yPos);
      doc.text(c.user_name.substring(0, 30), 24, yPos);
      doc.text(c.total_submissions.toString(), 100, yPos);
      doc.text(c.approved_count.toString(), 130, yPos);
      doc.text(`${c.approval_rate.toFixed(0)}%`, 160, yPos);
      yPos += 5;
    });
  } else {
    doc.setFontSize(10);
    doc.text('No contributors data available', 14, yPos);
  }
  yPos += 10;

  // Trends Summary
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Trends (Last 7 Days)', 14, yPos);
  yPos += 8;

  if (trends && trends.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 14, yPos);
    doc.text('Pending', 60, yPos);
    doc.text('Approved', 90, yPos);
    doc.text('Rejected', 120, yPos);
    doc.text('Total', 150, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    trends.slice(-7).forEach((t) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(format(new Date(t.date), 'MMM d'), 14, yPos);
      doc.text(t.pending.toString(), 60, yPos);
      doc.text(t.approved.toString(), 90, yPos);
      doc.text(t.rejected.toString(), 120, yPos);
      doc.text(t.total.toString(), 150, yPos);
      yPos += 5;
    });
  }

  // Save
  doc.save(`proof-analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  toast.success('PDF report downloaded');
};

export const ProofAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange, 10);
  
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useProofAnalytics(days);
  const { data: stats, isLoading: isLoadingStats } = useProofStats();
  const { data: topContributors, isLoading: isLoadingContributors } = useTopContributors(10);

  const pieData = stats
    ? [
        { name: 'Pending', value: stats.pending, color: PIE_COLORS[0] },
        { name: 'Approved', value: stats.approved, color: PIE_COLORS[1] },
        { name: 'Rejected', value: stats.rejected, color: PIE_COLORS[2] },
      ].filter((d) => d.value > 0)
    : [];

  const formatDateLabel = (date: string) => {
    return format(new Date(date), 'MMM d');
  };

  const isExportDisabled = isLoadingStats || isLoadingAnalytics || isLoadingContributors;

  return (
    <div className="space-y-6">
      {/* Date Range Filter & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
        </div>
        <div className="flex items-center gap-2">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExportDisabled}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportToPDF(stats, analyticsData?.trends, topContributors, dateRange)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Download PDF Report
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => analyticsData?.trends && exportTrendsToCSV(analyticsData.trends)}
                disabled={!analyticsData?.trends}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Trends (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => topContributors && exportContributorsToCSV(topContributors)}
                disabled={!topContributors || topContributors.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Contributors (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                <p className="text-xs text-muted-foreground">All time submissions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
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
                  {stats?.approvalRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Of reviewed submissions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.avgReviewTime ? `${stats.avgReviewTime.toFixed(1)}h` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Average time to review</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="workTypes" className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            Work Types
          </TabsTrigger>
        </TabsList>

        {/* Submission Trends */}
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.trends || []}>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Distribution */}
        <TabsContent value="distribution" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-warning" />
                        <span className="font-medium">Pending</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats?.total ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-success/10">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="font-medium">Approved</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stats?.approved || 0}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats?.total ? ((stats.approved / stats.total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="font-medium">Rejected</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats?.total ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Contributors */}
        <TabsContent value="contributors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingContributors ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topContributors && topContributors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Submissions</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                      <TableHead className="text-center">Approval Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topContributors.map((contributor, index) => (
                      <TableRow key={contributor.user_id}>
                        <TableCell>
                          {index < 3 ? (
                            <Badge
                              variant="outline"
                              className={
                                index === 0
                                  ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500'
                                  : index === 1
                                  ? 'bg-gray-300/20 text-gray-500 border-gray-400'
                                  : 'bg-amber-600/20 text-amber-700 border-amber-600'
                              }
                            >
                              {index + 1}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contributor.user_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {contributor.user_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {contributor.total_submissions}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-success/10 text-success">
                            {contributor.approved_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success rounded-full"
                                style={{ width: `${contributor.approval_rate}%` }}
                              />
                            </div>
                            <span className="text-sm">
                              {contributor.approval_rate.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No contributors yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Type Analytics */}
        <TabsContent value="workTypes" className="mt-4">
          <WorkTypeAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};
