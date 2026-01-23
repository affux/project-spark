import React from 'react';
import { useKYC } from '@/hooks/useKYC';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  not_submitted: {
    icon: AlertCircle,
    color: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    badgeColor: 'bg-amber-500/20 text-amber-700',
    title: 'KYC Required',
    description: 'Please complete your KYC verification to unlock all features including wallet withdrawals.',
  },
  submitted: {
    icon: Clock,
    color: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
    badgeColor: 'bg-blue-500/20 text-blue-700',
    title: 'KYC Under Review',
    description: 'Your KYC documents are being reviewed. This usually takes 1-2 business days.',
  },
  approved: {
    icon: CheckCircle,
    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    badgeColor: 'bg-emerald-500/20 text-emerald-700',
    title: 'KYC Verified',
    description: 'Your identity has been verified. You have full access to all features.',
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
    badgeColor: 'bg-red-500/20 text-red-700',
    title: 'KYC Rejected',
    description: 'Your KYC submission was rejected. Please review and resubmit.',
  },
};

interface KYCStatusBannerProps {
  compact?: boolean;
}

export const KYCStatusBanner: React.FC<KYCStatusBannerProps> = ({ compact = false }) => {
  const { kycStatus, kycSubmission, canSubmitKYC, isLoading } = useKYC();

  if (isLoading) return null;
  if (kycStatus === 'approved' && compact) return null;

  const config = statusConfig[kycStatus];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("rounded-lg border p-4", config.color)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">{config.title}</p>
              {kycStatus === 'rejected' && kycSubmission?.rejection_reason && (
                <p className="text-sm opacity-80">Reason: {kycSubmission.rejection_reason}</p>
              )}
            </div>
          </div>
          {canSubmitKYC && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard/kyc">
                <FileText className="w-4 h-4 mr-2" />
                {kycStatus === 'rejected' ? 'Resubmit' : 'Submit'} KYC
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-6", config.color)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{config.title}</h3>
              <Badge className={config.badgeColor}>{kycStatus.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm opacity-80">{config.description}</p>
            {kycStatus === 'rejected' && kycSubmission?.rejection_reason && (
              <p className="text-sm mt-2 font-medium">
                Rejection reason: {kycSubmission.rejection_reason}
              </p>
            )}
          </div>
        </div>
        {canSubmitKYC && (
          <Button asChild>
            <Link to="/dashboard/kyc">
              <FileText className="w-4 h-4 mr-2" />
              {kycStatus === 'rejected' ? 'Resubmit' : 'Submit'} KYC
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
