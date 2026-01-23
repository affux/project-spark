import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getClientIPInfo } from '@/hooks/useIPLogger';

interface RateLimitResult {
  blocked: boolean;
  remaining_attempts: number;
  retry_after_seconds: number;
  reason: string | null;
}

export const useLoginRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitResult | null>(null);

  const checkRateLimit = useCallback(async (email: string): Promise<RateLimitResult> => {
    setIsChecking(true);
    try {
      const ipInfo = await getClientIPInfo();
      const ipAddress = ipInfo?.ip || null;

      const { data, error } = await supabase.rpc('check_login_rate_limit', {
        _email: email,
        _ip_address: ipAddress,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // If check fails, allow the attempt (fail open for UX)
        return {
          blocked: false,
          remaining_attempts: 5,
          retry_after_seconds: 0,
          reason: null,
        };
      }

      const result = data as unknown as RateLimitResult;
      setRateLimitInfo(result);
      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return {
        blocked: false,
        remaining_attempts: 5,
        retry_after_seconds: 0,
        reason: null,
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const recordAttempt = useCallback(async (email: string, wasSuccessful: boolean): Promise<void> => {
    try {
      const ipInfo = await getClientIPInfo();
      const ipAddress = ipInfo?.ip || null;

      await supabase.rpc('record_login_attempt', {
        _email: email,
        _ip_address: ipAddress,
        _was_successful: wasSuccessful,
      });
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }, []);

  const formatRetryTime = (seconds: number): string => {
    if (seconds <= 0) return '';
    const minutes = Math.ceil(seconds / 60);
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  const clearRateLimitInfo = useCallback(() => {
    setRateLimitInfo(null);
  }, []);

  return {
    checkRateLimit,
    recordAttempt,
    isChecking,
    rateLimitInfo,
    formatRetryTime,
    clearRateLimitInfo,
  };
};
