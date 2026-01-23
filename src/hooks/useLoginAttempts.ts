import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  attempted_at: string;
  was_successful: boolean;
}

interface BlockedEntity {
  identifier: string;
  type: 'email' | 'ip';
  failed_attempts: number;
  last_attempt: string;
  is_blocked: boolean;
  unblock_at: string | null;
}

interface LoginAttemptStats {
  total_attempts_24h: number;
  failed_attempts_24h: number;
  successful_attempts_24h: number;
  unique_ips_24h: number;
  unique_emails_24h: number;
  blocked_count: number;
}

export const useLoginAttempts = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Fetch recent login attempts
  const { data: attempts = [], isLoading: attemptsLoading, refetch } = useQuery({
    queryKey: ['admin-login-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as LoginAttempt[];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate stats
  const stats: LoginAttemptStats = {
    total_attempts_24h: attempts.length,
    failed_attempts_24h: attempts.filter(a => !a.was_successful).length,
    successful_attempts_24h: attempts.filter(a => a.was_successful).length,
    unique_ips_24h: new Set(attempts.filter(a => a.ip_address).map(a => a.ip_address)).size,
    unique_emails_24h: new Set(attempts.map(a => a.email)).size,
    blocked_count: 0, // Will be calculated from blocked entities
  };

  // Calculate blocked entities (emails/IPs with 5+ failed attempts in last 15 min)
  const blockedEntities: BlockedEntity[] = [];
  const now = new Date();
  const windowMinutes = 15;
  const lockoutMinutes = 30;
  const maxAttempts = 5;
  const maxIpAttempts = 10;

  // Group failed attempts by email in the window
  const emailFailures = new Map<string, { count: number; lastAttempt: Date }>();
  const ipFailures = new Map<string, { count: number; lastAttempt: Date }>();

  attempts
    .filter(a => !a.was_successful)
    .forEach(attempt => {
      const attemptDate = new Date(attempt.attempted_at);
      const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

      if (attemptDate >= windowStart) {
        // Email tracking
        const existing = emailFailures.get(attempt.email);
        if (existing) {
          existing.count++;
          if (attemptDate > existing.lastAttempt) {
            existing.lastAttempt = attemptDate;
          }
        } else {
          emailFailures.set(attempt.email, { count: 1, lastAttempt: attemptDate });
        }

        // IP tracking
        if (attempt.ip_address) {
          const existingIp = ipFailures.get(attempt.ip_address);
          if (existingIp) {
            existingIp.count++;
            if (attemptDate > existingIp.lastAttempt) {
              existingIp.lastAttempt = attemptDate;
            }
          } else {
            ipFailures.set(attempt.ip_address, { count: 1, lastAttempt: attemptDate });
          }
        }
      }
    });

  // Build blocked entities list
  emailFailures.forEach((data, email) => {
    const isBlocked = data.count >= maxAttempts;
    const unblockAt = isBlocked 
      ? new Date(data.lastAttempt.getTime() + lockoutMinutes * 60 * 1000)
      : null;
    
    blockedEntities.push({
      identifier: email,
      type: 'email',
      failed_attempts: data.count,
      last_attempt: data.lastAttempt.toISOString(),
      is_blocked: isBlocked && (unblockAt ? unblockAt > now : true),
      unblock_at: unblockAt?.toISOString() || null,
    });
  });

  ipFailures.forEach((data, ip) => {
    const isBlocked = data.count >= maxIpAttempts;
    const unblockAt = isBlocked 
      ? new Date(data.lastAttempt.getTime() + lockoutMinutes * 60 * 1000)
      : null;
    
    blockedEntities.push({
      identifier: ip,
      type: 'ip',
      failed_attempts: data.count,
      last_attempt: data.lastAttempt.toISOString(),
      is_blocked: isBlocked && (unblockAt ? unblockAt > now : true),
      unblock_at: unblockAt?.toISOString() || null,
    });
  });

  // Sort by blocked status and attempt count
  blockedEntities.sort((a, b) => {
    if (a.is_blocked !== b.is_blocked) return a.is_blocked ? -1 : 1;
    return b.failed_attempts - a.failed_attempts;
  });

  stats.blocked_count = blockedEntities.filter(e => e.is_blocked).length;

  // Delete old attempts (cleanup)
  const cleanupAttempts = async () => {
    try {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('login_attempts')
        .delete()
        .lt('attempted_at', cutoff);
    } catch (error) {
      console.error('Failed to cleanup login attempts:', error);
    }
  };

  return {
    attempts,
    blockedEntities,
    stats,
    isLoading: attemptsLoading,
    refetch,
    cleanupAttempts,
  };
};
