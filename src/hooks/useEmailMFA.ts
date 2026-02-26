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
      const { data, error } = await supabase.functions.invoke('send-mfa-email', {
        body: { userId, email },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send verification code');
      }

      if (data?.error) {
        throw new Error(data.error);
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
      const { data, error } = await supabase.functions.invoke('send-mfa-email', {
        body: { userId, code },
      });

      if (error) {
        throw new Error(error.message || 'Invalid verification code');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid verification code');
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
