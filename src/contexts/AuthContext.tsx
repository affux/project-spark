import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logIPAction, getClientIPInfo } from '@/hooks/useIPLogger';

type UserRole = 'admin' | 'user';
type UserStatus = 'pending' | 'approved' | 'disabled';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  userStatus: UserStatus;
  storefrontSlug?: string;
  storefrontName?: string;
  isActive: boolean;
  createdAt: string;
  walletBalance: number;
  commissionOverride: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; userId?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOutAndClear = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        return null;
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      const role: UserRole = roleData?.role || 'user';

      return {
        id: userId,
        email: profile.email,
        name: profile.name,
        role,
        userStatus: (profile.user_status as UserStatus) || 'pending',
        storefrontSlug: profile.storefront_slug || undefined,
        storefrontName: profile.storefront_name || undefined,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        walletBalance: Number(profile.wallet_balance) || 0,
        commissionOverride: profile.commission_override ? Number(profile.commission_override) : null,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session?.user) return;

    // Validate the current session against the auth server.
    // If the user was deleted, this will fail and we immediately sign out.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      await signOutAndClear();
      return;
    }

    const userProfile = await fetchUserProfile(session.user.id);

    if (!userProfile) {
      await signOutAndClear();
      return;
    }

    if (userProfile.userStatus === 'disabled' || (!userProfile.isActive && userProfile.role === 'user')) {
      await signOutAndClear();
      return;
    }

    setUser(userProfile);
  }, [session, fetchUserProfile, signOutAndClear]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(currentSession.user.id);

            if (!userProfile) {
              await signOutAndClear();
              setIsLoading(false);
              return;
            }

            if (userProfile.userStatus === 'disabled' || (!userProfile.isActive && userProfile.role === 'user')) {
              await signOutAndClear();
              setIsLoading(false);
              return;
            }

            setUser(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);

      if (existingSession?.user) {
        const userProfile = await fetchUserProfile(existingSession.user.id);

        if (!userProfile) {
          await signOutAndClear();
          setIsLoading(false);
          return;
        }

        if (userProfile.userStatus === 'disabled' || (!userProfile.isActive && userProfile.role === 'user')) {
          await signOutAndClear();
          setIsLoading(false);
          return;
        }

        setUser(userProfile);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, signOutAndClear]);

  // Listen for force logout events in real-time
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('force-logout-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'force_logout_events',
          filter: `user_id=eq.${session.user.id}`,
        },
        async (payload) => {
          console.log('Force logout event received:', payload);
          // Immediately sign out the user
          await signOutAndClear();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, signOutAndClear]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Set session persistence based on rememberMe
      // When rememberMe is true, session persists across browser restarts
      // When false, session only lasts for the browser session
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id);

        // If the auth account exists but the profile is missing (e.g. deleted), block access.
        if (!userProfile) {
          await supabase.auth.signOut();
          return { success: false, error: 'Account not found. Please contact admin.' };
        }

        // Check if user is disabled
        if (userProfile.userStatus === 'disabled') {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been disabled. Please contact admin.' };
        }

        if (!userProfile.isActive && userProfile.role === 'user') {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
        }

        // Get current IP info for new location detection
        const ipInfo = await getClientIPInfo();
        
        // Check if this is a new location by comparing with previous IPs
        let isNewLocation = false;
        if (ipInfo?.ip) {
          const { data: previousIPs } = await supabase
            .from('ip_logs')
            .select('ip_address')
            .eq('user_id', data.user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (previousIPs && previousIPs.length > 0) {
            const knownIPs = new Set(previousIPs.map(log => log.ip_address));
            isNewLocation = !knownIPs.has(ipInfo.ip);
          }
        }

        // Log IP address on login (best effort - won't fail login if it fails)
        logIPAction(data.user.id, 'login').then(() => {
          supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('user_id', data.user.id);
        });

        // Send login alert email for new location (non-blocking)
        if (ipInfo?.ip) {
          const shouldSendAlert = isNewLocation; // Only send for new locations
          if (shouldSendAlert) {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-login-alert`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                userId: data.user.id,
                email: userProfile.email,
                userName: userProfile.name,
                ipAddress: ipInfo.ip,
                city: ipInfo.city,
                region: ipInfo.region,
                country: ipInfo.country,
                isNewLocation: true,
              }),
            }).catch(err => console.error('Failed to send login alert:', err));
          }
        }

        setUser(userProfile);
        return { success: true, userId: data.user.id };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [fetchUserProfile]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        const userProfile = await fetchUserProfile(data.user.id);
        setUser(userProfile);
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(async () => {
    // Log IP on logout before signing out
    if (session?.user?.id) {
      await logIPAction(session.user.id, 'logout');
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [session?.user?.id]);

  const isApproved = user?.role === 'admin' || user?.userStatus === 'approved';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!session && !!user, 
      isLoading,
      isApproved,
      login, 
      signup,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
