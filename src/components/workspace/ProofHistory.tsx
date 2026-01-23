import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ExternalLink, 
  Image as ImageIcon, 
  User, 
  CheckCircle, 
  XCircle,
  Eye,
  History,
  Filter
} from 'lucide-react';
import { useAllProofs, ProofOfWorkWithUser } from '@/hooks/useProofOfWork';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProofImageGallery } from './ProofImageGallery';

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: History,
    className: 'border-amber-500 text-amber-600',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-green-500 text-white',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-destructive text-destructive-foreground',
  },
};

export const ProofHistory: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: proofs, isLoading } = useAllProofs(statusFilter);
  const [selectedProof, setSelectedProof] = useState<ProofOfWorkWithUser | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
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

  return (
    <>
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(!proofs || proofs.length === 0) ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Proofs Found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} proofs found` 
                  : 'No proof submissions yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          proofs.map((proof) => {
            const status = statusConfig[proof.status];
            const StatusIcon = status.icon;

            return (
              <Card key={proof.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground">{proof.work_title}</h3>
                        <Badge className={cn(status.className)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{proof.user_name}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{proof.user_email}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {format(new Date(proof.created_at), 'PPp')}
                        {proof.reviewed_at && (
                          <> • Reviewed: {format(new Date(proof.reviewed_at), 'PPp')}</>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          Open Link
                        </a>
                      </div>
                      {proof.admin_remark && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded-md">
                          <span className="font-medium">Admin Remark:</span> {proof.admin_remark}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProof(proof)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proof Details</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={cn(statusConfig[selectedProof.status].className)}>
                  {statusConfig[selectedProof.status].label}
                </Badge>
              </div>

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
                <p className="text-sm font-medium mb-1">Work Link</p>
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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Submitted</p>
                  <p className="text-muted-foreground">
                    {format(new Date(selectedProof.created_at), 'PPpp')}
                  </p>
                </div>
                {selectedProof.reviewed_at && (
                  <div>
                    <p className="font-medium mb-1">Reviewed</p>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedProof.reviewed_at), 'PPpp')}
                    </p>
                  </div>
                )}
              </div>

              {selectedProof.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">User Notes</p>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedProof.notes}
                  </p>
                </div>
              )}

              {selectedProof.admin_remark && (
                <div>
                  <p className="text-sm font-medium mb-1">Admin Remark</p>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedProof.admin_remark}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-3">Proof Images</p>
                <ProofImageGallery images={selectedProof.proof_images} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
