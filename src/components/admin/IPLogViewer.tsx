import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAdminIPLogs } from '@/hooks/useAdminIPLogs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, RefreshCw, Globe, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IPLogViewerProps {
  userId?: string;
  showUserColumn?: boolean;
}

const actionTypeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login: { label: 'Login', variant: 'default' },
  logout: { label: 'Logout', variant: 'secondary' },
  order_placed: { label: 'Order Placed', variant: 'outline' },
  payout_request: { label: 'Payout Request', variant: 'outline' },
  profile_update: { label: 'Profile Update', variant: 'secondary' },
};

export const IPLogViewer: React.FC<IPLogViewerProps> = ({ userId, showUserColumn = true }) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [actionType, setActionType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { logs, isLoading, refetch } = useAdminIPLogs({
    userId,
    startDate,
    endDate,
    actionType,
  });

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.ip_address.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.country?.toLowerCase().includes(query) ||
      log.city?.toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setActionType('all');
    setSearchQuery('');
  };

  const formatLocation = (log: { country?: string; city?: string; region?: string }) => {
    const parts = [log.city, log.region, log.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>IP Activity Logs</CardTitle>
              <CardDescription>
                {userId ? 'User IP activity history' : 'All user IP activity across the platform'}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="order_placed">Order Placed</SelectItem>
              <SelectItem value="payout_request">Payout Request</SelectItem>
              <SelectItem value="profile_update">Profile Update</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PP") : "Start Date"}
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PP") : "End Date"}
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

          {(startDate || endDate || actionType !== 'all' || searchQuery) && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {showUserColumn && <TableHead>User</TableHead>}
                <TableHead>IP Address</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showUserColumn ? 5 : 4} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showUserColumn ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No IP logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actionInfo = actionTypeLabels[log.action_type] || { 
                    label: log.action_type, 
                    variant: 'outline' as const 
                  };
                  const location = formatLocation(log);
                  
                  return (
                    <TableRow key={log.id}>
                      {showUserColumn && (
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user_name}</div>
                            <div className="text-sm text-muted-foreground">{log.user_email}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {log.ip_address}
                        </code>
                      </TableCell>
                      <TableCell>
                        {location ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionInfo.variant}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};
