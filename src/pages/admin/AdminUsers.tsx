import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  MoreVertical, 
  Edit, 
  Power, 
  ExternalLink,
  Mail,
  Calendar,
  Store,
  Wallet,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Percent,
  Shield,
  Award,
  History,
  Globe,
  Key,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  CheckSquare,
  Square,
  RotateCcw,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useAdminUsers, DropshipperUser, UserStatus, UserLevel, ResetOptions } from '@/hooks/useAdminUsers';
import { UserLevelSelect } from '@/components/admin/UserLevelSelect';
import { UserLevelHistory } from '@/components/admin/UserLevelHistory';
import { IPLogViewer } from '@/components/admin/IPLogViewer';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useAdminKYC } from '@/hooks/useAdminKYC';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AdminResetPasswordDialog } from '@/components/admin/AdminResetPasswordDialog';

const statusConfig: Record<UserStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: <Clock className="w-3 h-3" />
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: <CheckCircle className="w-3 h-3" />
  },
  disabled: { 
    label: 'Disabled', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: <XCircle className="w-3 h-3" />
  },
};

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'balance-asc' | 'balance-desc' | 'status';
type FilterOption = 'all' | 'pending' | 'approved' | 'disabled' | 'with-dues' | 'kyc-pending';

const ITEMS_PER_PAGE = 12;

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDataDialogOpen, setIsResetDataDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isIPLogDialogOpen, setIsIPLogDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DropshipperUser | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetDataCounts, setResetDataCounts] = useState<{
    orders: number;
    transactions: number;
    products: number;
    proofs: number;
    payouts: number;
    cryptoPayments: number;
    kycSubmissions: number;
    chatMessages: number;
    notifications: number;
    isLoading: boolean;
  }>({ orders: 0, transactions: 0, products: 0, proofs: 0, payouts: 0, cryptoPayments: 0, kycSubmissions: 0, chatMessages: 0, notifications: 0, isLoading: false });
  
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    orders: true,
    walletTransactions: true,
    storefrontProducts: true,
    proofOfWork: true,
    payoutRequests: true,
    cryptoPayments: true,
    kycSubmissions: true,
    chatMessages: true,
    notifications: true,
    resetProfile: true,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    storefrontName: '',
    storefrontSlug: '',
  });
  
  const { 
    dropshippers, 
    isLoading, 
    toggleStatus, 
    isTogglingStatus,
    updateProfile,
    isUpdatingProfile,
    updateUserStatus,
    isUpdatingUserStatus,
    deleteUser,
    isDeletingUser,
    updateUserLevel,
    isUpdatingUserLevel,
    resetUserData,
    isResettingUserData,
    toggleAllowPayoutWithDues,
    isTogglingAllowPayoutWithDues,
  } = useAdminUsers();

  const { settingsMap, isLoading: isLoadingSettings } = usePlatformSettings();
  const { kycSubmissions, isLoading: isLoadingKYC } = useAdminKYC();

  // Create a map of user_id to KYC status
  const kycStatusMap = new Map(kycSubmissions.map(k => [k.user_id, k.status]));

  // Fetch data counts when reset dialog opens
  useEffect(() => {
    const fetchResetDataCounts = async () => {
      if (!isResetDataDialogOpen || !selectedUser) {
        setResetConfirmText('');
        // Reset options to all selected when dialog opens fresh
        setResetOptions({
          orders: true,
          walletTransactions: true,
          storefrontProducts: true,
          proofOfWork: true,
          payoutRequests: true,
          cryptoPayments: true,
          kycSubmissions: true,
          chatMessages: true,
          notifications: true,
          resetProfile: true,
        });
        return;
      }

      setResetDataCounts(prev => ({ ...prev, isLoading: true }));

      try {
        const userId = selectedUser.user_id;
        
        const [ordersRes, transactionsRes, productsRes, proofsRes, payoutsRes, cryptoRes, kycRes, chatRes, notificationsRes] = await Promise.all([
          (supabase.from('orders').select('id', { count: 'exact', head: true }) as any).eq('dropshipper_user_id', userId),
          supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('storefront_products').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('proof_of_work').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('crypto_payments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('user_notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        setResetDataCounts({
          orders: ordersRes.count || 0,
          transactions: transactionsRes.count || 0,
          products: productsRes.count || 0,
          proofs: proofsRes.count || 0,
          payouts: payoutsRes.count || 0,
          cryptoPayments: cryptoRes.count || 0,
          kycSubmissions: kycRes.count || 0,
          chatMessages: chatRes.count || 0,
          notifications: notificationsRes.count || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching reset data counts:', error);
        setResetDataCounts(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchResetDataCounts();
  }, [isResetDataDialogOpen, selectedUser]);

  // Filter, sort, and paginate users
  const { paginatedUsers, totalPages, totalFiltered, duesCount } = useMemo(() => {
    // Count users with dues for badge display
    const duesCount = dropshippers.filter(u => u.postpaid_used > 0).length;

    // Apply search filter
    let filtered = dropshippers.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.storefront_slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply category filter
    switch (filterBy) {
      case 'pending':
        filtered = filtered.filter(u => u.user_status === 'pending');
        break;
      case 'approved':
        filtered = filtered.filter(u => u.user_status === 'approved');
        break;
      case 'disabled':
        filtered = filtered.filter(u => u.user_status === 'disabled');
        break;
      case 'with-dues':
        filtered = filtered.filter(u => u.postpaid_used > 0);
        break;
      case 'kyc-pending':
        filtered = filtered.filter(u => kycStatusMap.get(u.user_id) === 'submitted');
        break;
    }

    // Sort
    const statusOrder: Record<UserStatus, number> = { pending: 0, approved: 1, disabled: 2 };
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'balance-asc':
          return a.wallet_balance - b.wallet_balance;
        case 'balance-desc':
          return b.wallet_balance - a.wallet_balance;
        case 'status':
          return statusOrder[a.user_status] - statusOrder[b.user_status];
        default:
          return 0;
      }
    });

    // Paginate
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedUsers, totalPages, totalFiltered: filtered.length, duesCount };
  }, [dropshippers, searchQuery, sortBy, filterBy, currentPage, kycStatusMap]);

  // Reset to page 1 when search, sort, or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: FilterOption) => {
    setFilterBy(value);
    setCurrentPage(1);
  };

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.user_id)));
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedUserIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      for (const userId of selectedUserIds) {
        await new Promise<void>((resolve) => {
          updateUserStatus({ userId, status: 'approved' }, {
            onSettled: () => resolve()
          });
        });
      }
      clearSelection();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDisable = async () => {
    if (selectedUserIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      for (const userId of selectedUserIds) {
        await new Promise<void>((resolve) => {
          updateUserStatus({ userId, status: 'disabled' }, {
            onSettled: () => resolve()
          });
        });
      }
      clearSelection();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Storefront Name', 'Storefront Slug', 'Status', 'Level', 'Wallet Balance', 'Created At', 'Last Login'];
    const rows = dropshippers.map(user => [
      user.name,
      user.email,
      user.storefront_name || '',
      user.storefront_slug || '',
      user.user_status,
      user.user_level,
      user.wallet_balance.toFixed(2),
      format(new Date(user.created_at), 'yyyy-MM-dd HH:mm'),
      user.last_login_at ? format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dropshippers_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleEdit = (user: DropshipperUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      storefrontName: user.storefront_name || '',
      storefrontSlug: user.storefront_slug || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    updateProfile({
      userId: selectedUser.user_id,
      name: editForm.name,
      storefrontName: editForm.storefrontName,
      storefrontSlug: editForm.storefrontSlug,
    });
    setIsEditDialogOpen(false);
  };

  const handleUpdateStatus = (user: DropshipperUser, status: UserStatus) => {
    updateUserStatus({ userId: user.user_id, status });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUser({ userId: selectedUser.user_id });
    setIsDeleteDialogOpen(false);
  };

  const handleViewStorefront = (user: DropshipperUser) => {
    if (user.storefront_slug) {
      window.open(`/store/${user.storefront_slug}`, '_blank');
    }
  };

  const pendingCount = dropshippers.filter(u => u.user_status === 'pending').length;
  const approvedCount = dropshippers.filter(u => u.user_status === 'approved').length;

  // Show loading state if any data is still loading
  if (isLoading || isLoadingKYC || isLoadingSettings) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Dropshippers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your dropshippers. {dropshippers.length} total.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                <Clock className="w-3 h-3 mr-1" />
                {pendingCount} Pending
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {approvedCount} Approved
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsHistoryDialogOpen(true)}
            >
              <History className="w-4 h-4 mr-1" />
              Level History
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedUserIds.size} selected</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkApprove}
                disabled={isBulkActionLoading}
                className="text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
              >
                {isBulkActionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Approve All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDisable}
                disabled={isBulkActionLoading}
                className="text-red-600 border-red-500/50 hover:bg-red-500/10"
              >
                {isBulkActionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                Disable All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                disabled={isBulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Search, Filter, and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search dropshippers..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter dropdown */}
            <Select value={filterBy} onValueChange={(v) => handleFilterChange(v as FilterOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Pending Approval
                  </span>
                </SelectItem>
                <SelectItem value="approved">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Approved
                  </span>
                </SelectItem>
                <SelectItem value="disabled">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-red-500" />
                    Disabled
                  </span>
                </SelectItem>
                <SelectItem value="with-dues">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-amber-500" />
                    With Postpaid Dues {duesCount > 0 && `(${duesCount})`}
                  </span>
                </SelectItem>
                <SelectItem value="kyc-pending">
                  <span className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-amber-500" />
                    KYC Pending
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="balance-desc">Highest Balance</SelectItem>
                  <SelectItem value="balance-asc">Lowest Balance</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results info with Select All */}
        <div className="flex items-center justify-between">
          {totalFiltered > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select all on page
              </button>
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalFiltered)} of {totalFiltered} dropshippers
              </p>
            </div>
          )}
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedUsers.map((user, index) => (
            <div 
              key={user.id}
              className={cn(
                "dashboard-card opacity-0 animate-slide-up relative",
                selectedUserIds.has(user.user_id) && "ring-2 ring-primary"
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              {/* Selection Checkbox */}
              <button
                onClick={() => toggleUserSelection(user.user_id)}
                className="absolute top-4 left-4 z-10"
              >
                {selectedUserIds.has(user.user_id) ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 pl-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.storefront_name || 'No storefront name'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    {user.storefront_slug && (
                      <DropdownMenuItem onClick={() => handleViewStorefront(user)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Storefront
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={`/admin/kyc?user=${user.user_id}`}>
                        <Shield className="w-4 h-4 mr-2" />
                        View KYC
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedUser(user);
                      setIsIPLogDialogOpen(true);
                    }}>
                      <Globe className="w-4 h-4 mr-2" />
                      View IP Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedUser(user);
                      setIsResetPasswordDialogOpen(true);
                    }}>
                      <Key className="w-4 h-4 mr-2" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.user_status === 'pending' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'approved')}
                        className="text-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve User
                      </DropdownMenuItem>
                    )}
                    {user.user_status !== 'disabled' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'disabled')}
                        className="text-red-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Disable User
                      </DropdownMenuItem>
                    )}
                    {user.user_status === 'disabled' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'approved')}
                        className="text-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Re-enable User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedUser(user);
                        setIsResetDataDialogOpen(true);
                      }}
                      className="text-amber-600"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset User Data
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedUser(user);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.storefront_slug && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="w-4 h-4" />
                    <span className="truncate">/store/{user.storefront_slug}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                </div>
                {user.last_ip_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span className="font-mono text-xs">{user.last_ip_address}</span>
                    {user.last_login_at && (
                      <span className="text-xs">({format(new Date(user.last_login_at), 'MMM dd, HH:mm')})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Postpaid Dues Section - Only show if user has dues */}
              {user.postpaid_used > 0 && (
                <div className="flex items-center justify-between py-3 px-3 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs text-amber-600 font-medium">Postpaid Dues</p>
                      <p className="text-sm font-bold text-amber-700">
                        {CURRENCY_SYMBOLS[settingsMap.default_currency]}{user.postpaid_used.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">Payout with Dues</span>
                      <span className="text-xs font-medium">
                        {user.allow_payout_with_dues ? (
                          <span className="text-emerald-600">Allowed</span>
                        ) : (
                          <span className="text-red-600">Blocked</span>
                        )}
                      </span>
                    </div>
                    <Switch
                      checked={user.allow_payout_with_dues}
                      onCheckedChange={(allow) => 
                        toggleAllowPayoutWithDues({ userId: user.user_id, allow })
                      }
                      disabled={isTogglingAllowPayoutWithDues}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn("gap-1 border", statusConfig[user.user_status].color)}>
                    {statusConfig[user.user_status].icon}
                    {statusConfig[user.user_status].label}
                  </Badge>
                  {/* KYC Status Badge */}
                  {(() => {
                    const kycStatus = kycStatusMap.get(user.user_id);
                    if (!kycStatus || kycStatus === 'not_submitted') {
                      return (
                        <Badge variant="outline" className="gap-1 text-xs border-gray-300 text-gray-500">
                          <Shield className="w-3 h-3" />
                          No KYC
                        </Badge>
                      );
                    }
                    if (kycStatus === 'submitted') {
                      return (
                        <Badge className="gap-1 text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Shield className="w-3 h-3" />
                          KYC Pending
                        </Badge>
                      );
                    }
                    if (kycStatus === 'approved') {
                      return (
                        <Badge className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Shield className="w-3 h-3" />
                          KYC Verified
                        </Badge>
                      );
                    }
                    if (kycStatus === 'rejected') {
                      return (
                        <Badge className="gap-1 text-xs bg-red-500/10 text-red-600 border border-red-500/20">
                          <Shield className="w-3 h-3" />
                          KYC Rejected
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <UserLevelSelect
                    value={user.user_level}
                    onValueChange={(level) => updateUserLevel({ userId: user.user_id, level })}
                    disabled={isUpdatingUserLevel}
                  />
                  <div className="flex items-center gap-1 text-right">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {CURRENCY_SYMBOLS[settingsMap.default_currency]}{user.wallet_balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {paginatedUsers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No dropshippers found matching your search.' : 'No dropshippers registered yet.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and adjacent pages
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                })
                .map((page, idx, arr) => {
                  // Add ellipsis between non-consecutive pages
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit Dropshipper</DialogTitle>
                <DialogDescription>
                  Update the dropshipper's profile information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-storefront-name">Storefront Name</Label>
                  <Input 
                    id="edit-storefront-name" 
                    value={editForm.storefrontName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, storefrontName: e.target.value }))}
                    placeholder="John's Premium Store" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-storefront-slug">Storefront URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/store/</span>
                    <Input 
                      id="edit-storefront-slug" 
                      value={editForm.storefrontSlug}
                      onChange={(e) => setEditForm(prev => ({ ...prev, storefrontSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="johns-store" 
                      className="flex-1" 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedUser?.name} and all their data including orders, 
                storefront products, and wallet transactions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletingUser}
              >
                {isDeletingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset User Data Confirmation */}
        <AlertDialog open={isResetDataDialogOpen} onOpenChange={(open) => {
          setIsResetDataDialogOpen(open);
          if (!open) setResetConfirmText('');
        }}>
          <AlertDialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                Reset User Data?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    Select which data to reset for <strong className="text-foreground">{selectedUser?.name}</strong>.
                  </p>
                  
                  {/* Selectable data items */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-amber-800 dark:text-amber-200">Select data to delete:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allSelected = Object.values(resetOptions).every(v => v);
                          setResetOptions({
                            orders: !allSelected,
                            walletTransactions: !allSelected,
                            storefrontProducts: !allSelected,
                            proofOfWork: !allSelected,
                            payoutRequests: !allSelected,
                            cryptoPayments: !allSelected,
                            kycSubmissions: !allSelected,
                            chatMessages: !allSelected,
                            notifications: !allSelected,
                            resetProfile: !allSelected,
                          });
                        }}
                      >
                        {Object.values(resetOptions).every(v => v) ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    {resetDataCounts.isLoading ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Counting records...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {/* Orders */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.orders}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, orders: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Orders</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.orders}</span>
                        </label>
                        
                        {/* Wallet Transactions */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.walletTransactions}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, walletTransactions: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Wallet Transactions</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.transactions}</span>
                        </label>
                        
                        {/* Storefront Products */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.storefrontProducts}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, storefrontProducts: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Storefront Products</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.products}</span>
                        </label>
                        
                        {/* Proof of Work */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.proofOfWork}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, proofOfWork: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Proof of Work</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.proofs}</span>
                        </label>
                        
                        {/* Payout Requests */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.payoutRequests}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, payoutRequests: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Payout Requests</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.payouts}</span>
                        </label>
                        
                        {/* Crypto Payments */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.cryptoPayments}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, cryptoPayments: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Crypto Payments</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.cryptoPayments}</span>
                        </label>
                        
                        {/* KYC Submissions */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.kycSubmissions}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, kycSubmissions: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">KYC Submissions</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.kycSubmissions}</span>
                        </label>
                        
                        {/* Chat Messages */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.chatMessages}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, chatMessages: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Chat Messages</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.chatMessages}</span>
                        </label>
                        
                        {/* Notifications */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.notifications}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, notifications: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Notifications</span>
                          </div>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{resetDataCounts.notifications}</span>
                        </label>
                        
                        {/* Reset Profile */}
                        <label className="flex items-center justify-between p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer border-t border-amber-200 dark:border-amber-700 mt-2 pt-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={resetOptions.resetProfile}
                              onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, resetProfile: !!checked }))}
                            />
                            <span className="text-amber-700 dark:text-amber-300">Reset Profile (wallet, level, storefront)</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-sm">
                    The user account and login credentials will remain intact. This action cannot be undone.
                  </p>

                  {/* Type to confirm */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="reset-confirm" className="text-sm font-medium text-foreground">
                      Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-amber-600">{selectedUser?.name}</span> to confirm:
                    </Label>
                    <Input
                      id="reset-confirm"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="Type user's name to confirm"
                      className="border-amber-300 focus:border-amber-500"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setResetConfirmText('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (selectedUser) {
                    resetUserData({ userId: selectedUser.user_id, options: resetOptions });
                    setIsResetDataDialogOpen(false);
                    setResetConfirmText('');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isResettingUserData || resetConfirmText !== selectedUser?.name || !Object.values(resetOptions).some(v => v)}
              >
                {isResettingUserData && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Selected Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Level History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>User Level Change History</DialogTitle>
              <DialogDescription>
                View all user level changes made by administrators
              </DialogDescription>
            </DialogHeader>
            <UserLevelHistory />
          </DialogContent>
        </Dialog>

        {/* IP Log Dialog */}
        <Dialog open={isIPLogDialogOpen} onOpenChange={setIsIPLogDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                IP Activity Logs - {selectedUser?.name}
              </DialogTitle>
              <DialogDescription>
                View all IP activity for this user
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <IPLogViewer userId={selectedUser.user_id} showUserColumn={false} />
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        {selectedUser && (
          <AdminResetPasswordDialog
            open={isResetPasswordDialogOpen}
            onOpenChange={setIsResetPasswordDialogOpen}
            userId={selectedUser.user_id}
            userName={selectedUser.name}
            userEmail={selectedUser.email}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
