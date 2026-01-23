import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Image as ImageIcon, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useMyProofs, ProofOfWork } from '@/hooks/useProofOfWork';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProofImageGallery } from './ProofImageGallery';

const statusConfig = {
  pending: {
    label: 'Pending',
    variant: 'outline' as const,
    icon: Clock,
    className: 'border-amber-500 text-amber-600',
  },
  approved: {
    label: 'Approved',
    variant: 'default' as const,
    icon: CheckCircle,
    className: 'bg-green-500 text-white',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive' as const,
    icon: XCircle,
    className: '',
  },
};

export const MyProofsList: React.FC = () => {
  const { data: proofs, isLoading } = useMyProofs();
  const [selectedProof, setSelectedProof] = useState<ProofOfWork | null>(null);

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
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Proofs Submitted Yet</h3>
          <p className="text-muted-foreground">
            Submit your first proof of work to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {proofs.map((proof) => {
          const status = statusConfig[proof.status];
          const StatusIcon = status.icon;

          return (
            <Card key={proof.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{proof.work_title}</h3>
                      <Badge className={cn(status.className)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {format(new Date(proof.created_at), 'PPp')}
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
                        View Link
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
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProof?.work_title}</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={cn(statusConfig[selectedProof.status].className)}>
                  {statusConfig[selectedProof.status].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Submitted {format(new Date(selectedProof.created_at), 'PPp')}
                </span>
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

              {selectedProof.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedProof.notes}</p>
                </div>
              )}

              {selectedProof.admin_remark && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Admin Remark</p>
                  <p className="text-sm text-muted-foreground">{selectedProof.admin_remark}</p>
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
