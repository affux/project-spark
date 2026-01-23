import { supabase } from '@/integrations/supabase/client';

export type IPActionType = 'login' | 'logout' | 'order_placed' | 'payout_request' | 'profile_update';

interface IPInfo {
  ip: string;
  country?: string;
  city?: string;
  region?: string;
}

let cachedIPInfo: IPInfo | null = null;

// Use multiple fallback services for IP detection
const ipServices = [
  {
    url: 'https://ipapi.co/json/',
    parse: (data: any): IPInfo => ({
      ip: data.ip,
      country: data.country_name,
      city: data.city,
      region: data.region,
    }),
  },
  {
    url: 'https://ip-api.com/json/?fields=query,country,city,regionName',
    parse: (data: any): IPInfo => ({
      ip: data.query,
      country: data.country,
      city: data.city,
      region: data.regionName,
    }),
  },
  {
    url: 'https://api.ipify.org?format=json',
    parse: (data: any): IPInfo => ({
      ip: data.ip,
    }),
  },
];

export const getClientIPInfo = async (): Promise<IPInfo | null> => {
  if (cachedIPInfo) return cachedIPInfo;
  
  for (const service of ipServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(service.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        cachedIPInfo = service.parse(data);
        console.log('IP info captured:', cachedIPInfo);
        return cachedIPInfo;
      }
    } catch (error) {
      console.warn(`Failed to fetch IP from ${service.url}:`, error);
      // Continue to next service
    }
  }
  
  console.error('All IP services failed');
  return null;
};

// Legacy function for backwards compatibility
export const getClientIP = async (): Promise<string | null> => {
  const info = await getClientIPInfo();
  return info?.ip || null;
};

export const logIPAction = async (
  userId: string,
  actionType: IPActionType
): Promise<boolean> => {
  try {
    const ipInfo = await getClientIPInfo();
    if (!ipInfo?.ip) {
      console.error('Could not get IP address for logging');
      return false;
    }

    console.log('Logging IP action:', { userId, actionType, ipInfo });

    // Use the secure SECURITY DEFINER function instead of direct insert
    const { error } = await supabase.rpc('log_ip_action', {
      _user_id: userId,
      _ip_address: ipInfo.ip,
      _action_type: actionType,
      _country: ipInfo.country || null,
      _city: ipInfo.city || null,
      _region: ipInfo.region || null,
    });

    if (error) {
      console.error('Failed to log IP action:', error);
      return false;
    }

    // Also update the latest IP on the profile
    await supabase
      .from('profiles')
      .update({ last_ip_address: ipInfo.ip })
      .eq('user_id', userId);

    console.log('IP action logged successfully');
    return true;
  } catch (error) {
    console.error('Error logging IP action:', error);
    return false;
  }
};

export const useIPLogger = () => {
  return { logIPAction, getClientIP, getClientIPInfo };
};
