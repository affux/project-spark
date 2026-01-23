import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KYCForm } from '@/components/kyc/KYCForm';
import { KYCStatusBanner } from '@/components/kyc/KYCStatusBanner';
import { useKYC } from '@/hooks/useKYC';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';

const UserKYC: React.FC = () => {
  const { isLoading } = useKYC();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">KYC Verification</h1>
            <p className="text-muted-foreground">
              Complete your identity verification to unlock all features
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <KYCStatusBanner />

        {/* KYC Form */}
        <KYCForm />
      </div>
    </DashboardLayout>
  );
};

export default UserKYC;
