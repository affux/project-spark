import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheckResult {
  name: string;
  status: 'success' | 'error' | 'pending' | 'warning';
  message: string;
  category: 'edge-function' | 'storage' | 'database' | 'auth';
}

export interface DeploymentHealthState {
  results: HealthCheckResult[];
  isRunning: boolean;
  lastChecked: Date | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

const EDGE_FUNCTIONS = [
  'check-admin-exists',
  'create-first-admin',
  'admin-reset-password',
  'agent-presence-update',
  'ai-support-chat',
  'chat-reassignment',
  'cj-product-search',
  'confirm-user-email',
  'create-public-order',
  'delete-user',
  'manage-admin',
  'process-auto-payouts',
  'process-wallet-payment',
  'reset-user-data',
  'send-chat-failure-notification',
  'send-login-alert',
  'send-mfa-email',
  'send-notification-email',
  'send-postpaid-due-reminder',
  'validate-ifsc',
];

const STORAGE_BUCKETS = [
  { name: 'kyc-documents', isPublic: false },
  { name: 'branding', isPublic: true },
  { name: 'videos', isPublic: true },
  { name: 'payout-documents', isPublic: false },
  { name: 'payment-proofs', isPublic: true },
  { name: 'product-media', isPublic: true },
  { name: 'profile-images', isPublic: true },
  { name: 'proof-images', isPublic: true },
  { name: 'admin-media', isPublic: true },
];

const DATABASE_TABLES = [
  // Core user tables
  'profiles',
  'user_roles',
  'user_preferences',
  'user_notifications',
  'user_rank_reference',
  
  // Products & Storefront
  'products',
  'product_media',
  'product_reviews',
  'storefront_products',
  
  // Orders & Order Chat
  'orders',
  'order_status_history',
  'order_chat_messages',
  'order_chat_audit_logs',
  'order_chat_quick_replies',
  'order_customer_names',
  
  // Wallet & Payouts
  'wallet_transactions',
  'payout_requests',
  'payout_status_history',
  
  // Postpaid
  'postpaid_transactions',
  
  // Crypto
  'crypto_payments',
  
  // Chat & Support
  'chat_messages',
  'chat_sessions',
  'chat_ratings',
  'chat_customer_names',
  'chat_reassignment_logs',
  'support_agent_presence',
  'agent_chat_presence',
  
  // KYC
  'kyc_submissions',
  'otp_verifications',
  
  // Security & Auth
  'login_attempts',
  'ip_logs',
  'audit_logs',
  'trusted_devices',
  'email_mfa_codes',
  'force_logout_events',
  
  // Platform Settings & Messages
  'platform_settings',
  'popup_messages',
  'popup_message_targets',
  'popup_acknowledgments',
  'dashboard_messages',
  'dashboard_message_targets',
  
  // Workspace & Proof of Work
  'proof_of_work',
  'work_types',
  'work_type_categories',
  'video_tutorial_completions',
  
  // Other
  'indian_names',
  'custom_payment_methods',
  'top_dropshippers',
];

export const useDeploymentHealth = () => {
  const [state, setState] = useState<DeploymentHealthState>({
    results: [],
    isRunning: false,
    lastChecked: null,
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  });

  const addResult = useCallback((result: HealthCheckResult) => {
    setState((prev) => ({
      ...prev,
      results: [...prev.results, result],
    }));
  }, []);

  const checkEdgeFunction = async (name: string): Promise<HealthCheckResult> => {
    try {
      // For check-admin-exists, we can actually call it
      if (name === 'check-admin-exists') {
        const { error } = await supabase.functions.invoke(name);
        if (error) {
          return {
            name: `Edge Function: ${name}`,
            status: 'error',
            message: `Failed: ${error.message}`,
            category: 'edge-function',
          };
        }
        return {
          name: `Edge Function: ${name}`,
          status: 'success',
          message: 'Responding correctly',
          category: 'edge-function',
        };
      }

      // For other functions, try a simple GET with empty body to check if deployed
      // Most auth-required functions will return 401 which still means they're deployed
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({}),
          }
        );
        
        // Any response (including 401, 400, etc.) means the function is deployed
        if (response.status === 401 || response.status === 403) {
          return {
            name: `Edge Function: ${name}`,
            status: 'success',
            message: 'Deployed (requires authentication)',
            category: 'edge-function',
          };
        }
        
        if (response.ok || response.status < 500) {
          return {
            name: `Edge Function: ${name}`,
            status: 'success',
            message: 'Deployed and responding',
            category: 'edge-function',
          };
        }
        
        return {
          name: `Edge Function: ${name}`,
          status: 'warning',
          message: `Deployed but returned ${response.status}`,
          category: 'edge-function',
        };
      } catch {
        return {
          name: `Edge Function: ${name}`,
          status: 'error',
          message: 'Not deployed or unreachable',
          category: 'edge-function',
        };
      }
    } catch (err) {
      return {
        name: `Edge Function: ${name}`,
        status: 'error',
        message: `Not deployed or unreachable`,
        category: 'edge-function',
      };
    }
  };

  const checkStorageBucket = async (
    bucketName: string,
    isPublic: boolean
  ): Promise<HealthCheckResult> => {
    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      
      if (error) {
        return {
          name: `Storage: ${bucketName}`,
          status: 'error',
          message: `Bucket not found: ${error.message}`,
          category: 'storage',
        };
      }

      if (data.public !== isPublic) {
        return {
          name: `Storage: ${bucketName}`,
          status: 'warning',
          message: `Exists but public setting mismatch (expected: ${isPublic}, got: ${data.public})`,
          category: 'storage',
        };
      }

      return {
        name: `Storage: ${bucketName}`,
        status: 'success',
        message: `Configured correctly (public: ${data.public})`,
        category: 'storage',
      };
    } catch (err) {
      return {
        name: `Storage: ${bucketName}`,
        status: 'error',
        message: 'Failed to check bucket',
        category: 'storage',
      };
    }
  };

  const checkDatabaseTable = async (tableName: string): Promise<HealthCheckResult> => {
    try {
      // Try to query the table with limit 0 to just check if it exists
      const { error } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true });

      if (error) {
        // Check if it's an RLS error (table exists but no access)
        if (error.message.includes('RLS') || error.code === '42501') {
          return {
            name: `Table: ${tableName}`,
            status: 'success',
            message: 'Exists with RLS enabled',
            category: 'database',
          };
        }
        
        return {
          name: `Table: ${tableName}`,
          status: 'error',
          message: `Error: ${error.message}`,
          category: 'database',
        };
      }

      return {
        name: `Table: ${tableName}`,
        status: 'success',
        message: 'Exists and accessible',
        category: 'database',
      };
    } catch (err) {
      return {
        name: `Table: ${tableName}`,
        status: 'error',
        message: 'Table not found or inaccessible',
        category: 'database',
      };
    }
  };

  const checkAuth = async (): Promise<HealthCheckResult> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          name: 'Authentication Service',
          status: 'error',
          message: `Auth error: ${error.message}`,
          category: 'auth',
        };
      }

      if (data.session) {
        return {
          name: 'Authentication Service',
          status: 'success',
          message: 'Connected and authenticated',
          category: 'auth',
        };
      }

      return {
        name: 'Authentication Service',
        status: 'success',
        message: 'Connected (no active session)',
        category: 'auth',
      };
    } catch (err) {
      return {
        name: 'Authentication Service',
        status: 'error',
        message: 'Failed to connect to auth service',
        category: 'auth',
      };
    }
  };

  const runHealthCheck = useCallback(async () => {
    setState({
      results: [],
      isRunning: true,
      lastChecked: null,
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
    });

    const allResults: HealthCheckResult[] = [];

    // Check Auth first
    const authResult = await checkAuth();
    allResults.push(authResult);

    // Check Edge Functions (parallel, batch of 5)
    for (let i = 0; i < EDGE_FUNCTIONS.length; i += 5) {
      const batch = EDGE_FUNCTIONS.slice(i, i + 5);
      const results = await Promise.all(batch.map(checkEdgeFunction));
      allResults.push(...results);
    }

    // Check Storage Buckets (parallel)
    const storageResults = await Promise.all(
      STORAGE_BUCKETS.map((b) => checkStorageBucket(b.name, b.isPublic))
    );
    allResults.push(...storageResults);

    // Check Database Tables (parallel, batch of 10)
    for (let i = 0; i < DATABASE_TABLES.length; i += 10) {
      const batch = DATABASE_TABLES.slice(i, i + 10);
      const results = await Promise.all(batch.map(checkDatabaseTable));
      allResults.push(...results);
    }

    // Calculate summary
    const summary = {
      total: allResults.length,
      passed: allResults.filter((r) => r.status === 'success').length,
      failed: allResults.filter((r) => r.status === 'error').length,
      warnings: allResults.filter((r) => r.status === 'warning').length,
    };

    setState({
      results: allResults,
      isRunning: false,
      lastChecked: new Date(),
      summary,
    });
  }, []);

  return {
    ...state,
    runHealthCheck,
  };
};
