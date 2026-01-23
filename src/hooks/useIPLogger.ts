import { supabase } from '@/integrations/supabase/client';

export type IPActionType = 'login' | 'logout' | 'order_placed' | 'payout_request' | 'profile_update' | 'postpaid_repayment' | 'crypto_payment' | 'payment_details_update';

export interface IPInfo {
  ip: string;
  country?: string | null;
  city?: string | null;
  region?: string | null;
}

let cachedIPInfo: IPInfo | null = null;

// Fetch client IP from backend (reliable, no 3rd-party IP services)
export const getClientIPInfo = async (): Promise<IPInfo | null> => {
  if (cachedIPInfo) return cachedIPInfo;

  try {
    const { data, error } = await supabase.functions.invoke('get-client-ip');
    if (error) {
      console.warn('Failed to get client IP:', error.message);
      return null;
    }

    const ip = (data as any)?.ip as string | null | undefined;
    if (!ip) return null;

    cachedIPInfo = {
      ip,
      country: (data as any)?.country ?? null,
      region: (data as any)?.region ?? null,
      city: (data as any)?.city ?? null,
    };

    return cachedIPInfo;
  } catch (e) {
    console.warn('Failed to get client IP:', e);
    return null;
  }
};

// Legacy function for backwards compatibility
export const getClientIP = async (): Promise<string | null> => {
  const info = await getClientIPInfo();
  return info?.ip ?? null;
};

export const logIPAction = async (
  userId: string,
  actionType: IPActionType
): Promise<boolean> => {
  try {
    // Validate inputs
    if (!userId) {
      console.error('Cannot log IP action: userId is required');
      return false;
    }

    // Capture IP server-side from request headers (more reliable than client-side IP services)
    const { data, error } = await supabase.functions.invoke('capture-ip-action', {
      body: { action_type: actionType },
    });

    if (error) {
      console.error('Failed to log IP action:', error.message);
      return false;
    }

    console.log('IP action logged successfully:', data);

    return true;
  } catch (error) {
    console.error('Error logging IP action:', error);
    return false;
  }
};

export const useIPLogger = () => {
  return { logIPAction, getClientIP, getClientIPInfo };
};
