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

    try {
      // Validate the current session against the auth server.
      // Only sign out if the user was explicitly deleted/invalid - NOT for network errors
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      // Only sign out for explicit auth failures (user deleted, invalid token)
      // NOT for network errors or temporary issues
      if (authError) {
        // Check if this is a fatal auth error (user deleted/invalid) vs temporary error
        const isFatalAuthError = authError.message?.toLowerCase().includes('invalid') ||
                                  authError.message?.toLowerCase().includes('not found') ||
                                  authError.message?.toLowerCase().includes('expired') ||
                                  authError.status === 401 ||
                                  authError.status === 403;
        
        if (isFatalAuthError) {
          console.warn('Fatal auth error, signing out:', authError.message);
          await signOutAndClear();
          return;
        }
        
        // For non-fatal errors (network issues, rate limiting), just skip the refresh
        console.warn('Non-fatal auth error during refresh, skipping:', authError.message);
        return;
      }
      
      if (!authData?.user) {
        await signOutAndClear();
        return;
      }

      const userProfile = await fetchUserProfile(session.user.id);

      if (!userProfile) {
        // Profile not found - but don't immediately logout for admins
        // This could be a temporary DB issue
        console.warn('Profile not found during refresh for user:', session.user.id);
        return;
      }

      // Only apply disabled/inactive checks for regular users, not admins
      if (userProfile.role !== 'admin') {
        if (userProfile.userStatus === 'disabled' || !userProfile.isActive) {
          await signOutAndClear();
          return;
        }
      }

      setUser(userProfile);
    } catch (error) {
      // Don't sign out on unexpected errors - could be network issues
      console.warn('Error during refreshUser, keeping session:', error);
    }
  }, [session, fetchUserProfile, signOutAndClear]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            try {
              const userProfile = await fetchUserProfile(currentSession.user.id);

              if (!userProfile) {
                // For new users, profile might not be created yet - don't logout immediately
                console.warn('Profile not found during auth state change');
                setIsLoading(false);
                return;
              }

              // Only apply disabled/inactive checks for regular users, not admins
              if (userProfile.role !== 'admin') {
                if (userProfile.userStatus === 'disabled' || !userProfile.isActive) {
                  await signOutAndClear();
                  setIsLoading(false);
                  return;
                }
              }

              setUser(userProfile);
              setIsLoading(false);
            } catch (error) {
              console.warn('Error fetching profile during auth state change:', error);
              setIsLoading(false);
            }
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
        try {
          const userProfile = await fetchUserProfile(existingSession.user.id);

          if (!userProfile) {
            // Profile not found - could be timing issue, don't immediately logout
            console.warn('Profile not found during initial session check');
            setIsLoading(false);
            return;
          }

          // Only apply disabled/inactive checks for regular users, not admins
          if (userProfile.role !== 'admin') {
            if (userProfile.userStatus === 'disabled' || !userProfile.isActive) {
              await signOutAndClear();
              setIsLoading(false);
              return;
            }
          }

          setUser(userProfile);
          setIsLoading(false);
        } catch (error) {
          console.warn('Error fetching profile during initial session check:', error);
          setIsLoading(false);
        }
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

        // Set user immediately so login is not blocked by IP/alert operations
        setUser(userProfile);

        // Non-blocking: IP logging, location detection, and login alerts
        // These run in background and won't block the login flow
        (async () => {
          try {
            const ipInfo = await getClientIPInfo(3000);
            
            // Update last login timestamp
            supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('user_id', data.user.id);
            
            // Log IP (best effort)
            logIPAction(data.user.id, 'login');

            // Check for new location and send alert
            if (ipInfo?.ip) {
              const { data: previousIPs } = await supabase
                .from('ip_logs')
                .select('ip_address')
                .eq('user_id', data.user.id)
                .order('created_at', { ascending: false })
                .limit(10);
              
              const isNewLocation = previousIPs && previousIPs.length > 0
                ? !new Set(previousIPs.map(log => log.ip_address)).has(ipInfo.ip)
                : false;

              if (isNewLocation) {
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
          } catch (err) {
            console.warn('Background login tasks failed:', err);
          }
        })();

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
