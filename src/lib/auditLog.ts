import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  actionType: string;
  entityType: string;
  entityId: string;
  adminId: string;
  userId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason?: string;
}

/**
 * Helper function to create audit logs with proper typing
 * Uses type assertion to bypass strict typing issues with the RPC function
 */
export async function createAuditLog({
  actionType,
  entityType,
  entityId,
  adminId,
  userId,
  oldValue,
  newValue,
  metadata,
  reason,
}: AuditLogParams): Promise<string | null> {
  try {
    // Use type assertion to bypass the strict RPC typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('create_audit_log', {
      _action_type: actionType,
      _entity_type: entityType,
      _entity_id: entityId,
      _admin_id: adminId,
      _user_id: userId,
      _old_value: oldValue,
      _new_value: newValue,
      _metadata: metadata,
      _reason: reason,
    });

    if (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating audit log:', err);
    return null;
  }
}
