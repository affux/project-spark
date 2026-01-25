import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Globe, MousePointer, ExternalLink, Eye, FormInput, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface VisitorLog {
  id: string;
  ip_address: string;
  action_type: string;
  page_url: string | null;
  referrer: string | null;
  user_agent: string | null;
  link_clicked: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

const actionConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  page_view: { label: 'Page View', icon: Eye, color: 'bg-blue-500/10 text-blue-500' },
  link_click: { label: 'Link Click', icon: MousePointer, color: 'bg-green-500/10 text-green-500' },
  button_click: { label: 'Button Click', icon: MousePointer, color: 'bg-purple-500/10 text-purple-500' },
  external_link: { label: 'External Link', icon: ExternalLink, color: 'bg-orange-500/10 text-orange-500' },
  form_submit: { label: 'Form Submit', icon: FormInput, color: 'bg-cyan-500/10 text-cyan-500' },
  cta_click: { label: 'CTA Click', icon: Sparkles, color: 'bg-pink-500/10 text-pink-500' },
};

export const VisitorLogsPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['visitor-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as VisitorLog[];
    },
    staleTime: 30000,
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.page_url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.link_clicked?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Calculate stats
  const stats = logs ? {
    totalVisits: logs.length,
    uniqueIPs: new Set(logs.map(l => l.ip_address)).size,
    pageViews: logs.filter(l => l.action_type === 'page_view').length,
    linkClicks: logs.filter(l => l.action_type === 'link_click' || l.action_type === 'button_click').length,
  } : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Visitor Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Visitor Analytics
            </CardTitle>
            <CardDescription>
              Track all visitor activity including page views and link clicks
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalVisits}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.uniqueIPs}</div>
              <div className="text-xs text-muted-foreground">Unique IPs</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.pageViews}</div>
              <div className="text-xs text-muted-foreground">Page Views</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.linkClicks}</div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <Input
            placeholder="Search by IP, URL, or link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="page_view">Page Views</SelectItem>
              <SelectItem value="link_click">Link Clicks</SelectItem>
              <SelectItem value="button_click">Button Clicks</SelectItem>
              <SelectItem value="external_link">External Links</SelectItem>
              <SelectItem value="cta_click">CTA Clicks</SelectItem>
              <SelectItem value="form_submit">Form Submits</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No visitor logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log, index) => {
                  const config = actionConfig[log.action_type] || { label: log.action_type, icon: Globe, color: 'bg-gray-500/10 text-gray-500' };
                  const IconComponent = config.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{log.ip_address}</div>
                        {log.country && (
                          <div className="text-xs text-muted-foreground">
                            {[log.city, log.region, log.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.color} gap-1`}>
                          <IconComponent className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-sm">
                          {log.link_clicked || log.page_url || '-'}
                        </div>
                        {log.referrer && (
                          <div className="text-xs text-muted-foreground truncate">
                            From: {log.referrer}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'PPp')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="text-xs text-muted-foreground text-right mt-2">
          Showing {filteredLogs?.length || 0} of {logs?.length || 0} logs
        </div>
      </CardContent>
    </Card>
  );
};
