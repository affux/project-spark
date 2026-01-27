import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAdminKYC, type KYCWithProfile, type KYCDocumentUrls } from '@/hooks/useAdminKYC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { 
  Shield, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Loader2,
  FileText,
  User,
  Calendar,
  ExternalLink,
  Download,
  Camera,
  Building,
  ZoomIn,
  X,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Mail,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/lib/exportUtils';

const statusColors: Record<string, string> = {
  not_submitted: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  submitted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusIcons: Record<string, React.ReactNode> = {
  not_submitted: <Clock className="w-3 h-3" />,
  submitted: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

// Mask sensitive numbers
const maskAadhaar = (num: string) => `XXXX XXXX ${num.slice(-4)}`;
const maskPAN = (num: string) => `${num.slice(0, 2)}XXXXX${num.slice(-2)}`;

const ITEMS_PER_PAGE = 12;

type FilterType = 'all' | 'kyc_verified' | 'approved' | 'pending' | 'rejected';

const AdminKYC: React.FC = () => {
  const { 
    kycSubmissions, 
    isLoading, 
    pendingCount,
    approveKYC, 
    rejectKYC,
    deleteKYC,
    updateKYCStatus,
    isApproving,
    isRejecting,
    isDeleting,
    isUpdatingStatus,
    getDocumentUrl,
    getAllDocumentUrls
  } = useAdminKYC();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedKYC, setSelectedKYC] = useState<KYCWithProfile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentUrls, setDocumentUrls] = useState<KYCDocumentUrls | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [kycToDelete, setKycToDelete] = useState<KYCWithProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Filter submissions based on active filter and search
  const filteredSubmissions = useMemo(() => {
    return kycSubmissions.filter(kyc => {
      const matchesSearch = 
        kyc.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kyc.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kyc.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kyc.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      switch (activeFilter) {
        case 'kyc_verified':
          matchesFilter = kyc.status === 'approved';
          break;
        case 'approved':
          matchesFilter = kyc.status === 'approved';
          break;
        case 'pending':
          matchesFilter = kyc.status === 'submitted';
          break;
        case 'rejected':
          matchesFilter = kyc.status === 'rejected';
          break;
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [kycSubmissions, searchTerm, activeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  // Count for each filter
  const counts = useMemo(() => ({
    all: kycSubmissions.length,
    kyc_verified: kycSubmissions.filter(k => k.status === 'approved').length,
    approved: kycSubmissions.filter(k => k.status === 'approved').length,
    pending: kycSubmissions.filter(k => k.status === 'submitted').length,
    rejected: kycSubmissions.filter(k => k.status === 'rejected').length,
  }), [kycSubmissions]);

  const handleViewKYC = async (kyc: KYCWithProfile) => {
    setSelectedKYC(kyc);
    setIsViewDialogOpen(true);
    const urls = await getAllDocumentUrls(kyc);
    setDocumentUrls(urls);
  };

  const handleDownloadKYC = (kyc: KYCWithProfile) => {
    const data = [{
      'User Name': kyc.profiles?.name || 'Unknown',
      'User Email': kyc.profiles?.email || 'N/A',
      'First Name': kyc.first_name,
      'Last Name': kyc.last_name,
      'Date of Birth': format(new Date(kyc.date_of_birth), 'yyyy-MM-dd'),
      'Aadhaar Number': kyc.aadhaar_number,
      'PAN Number': kyc.pan_number,
      'Status': kyc.status,
      'Submitted At': format(new Date(kyc.submitted_at), 'yyyy-MM-dd HH:mm'),
      'Reviewed At': kyc.reviewed_at ? format(new Date(kyc.reviewed_at), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Rejection Reason': kyc.rejection_reason || 'N/A',
    }];
    downloadCSV(data, `kyc_${kyc.first_name}_${kyc.last_name}_${format(new Date(), 'yyyyMMdd')}`);
  };

  const handleDownloadAll = () => {
    const data = filteredSubmissions.map(kyc => ({
      'User Name': kyc.profiles?.name || 'Unknown',
      'User Email': kyc.profiles?.email || 'N/A',
      'First Name': kyc.first_name,
      'Last Name': kyc.last_name,
      'Date of Birth': format(new Date(kyc.date_of_birth), 'yyyy-MM-dd'),
      'Aadhaar Number': kyc.aadhaar_number,
      'PAN Number': kyc.pan_number,
      'Status': kyc.status,
      'Submitted At': format(new Date(kyc.submitted_at), 'yyyy-MM-dd HH:mm'),
      'Reviewed At': kyc.reviewed_at ? format(new Date(kyc.reviewed_at), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Rejection Reason': kyc.rejection_reason || 'N/A',
    }));
    downloadCSV(data, `kyc_submissions_${format(new Date(), 'yyyyMMdd')}`);
  };

  const handleApprove = () => {
    if (selectedKYC) {
      approveKYC(selectedKYC.id);
      setIsViewDialogOpen(false);
    }
  };

  const handleReject = () => {
    if (selectedKYC && rejectionReason.trim()) {
      rejectKYC({ kycId: selectedKYC.id, reason: rejectionReason });
      setIsRejectDialogOpen(false);
      setIsViewDialogOpen(false);
      setRejectionReason('');
    }
  };

  const handleDeleteClick = (kyc: KYCWithProfile) => {
    setKycToDelete(kyc);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (kycToDelete) {
      deleteKYC(kycToDelete.id);
      setIsDeleteDialogOpen(false);
      setKycToDelete(null);
      if (selectedKYC?.id === kycToDelete.id) {
        setIsViewDialogOpen(false);
        setSelectedKYC(null);
      }
    }
  };

  const handleStatusChange = (status: 'submitted' | 'approved' | 'rejected') => {
    if (selectedKYC) {
      if (status === 'rejected') {
        setIsRejectDialogOpen(true);
      } else {
        updateKYCStatus({ kycId: selectedKYC.id, status });
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSubmissions.map(k => k.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getInitials = (kyc: KYCWithProfile) => {
    const name = kyc.profiles?.name || `${kyc.first_name} ${kyc.last_name}`;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 3;
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">KYC Management</h1>
              <p className="text-muted-foreground">
                Review and approve user identity verifications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-600 text-base px-4 py-2">
                {pendingCount} Pending
              </Badge>
            )}
            <Button onClick={handleDownloadAll} variant="outline" disabled={filteredSubmissions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filter Buttons */}
        <div className="flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="gap-2"
            >
              All
              <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
            </Button>
            <Button
              variant={activeFilter === 'kyc_verified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('kyc_verified')}
              className={cn(
                "gap-2",
                activeFilter === 'kyc_verified' && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              KYC Verified
              <Badge variant="secondary" className="ml-1">{counts.kyc_verified}</Badge>
            </Button>
            <Button
              variant={activeFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('approved')}
              className={cn(
                "gap-2",
                activeFilter === 'approved' && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Approved
              <Badge variant="secondary" className="ml-1">{counts.approved}</Badge>
            </Button>
            <Button
              variant={activeFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('pending')}
              className={cn(
                "gap-2",
                activeFilter === 'pending' && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <Clock className="w-4 h-4" />
              Pending
              <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
            </Button>
            <Button
              variant={activeFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('rejected')}
              className={cn(
                "gap-2",
                activeFilter === 'rejected' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <XCircle className="w-4 h-4" />
              Rejected
              <Badge variant="secondary" className="ml-1">{counts.rejected}</Badge>
            </Button>
          </div>
        </div>

        {/* Card Grid */}
        {paginatedSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No KYC submissions found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSubmissions.map((kyc) => (
                <Card key={kyc.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {/* Checkbox and Menu */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(kyc.id)}
                          onCheckedChange={() => toggleSelect(kyc.id)}
                        />
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(kyc)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {kyc.profiles?.name || `${kyc.first_name} ${kyc.last_name}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {kyc.first_name} {kyc.last_name}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewKYC(kyc)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadKYC(kyc)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(kyc)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{kyc.profiles?.email || 'N/A'}</span>
                    </div>

                    {/* Submitted Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>Submitted {format(new Date(kyc.submitted_at), 'MMM d, yyyy')}</span>
                    </div>

                    {/* Mobile Number if available */}
                    {kyc.mobile_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Phone className="w-4 h-4" />
                        <span>{kyc.mobile_number}</span>
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("gap-1 text-xs", statusColors[kyc.status])}>
                        {statusIcons[kyc.status]}
                        {kyc.status === 'approved' ? 'Approved' : kyc.status === 'submitted' ? 'Pending' : kyc.status.replace('_', ' ')}
                      </Badge>
                      {kyc.status === 'approved' && (
                        <Badge className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          KYC Verified
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      {/* View KYC Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              KYC Details
            </DialogTitle>
            <DialogDescription>
              Review the submitted KYC documents and information
            </DialogDescription>
          </DialogHeader>

          {selectedKYC && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={cn(
                "rounded-lg p-4",
                statusColors[selectedKYC.status]
              )}>
                <div className="flex items-center gap-2">
                  {statusIcons[selectedKYC.status]}
                  <span className="font-medium capitalize">
                    {selectedKYC.status.replace('_', ' ')}
                  </span>
                </div>
                {selectedKYC.rejection_reason && (
                  <p className="mt-2 text-sm">Reason: {selectedKYC.rejection_reason}</p>
                )}
              </div>

              {/* User Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> Full Name
                  </Label>
                  <p className="font-medium">{selectedKYC.first_name} {selectedKYC.last_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date of Birth
                  </Label>
                  <p className="font-medium">
                    {format(new Date(selectedKYC.date_of_birth), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Aadhaar Number (Masked)</Label>
                  <p className="font-mono font-medium">{maskAadhaar(selectedKYC.aadhaar_number)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">PAN Number (Masked)</Label>
                  <p className="font-mono font-medium">{maskPAN(selectedKYC.pan_number)}</p>
                </div>
              </div>

              {/* Documents with Inline Preview */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Uploaded Documents
                </Label>
                <div className="grid gap-4">
                  {/* Aadhaar Front */}
                  {documentUrls?.aadhaar_front && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Aadhaar Front
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewImage(documentUrls.aadhaar_front!)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <a href={documentUrls.aadhaar_front} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/20">
                        <img 
                          src={documentUrls.aadhaar_front} 
                          alt="Aadhaar Front" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.aadhaar_front!)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Aadhaar Back */}
                  {documentUrls?.aadhaar_back && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Aadhaar Back
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewImage(documentUrls.aadhaar_back!)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <a href={documentUrls.aadhaar_back} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/20">
                        <img 
                          src={documentUrls.aadhaar_back} 
                          alt="Aadhaar Back" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.aadhaar_back!)}
                        />
                      </div>
                    </div>
                  )}

                  {/* PAN */}
                  {documentUrls?.pan && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" /> PAN Card
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewImage(documentUrls.pan!)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <a href={documentUrls.pan} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/20">
                        <img 
                          src={documentUrls.pan} 
                          alt="PAN Card" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.pan!)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bank Statement */}
                  {documentUrls?.bank_statement && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Building className="w-4 h-4" /> Bank Statement
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewImage(documentUrls.bank_statement!)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <a href={documentUrls.bank_statement} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/20">
                        <img 
                          src={documentUrls.bank_statement} 
                          alt="Bank Statement" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.bank_statement!)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Face Image */}
                  {documentUrls?.face_image && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Camera className="w-4 h-4" /> Face Photo
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewImage(documentUrls.face_image!)}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <a href={documentUrls.face_image} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="p-2 bg-muted/20">
                        <img 
                          src={documentUrls.face_image} 
                          alt="Face Photo" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.face_image!)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedKYC.status === 'submitted' && (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isApproving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve KYC
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setIsRejectDialogOpen(true)}
                      disabled={isRejecting}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedKYC.status !== 'submitted' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('submitted')}
                    disabled={isUpdatingStatus}
                  >
                    Reset to Pending
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteClick(selectedKYC)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Reject KYC Submission
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete KYC Submission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this KYC submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {kycToDelete && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{kycToDelete.first_name} {kycToDelete.last_name}</p>
              <p className="text-sm text-muted-foreground">{kycToDelete.profiles?.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <img
                src={previewImage}
                alt="Document Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default AdminKYC;
