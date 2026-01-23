import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEVICE_TOKEN_KEY = 'dropship_device_token';

// Generate a unique device token
const generateDeviceToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Get device name from user agent
const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'iOS Device';
  } else if (/Android/.test(ua)) {
    return 'Android Device';
  } else if (/Windows/.test(ua)) {
    return 'Windows PC';
  } else if (/Mac/.test(ua)) {
    return 'Mac';
  } else if (/Linux/.test(ua)) {
    return 'Linux PC';
  }
  
  return 'Unknown Device';
};

export const useTrustedDevice = () => {
  const [isTrustedDevice, setIsTrustedDevice] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if current device is trusted
  const checkTrustedDevice = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      
      if (!storedToken) {
        setIsTrustedDevice(false);
        return false;
      }

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('device_token', storedToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        // Token expired or not found, clean up
        localStorage.removeItem(DEVICE_TOKEN_KEY);
        setIsTrustedDevice(false);
        return false;
      }

      // Update last used timestamp
      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      setIsTrustedDevice(true);
      return true;
    } catch (error) {
      console.error('Error checking trusted device:', error);
      setIsTrustedDevice(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Trust the current device for 30 days
  const trustDevice = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const deviceToken = generateDeviceToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { error } = await supabase
        .from('trusted_devices')
        .insert({
          user_id: userId,
          device_token: deviceToken,
          device_name: getDeviceName(),
          user_agent: navigator.userAgent,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Error trusting device:', error);
        return false;
      }

      localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
      setIsTrustedDevice(true);
      return true;
    } catch (error) {
      console.error('Error trusting device:', error);
      return false;
    }
  }, []);

  // Remove trust from current device
  const untrustDevice = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      
      if (storedToken) {
        await supabase
          .from('trusted_devices')
          .delete()
          .eq('user_id', userId)
          .eq('device_token', storedToken);
      }

      localStorage.removeItem(DEVICE_TOKEN_KEY);
      setIsTrustedDevice(false);
      return true;
    } catch (error) {
      console.error('Error untrusting device:', error);
      return false;
    }
  }, []);

  // Remove all trusted devices for a user
  const removeAllTrustedDevices = useCallback(async (userId: string): Promise<boolean> => {
    try {
      await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId);

      localStorage.removeItem(DEVICE_TOKEN_KEY);
      setIsTrustedDevice(false);
      return true;
    } catch (error) {
      console.error('Error removing all trusted devices:', error);
      return false;
    }
  }, []);

  // Get all trusted devices for a user
  const getTrustedDevices = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('Error fetching trusted devices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
      return [];
    }
  }, []);

  return {
    isTrustedDevice,
    isChecking,
    checkTrustedDevice,
    trustDevice,
    untrustDevice,
    removeAllTrustedDevices,
    getTrustedDevices,
  };
};
