import React, { useState, useMemo } from 'react';
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
import { CalendarIcon, Search, RefreshCw, Globe, MapPin, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IPLogViewerProps {
  userId?: string;
  showUserColumn?: boolean;
  showUserSelector?: boolean;
}

interface UserOption {
  user_id: string;
  name: string;
  email: string;
}

const actionTypeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login: { label: 'Login', variant: 'default' },
  logout: { label: 'Logout', variant: 'secondary' },
  order_placed: { label: 'Order Placed', variant: 'outline' },
  payout_request: { label: 'Payout Request', variant: 'outline' },
  profile_update: { label: 'Profile Update', variant: 'secondary' },
  postpaid_repayment: { label: 'Postpaid Repayment', variant: 'default' },
  crypto_payment: { label: 'Crypto Payment', variant: 'outline' },
  payment_details_update: { label: 'Payment Details', variant: 'secondary' },
  kyc_submission: { label: 'KYC Submission', variant: 'default' },
};

export const IPLogViewer: React.FC<IPLogViewerProps> = ({ 
  userId: initialUserId, 
  showUserColumn = true,
  showUserSelector = true 
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(initialUserId);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [actionType, setActionType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);

  // Fetch users for the selector
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-for-ip-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data as UserOption[];
    },
    enabled: showUserSelector && !initialUserId,
  });

  // Get the effective userId (from props or selected)
  const effectiveUserId = initialUserId || selectedUserId;

  const { logs, isLoading, refetch } = useAdminIPLogs({
    userId: effectiveUserId,
    startDate,
    endDate,
    actionType,
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  // Get selected user info
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find(u => u.user_id === selectedUserId) || null;
  }, [users, selectedUserId]);

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

  const clearUserSelection = () => {
    setSelectedUserId(undefined);
    setUserSearchQuery('');
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
                {effectiveUserId ? 'User IP activity history' : 'Select a user to view their activity or browse all logs'}
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
        {/* User Selector - only show if no userId prop and showUserSelector is true */}
        {showUserSelector && !initialUserId && (
          <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              <span>Select User</span>
            </div>
            
            {selectedUser ? (
              <div className="flex items-center justify-between bg-background border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedUser.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearUserSelection}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Popover open={isUserSelectorOpen} onOpenChange={setIsUserSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isUserSelectorOpen}
                    className="w-full justify-start text-left font-normal"
                  >
                    <User className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <span className="text-muted-foreground">Search and select a user...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or email..."
                      value={userSearchQuery}
                      onValueChange={setUserSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[300px]">
                          {filteredUsers.map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={user.user_id}
                              onSelect={() => {
                                setSelectedUserId(user.user_id);
                                setIsUserSelectorOpen(false);
                                setUserSearchQuery('');
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-primary">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

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
              <SelectItem value="postpaid_repayment">Postpaid Repayment</SelectItem>
              <SelectItem value="crypto_payment">Crypto Payment</SelectItem>
              <SelectItem value="kyc_submission">KYC Submission</SelectItem>
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
                {showUserColumn && !effectiveUserId && <TableHead>User</TableHead>}
                <TableHead>IP Address</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showUserColumn && !effectiveUserId ? 5 : 4} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showUserColumn && !effectiveUserId ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    {effectiveUserId ? 'No IP logs found for this user' : 'Select a user to view their activity logs'}
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
                      {showUserColumn && !effectiveUserId && (
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
          {effectiveUserId && selectedUser && ` for ${selectedUser.name}`}
        </div>
      </CardContent>
    </Card>
  );
};