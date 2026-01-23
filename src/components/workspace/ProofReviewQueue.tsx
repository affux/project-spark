import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ExternalLink, 
  Image as ImageIcon, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  Eye,
  Loader2,
  CheckSquare,
  ShoppingBag
} from 'lucide-react';
import { useAllProofs, useUpdateProofStatus, useBulkUpdateProofStatus, ProofOfWorkWithUser } from '@/hooks/useProofOfWork';
import { format } from 'date-fns';
import { ProofImageGallery } from './ProofImageGallery';
import { cn } from '@/lib/utils';

export const ProofReviewQueue: React.FC = () => {
  const { data: proofs, isLoading } = useAllProofs('pending');
  const updateStatus = useUpdateProofStatus();
  const bulkUpdate = useBulkUpdateProofStatus();
  const [selectedProof, setSelectedProof] = useState<ProofOfWorkWithUser | null>(null);
  const [adminRemark, setAdminRemark] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkRemark, setBulkRemark] = useState('');

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedProof) return;
    
    await updateStatus.mutateAsync({
      proofId: selectedProof.id,
      status,
      admin_remark: adminRemark || undefined,
      userName: selectedProof.user_name,
      userEmail: selectedProof.user_email,
      workTitle: selectedProof.work_title,
      userId: selectedProof.user_id,
    });

    setSelectedProof(null);
    setAdminRemark('');
    setActionType(null);
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedIds.size === 0 || !proofs) return;

    await bulkUpdate.mutateAsync({
      proofIds: Array.from(selectedIds),
      status,
      admin_remark: bulkRemark || undefined,
      proofs,
    });

    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkRemark('');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!proofs) return;
    if (selectedIds.size === proofs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(proofs.map((p) => p.id)));
    }
  };

  const openActionModal = (proof: ProofOfWorkWithUser, action: 'approve' | 'reject') => {
    setSelectedProof(proof);
    setActionType(action);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!proofs || proofs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">
            No pending proofs to review at the moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {proofs.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === proofs.length && proofs.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 
                ? `${selectedIds.size} selected` 
                : 'Select all'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setBulkAction('approve')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkAction('reject')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Selected
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {proofs.map((proof) => (
          <Card 
            key={proof.id} 
            className={cn(
              "hover:shadow-md transition-shadow",
              selectedIds.has(proof.id) && "ring-2 ring-primary"
            )}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(proof.id)}
                    onCheckedChange={() => toggleSelect(proof.id)}
                    className="mt-1"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-foreground">{proof.work_title}</h3>
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{proof.user_name}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{proof.user_email}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {format(new Date(proof.created_at), 'PPp')}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {proof.proof_images.length} image{proof.proof_images.length !== 1 ? 's' : ''}
                      </span>
                      <a
                        href={proof.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Video/Post Link
                      </a>
                      {proof.product_link && (
                        <a
                          href={proof.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary transition-colors text-orange-600"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Product Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-7 lg:ml-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProof(proof);
                      setActionType(null);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => openActionModal(proof, 'approve')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openActionModal(proof, 'reject')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Detail Modal */}
      <Dialog 
        open={!!selectedProof && !actionType} 
        onOpenChange={() => setSelectedProof(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Proof of Work</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Work Title</p>
                  <p className="text-foreground">{selectedProof.work_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Submitted By</p>
                  <p className="text-foreground">{selectedProof.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProof.user_email}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Video / Post Link</p>
                <a
                  href={selectedProof.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {selectedProof.link_url}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {selectedProof.product_link && (
                <div>
                  <p className="text-sm font-medium mb-1">Product Link</p>
                  <a
                    href={selectedProof.product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline flex items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4 mr-1" />
                    {selectedProof.product_link}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {selectedProof.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">User Notes</p>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedProof.notes}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-3">Proof Images</p>
                <ProofImageGallery images={selectedProof.proof_images} />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setActionType('approve')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setActionType('reject')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Modal */}
      <Dialog 
        open={!!selectedProof && !!actionType} 
        onOpenChange={() => {
          setActionType(null);
          setAdminRemark('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Proof of Work
            </DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedProof.work_title}</p>
                <p className="text-sm text-muted-foreground">by {selectedProof.user_name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-remark">Admin Remark (Optional)</Label>
                <Textarea
                  id="admin-remark"
                  placeholder="Add a remark for the user..."
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionType(null);
                    setAdminRemark('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => handleAction(actionType === 'approve' ? 'approved' : 'rejected')}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : actionType === 'approve' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modal */}
      <Dialog 
        open={!!bulkAction} 
        onOpenChange={() => {
          setBulkAction(null);
          setBulkRemark('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <CheckSquare className="w-5 h-5 inline mr-2" />
              Bulk {bulkAction === 'approve' ? 'Approve' : 'Reject'} ({selectedIds.size} items)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to {bulkAction} {selectedIds.size} proof submission(s).
              Email notifications will be sent to all affected users.
            </p>

            <div className="space-y-2">
              <Label htmlFor="bulk-remark">Admin Remark (Optional - applies to all)</Label>
              <Textarea
                id="bulk-remark"
                placeholder="Add a remark for all selected users..."
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkAction(null);
                  setBulkRemark('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant={bulkAction === 'approve' ? 'default' : 'destructive'}
                className={bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => handleBulkAction(bulkAction === 'approve' ? 'approved' : 'rejected')}
                disabled={bulkUpdate.isPending}
              >
                {bulkUpdate.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : bulkAction === 'approve' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {bulkAction === 'approve' ? 'Approve All' : 'Reject All'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
