import React, { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Server,
  Database,
  HardDrive,
  Shield,
  Download,
  Activity
} from 'lucide-react';
import { useDeploymentHealth, HealthCheckResult } from '@/hooks/useDeploymentHealth';
import { format } from 'date-fns';

const StatusIcon = ({ status }: { status: HealthCheckResult['status'] }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
  }
};

const StatusBadge = ({ status }: { status: HealthCheckResult['status'] }) => {
  const variants: Record<HealthCheckResult['status'], string> = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    pending: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const CategoryIcon = ({ category }: { category: HealthCheckResult['category'] }) => {
  switch (category) {
    case 'edge-function':
      return <Server className="h-4 w-4" />;
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'storage':
      return <HardDrive className="h-4 w-4" />;
    case 'auth':
      return <Shield className="h-4 w-4" />;
  }
};

const HealthCheckItem = ({ result }: { result: HealthCheckResult }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-card border hover:bg-accent/50 transition-colors">
    <div className="flex items-center gap-3">
      <StatusIcon status={result.status} />
      <div className="flex items-center gap-2">
        <CategoryIcon category={result.category} />
        <span className="font-medium text-sm">{result.name}</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground max-w-[200px] truncate">
        {result.message}
      </span>
      <StatusBadge status={result.status} />
    </div>
  </div>
);

const AdminHealthCheck: React.FC = () => {
  const { results, isRunning, lastChecked, summary, runHealthCheck } = useDeploymentHealth();

  useEffect(() => {
    // Auto-run health check on mount
    runHealthCheck();
  }, []);

  const passRate = summary.total > 0 
    ? Math.round((summary.passed / summary.total) * 100) 
    : 0;

  const filterByCategory = (category: HealthCheckResult['category']) =>
    results.filter((r) => r.category === category);

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary,
      results: results.map((r) => ({
        name: r.name,
        status: r.status,
        message: r.message,
        category: r.category,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-check-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Deployment Health Check
            </h1>
            <p className="text-muted-foreground mt-1">
              Verify all edge functions, storage buckets, and database tables are properly configured
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportReport}
              disabled={isRunning || results.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={runHealthCheck} disabled={isRunning}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Health Check'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Checks</CardDescription>
              <CardTitle className="text-3xl">{summary.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Passed
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">{summary.passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{summary.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Warnings
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{summary.warnings}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Overall Health</CardTitle>
              {lastChecked && (
                <span className="text-xs text-muted-foreground">
                  Last checked: {format(lastChecked, 'MMM d, yyyy HH:mm:ss')}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Pass Rate</span>
                <span className="font-medium">{passRate}%</span>
              </div>
              <Progress 
                value={passRate} 
                className={`h-3 ${
                  passRate === 100 
                    ? '[&>div]:bg-green-500' 
                    : passRate >= 80 
                      ? '[&>div]:bg-yellow-500' 
                      : '[&>div]:bg-red-500'
                }`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({results.length})
                </TabsTrigger>
                <TabsTrigger value="edge-function">
                  <Server className="h-4 w-4 mr-1" />
                  Edge Functions ({filterByCategory('edge-function').length})
                </TabsTrigger>
                <TabsTrigger value="storage">
                  <HardDrive className="h-4 w-4 mr-1" />
                  Storage ({filterByCategory('storage').length})
                </TabsTrigger>
                <TabsTrigger value="database">
                  <Database className="h-4 w-4 mr-1" />
                  Database ({filterByCategory('database').length})
                </TabsTrigger>
                <TabsTrigger value="auth">
                  <Shield className="h-4 w-4 mr-1" />
                  Auth ({filterByCategory('auth').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {isRunning && results.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Running health checks...</span>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Click "Run Health Check" to start
                      </div>
                    ) : (
                      results.map((result, index) => (
                        <HealthCheckItem key={index} result={result} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {['edge-function', 'storage', 'database', 'auth'].map((category) => (
                <TabsContent key={category} value={category}>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {filterByCategory(category as HealthCheckResult['category']).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          No results in this category
                        </div>
                      ) : (
                        filterByCategory(category as HealthCheckResult['category']).map((result, index) => (
                          <HealthCheckItem key={index} result={result} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Failed Items Alert */}
        {summary.failed > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Failed Checks Require Attention
              </CardTitle>
              <CardDescription>
                The following items failed health checks and may need to be configured:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results
                  .filter((r) => r.status === 'error')
                  .map((result, index) => (
                    <HealthCheckItem key={index} result={result} />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminHealthCheck;
