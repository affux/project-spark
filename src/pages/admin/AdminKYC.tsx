import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAdminKYC, type KYCWithProfile, type KYCDocumentUrls } from '@/hooks/useAdminKYC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/lib/exportUtils';

const statusColors: Record<string, string> = {
  not_submitted: 'bg-gray-500/10 text-gray-600',
  submitted: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-red-500/10 text-red-600',
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedKYC, setSelectedKYC] = useState<KYCWithProfile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentUrls, setDocumentUrls] = useState<KYCDocumentUrls | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [kycToDelete, setKycToDelete] = useState<KYCWithProfile | null>(null);

  const filteredSubmissions = kycSubmissions.filter(kyc => {
    const matchesSearch = 
      kyc.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kyc.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kyc.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || kyc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewKYC = async (kyc: KYCWithProfile) => {
    setSelectedKYC(kyc);
    setIsViewDialogOpen(true);

    // Load all document URLs
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>
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
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 text-base px-4 py-2">
              {pendingCount} Pending Reviews
            </Badge>
          )}
          <Button onClick={handleDownloadAll} variant="outline" disabled={filteredSubmissions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="dashboard-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No KYC submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((kyc) => (
                  <TableRow key={kyc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{kyc.profiles?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{kyc.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {kyc.first_name} {kyc.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(kyc.submitted_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", statusColors[kyc.status])}>
                        {statusIcons[kyc.status]}
                        {kyc.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadKYC(kyc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewKYC(kyc)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(kyc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

                  {/* PAN Card */}
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
                          <Camera className="w-4 h-4" /> Face Image
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
                          alt="Face Image" 
                          className="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(documentUrls.face_image!)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Info */}
              <div className="text-sm text-muted-foreground border-t pt-4">
                <p>Submitted: {format(new Date(selectedKYC.submitted_at), 'MMM d, yyyy h:mm a')}</p>
                {selectedKYC.reviewed_at && (
                  <p>Reviewed: {format(new Date(selectedKYC.reviewed_at), 'MMM d, yyyy h:mm a')}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Change Status:</Label>
              <Select 
                value={selectedKYC?.status} 
                onValueChange={(value: 'submitted' | 'approved' | 'rejected') => handleStatusChange(value)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedKYC && handleDeleteClick(selectedKYC)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              {selectedKYC?.status === 'submitted' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={isRejecting}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
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
                    Approve
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Reject KYC</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this KYC submission. The user will see this reason and can resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
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
              Confirm Rejection
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
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p><strong>User:</strong> {kycToDelete.profiles?.name || 'Unknown'}</p>
              <p><strong>Email:</strong> {kycToDelete.profiles?.email || 'N/A'}</p>
              <p><strong>Name:</strong> {kycToDelete.first_name} {kycToDelete.last_name}</p>
              <p><strong>Status:</strong> {kycToDelete.status}</p>
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
              Delete KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminKYC;
