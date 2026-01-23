import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFAFactor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

interface AALLevel {
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  currentAuthenticationMethods: Array<{ method: string; timestamp: number }>;
}

export const useMFA = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [aalLevel, setAalLevel] = useState<AALLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Combine all factor types
      const allFactors = [...(data.totp || []), ...(data.phone || [])];
      setFactors(allFactors as MFAFactor[]);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    }
  };

  const fetchAAL = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      setAalLevel(data as AALLevel);
    } catch (error) {
      console.error('Error fetching AAL:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchFactors(), fetchAAL()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const startEnrollment = async (friendlyName?: string) => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'DropShip',
        friendlyName: friendlyName || 'Authenticator App',
      });

      if (error) throw error;

      setEnrollmentData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error starting MFA enrollment:', error);
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Failed to start MFA enrollment',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async (code: string) => {
    if (!enrollmentData) {
      return { success: false, error: 'No enrollment in progress' };
    }

    try {
      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId,
      });

      if (challengeError) throw challengeError;

      // Then verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'MFA Enabled',
        description: 'Two-factor authentication has been successfully enabled.',
      });

      setEnrollmentData(null);
      await fetchFactors();
      await fetchAAL();

      return { success: true };
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const cancelEnrollment = async () => {
    if (enrollmentData) {
      // Unenroll the pending factor
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.factorId });
      } catch (error) {
        console.error('Error canceling enrollment:', error);
      }
    }
    setEnrollmentData(null);
  };

  const unenrollFactor = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: 'MFA Disabled',
        description: 'Two-factor authentication has been removed.',
      });

      await fetchFactors();
      await fetchAAL();

      return { success: true };
    } catch (error: any) {
      console.error('Error unenrolling MFA:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove MFA',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const verifyMFA = async (code: string) => {
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factorsData.totp?.[0];
      if (!totpFactor) {
        throw new Error('No TOTP factor found');
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      await fetchAAL();

      return { success: true };
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      return { success: false, error: error.message };
    }
  };

  const hasMFAEnabled = factors.some(f => f.status === 'verified' && f.factor_type === 'totp');
  const needsMFAVerification = aalLevel?.nextLevel === 'aal2' && aalLevel.currentLevel !== 'aal2';

  return {
    factors,
    aalLevel,
    isLoading,
    isEnrolling,
    enrollmentData,
    hasMFAEnabled,
    needsMFAVerification,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    unenrollFactor,
    verifyMFA,
    refresh: () => Promise.all([fetchFactors(), fetchAAL()]),
  };
};
