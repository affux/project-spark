import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus,
  Minus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  DollarSign
} from 'lucide-react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminWallet, DropshipperWallet } from '@/hooks/useAdminWallet';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const AdminWallet: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedDropshipper, setSelectedDropshipper] = useState<DropshipperWallet | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  
  const { 
    transactions, 
    dropshipperWallets, 
    isLoading, 
    adjustWallet,
    isAdjustingWallet 
  } = useAdminWallet();

  const filteredWallets = dropshipperWallets.filter(wallet =>
    wallet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wallet.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx =>
    tx.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdjust = (dropshipper: DropshipperWallet, type: 'credit' | 'debit') => {
    setSelectedDropshipper(dropshipper);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustDescription('');
    setIsAdjustDialogOpen(true);
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDropshipper) return;

    adjustWallet({
      userId: selectedDropshipper.user_id,
      amount: parseFloat(adjustAmount),
      type: adjustType,
      description: adjustDescription || `Admin ${adjustType}`,
    });
    setIsAdjustDialogOpen(false);
  };

  const totalBalance = dropshipperWallets.reduce((sum, w) => sum + w.wallet_balance, 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Wallet Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage dropshipper wallet balances and view transactions.
            </p>
          </div>
          <div className="dashboard-card flex items-center gap-3 px-6">
            <Wallet className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Balances</p>
              <p className="text-2xl font-bold text-foreground">${totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search dropshippers or transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="wallets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="wallets">Dropshipper Wallets</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets">
            <div className="dashboard-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dropshipper</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {wallet.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{wallet.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{wallet.email}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-semibold text-lg",
                          wallet.wallet_balance > 0 ? "text-emerald-600" : "text-foreground"
                        )}>
                          ${wallet.wallet_balance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(wallet, 'credit')}
                            className="gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Credit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(wallet, 'debit')}
                            className="gap-1"
                            disabled={wallet.wallet_balance <= 0}
                          >
                            <Minus className="w-4 h-4" />
                            Debit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredWallets.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No dropshippers found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="dashboard-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dropshipper</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.user_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{tx.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "gap-1",
                            tx.amount > 0 
                              ? "bg-emerald-500/10 text-emerald-600" 
                              : "bg-red-500/10 text-red-600"
                          )}
                        >
                          {tx.amount > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-semibold",
                          tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No transactions found.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Adjust Wallet Dialog */}
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleAdjust}>
              <DialogHeader>
                <DialogTitle>
                  {adjustType === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
                </DialogTitle>
                <DialogDescription>
                  {adjustType === 'credit' ? 'Add funds to' : 'Remove funds from'} {selectedDropshipper?.name}'s wallet.
                  Current balance: ${selectedDropshipper?.wallet_balance.toFixed(2)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="amount" 
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={adjustType === 'debit' ? selectedDropshipper?.wallet_balance : undefined}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea 
                    id="description" 
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder={`Reason for ${adjustType}...`}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isAdjustingWallet || !adjustAmount}
                  className={adjustType === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isAdjustingWallet && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {adjustType === 'credit' ? 'Credit' : 'Debit'} ${adjustAmount || '0.00'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWallet;
