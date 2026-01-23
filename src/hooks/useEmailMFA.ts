import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEmailMFA = () => {
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const sendEmailCode = useCallback(async (userId: string, email: string): Promise<{ success: boolean; error?: string }> => {
    setIsSendingCode(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mfa-email/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId, email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      toast({
        title: 'Code Sent',
        description: `A verification code has been sent to ${email}`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending email MFA code:', error);
      toast({
        title: 'Failed to Send Code',
        description: error.message || 'Could not send verification code',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsSendingCode(false);
    }
  }, [toast]);

  const verifyEmailCode = useCallback(async (userId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    setIsVerifyingCode(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mfa-email/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId, code }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setCodeSent(false);
      return { success: true };
    } catch (error: any) {
      console.error('Error verifying email MFA code:', error);
      return { success: false, error: error.message };
    } finally {
      setIsVerifyingCode(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setCodeSent(false);
    setIsSendingCode(false);
    setIsVerifyingCode(false);
  }, []);

  return {
    isSendingCode,
    isVerifyingCode,
    codeSent,
    sendEmailCode,
    verifyEmailCode,
    resetState,
  };
};
