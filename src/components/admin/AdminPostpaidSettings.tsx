import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  History,
  Settings,
  Plus,
  Minus,
  Users,
  Mail,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useAdminPostpaid, PostpaidTransaction } from '@/hooks/usePostpaid';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const transactionTypeLabels: Record<PostpaidTransaction['transaction_type'], string> = {
  credit_used: 'Credit Used',
  credit_repaid: 'Payment Made',
  adjustment: 'Admin Adjustment',
};

interface AdminPostpaidSettingsProps {
  className?: string;
}

export const AdminPostpaidSettings: React.FC<AdminPostpaidSettingsProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    name: string;
    email: string;
    postpaid_enabled: boolean;
    postpaid_credit_limit: number;
    postpaid_used: number;
    postpaid_due_cycle: number | null;
    wallet_balance: number;
    available_credit: number;
    allow_payout_with_dues: boolean;
  } | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<PostpaidTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form states
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [newDueCycle, setNewDueCycle] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('subtract');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const {
    users,
    isLoading,
    togglePostpaid,
    isTogglingPostpaid,
    updateCreditLimit,
    isUpdatingCreditLimit,
    adjustBalance,
    isAdjustingBalance,
    updateDueCycle,
    isUpdatingDueCycle,
    fetchUserTransactions,
    toggleAllowPayoutWithDues,
    isTogglingAllowPayoutWithDues,
  } = useAdminPostpaid();

  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersWithPostpaid = users.filter(u => u.postpaid_enabled);
  const usersWithDues = users.filter(u => u.postpaid_used > 0);
  const totalOutstandingDues = users.reduce((sum, u) => sum + u.postpaid_used, 0);

  const handleSendDueReminders = async () => {
    setIsSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-postpaid-due-reminder');
      
      if (error) throw error;
      
      const result = data as { success: boolean; emailsSent: number; notificationsSent: number; errors?: string[] };
      
      if (result.success) {
        toast.success(`Due reminders sent successfully`, {
          description: `${result.emailsSent} emails and ${result.notificationsSent} notifications sent`,
        });
      } else {
        toast.error('Failed to send reminders');
      }
    } catch (error: any) {
      console.error('Error sending due reminders:', error);
      toast.error('Failed to send due reminders', {
        description: error.message,
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleOpenSettings = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setNewCreditLimit(user?.postpaid_credit_limit?.toString() || '0');
    setNewDueCycle(user?.postpaid_due_cycle?.toString() || '');
    setIsSettingsDialogOpen(true);
  };

  const handleOpenAdjust = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setAdjustAmount('');
    setAdjustType('subtract');
    setAdjustReason('');
    setIsAdjustDialogOpen(true);
  };

  const handleOpenHistory = async (user: typeof selectedUser) => {
    if (!user) return;
    setSelectedUser(user);
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    try {
      const transactions = await fetchUserTransactions(user.user_id);
      setUserTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveSettings = () => {
    if (!selectedUser) return;

    const creditLimit = parseFloat(newCreditLimit);
    const dueCycle = newDueCycle ? parseInt(newDueCycle) : null;

    if (!isNaN(creditLimit) && creditLimit !== selectedUser.postpaid_credit_limit) {
      updateCreditLimit({ userId: selectedUser.user_id, creditLimit });
    }

    if (dueCycle !== selectedUser.postpaid_due_cycle) {
      updateDueCycle({ userId: selectedUser.user_id, dueCycle });
    }

    setIsSettingsDialogOpen(false);
  };

  const handleAdjustBalance = () => {
    if (!selectedUser || !adjustAmount || !adjustReason) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const adjustedAmount = adjustType === 'subtract' ? -amount : amount;

    adjustBalance({
      userId: selectedUser.user_id,
      amount: adjustedAmount,
      reason: adjustReason,
    });

    setIsAdjustDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Postpaid Credit Management
              </CardTitle>
              <CardDescription>
                Manage postpaid credit for users
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendDueReminders}
                disabled={isSendingReminders || usersWithDues.length === 0}
              >
                {isSendingReminders ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Due Reminders
              </Button>
              <Badge variant="outline" className="border-primary/50">
                <Users className="w-3 h-3 mr-1" />
                {usersWithPostpaid.length} Enabled
              </Badge>
              {usersWithDues.length > 0 && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {usersWithDues.length} With Dues
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Total Outstanding</div>
              <div className="text-2xl font-bold text-amber-600">
                {currencySymbol}{totalOutstandingDues.toFixed(2)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Users with Postpaid</div>
              <div className="text-2xl font-bold">{usersWithPostpaid.length}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Users with Dues</div>
              <div className="text-2xl font-bold text-amber-600">{usersWithDues.length}</div>
            </div>
          </div>

          <Separator />

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout with Dues</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.postpaid_enabled}
                          onCheckedChange={(enabled) => 
                            togglePostpaid({ userId: user.user_id, enabled })
                          }
                          disabled={isTogglingPostpaid}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {currencySymbol}{user.postpaid_credit_limit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          user.postpaid_used > 0 ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {currencySymbol}{user.postpaid_used.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-emerald-600">
                          {currencySymbol}{user.available_credit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.postpaid_used > 0 ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Dues Pending
                          </Badge>
                        ) : user.postpaid_enabled ? (
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Clear
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.allow_payout_with_dues}
                            onCheckedChange={(allow) => 
                              toggleAllowPayoutWithDues({ userId: user.user_id, allow })
                            }
                            disabled={isTogglingAllowPayoutWithDues || (!user.postpaid_enabled && user.postpaid_used === 0)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {user.allow_payout_with_dues ? 'Allowed' : 'Blocked'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSettings(user)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAdjust(user)}
                            disabled={!user.postpaid_enabled}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(user)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postpaid Settings</DialogTitle>
            <DialogDescription>
              Configure postpaid credit for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueCycle">Due Cycle (Days)</Label>
              <Input
                id="dueCycle"
                type="number"
                min="1"
                placeholder="e.g., 30"
                value={newDueCycle}
                onChange={(e) => setNewDueCycle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no due cycle
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isUpdatingCreditLimit || isUpdatingDueCycle}
            >
              {(isUpdatingCreditLimit || isUpdatingDueCycle) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Postpaid Balance</DialogTitle>
            <DialogDescription>
              Manually adjust postpaid dues for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">Current Outstanding</div>
              <div className="text-xl font-bold text-amber-600">
                {currencySymbol}{selectedUser?.postpaid_used?.toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={adjustType === 'subtract' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdjustType('subtract')}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Reduce Dues
                </Button>
                <Button
                  variant={adjustType === 'add' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdjustType('add')}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Dues
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustAmount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="adjustAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustReason">Reason (Required)</Label>
              <Textarea
                id="adjustReason"
                placeholder="Explain why this adjustment is being made..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustBalance}
              disabled={
                isAdjustingBalance ||
                !adjustAmount ||
                parseFloat(adjustAmount) <= 0 ||
                !adjustReason
              }
            >
              {isAdjustingBalance && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              Postpaid transactions for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-auto">
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : userTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">
                        {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transactionTypeLabels[tx.transaction_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {tx.admin_reason || tx.description || '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        tx.transaction_type === 'credit_repaid' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {tx.transaction_type === 'credit_repaid' ? '-' : '+'}
                        {currencySymbol}{tx.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {currencySymbol}{tx.balance_after.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
