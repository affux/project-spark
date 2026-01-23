import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { KYCSubmission } from './useKYC';

export interface KYCWithProfile extends KYCSubmission {
  profiles?: {
    name: string;
    email: string;
  };
}

export interface KYCDocumentUrls {
  aadhaar_front: string;
  aadhaar_back: string;
  pan: string;
  bank_statement: string | null;
  face_image: string | null;
}

export const useAdminKYC = () => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: kycSubmissions = [], isLoading } = useQuery({
    queryKey: ['admin-kyc-submissions'],
    queryFn: async () => {
      // First fetch KYC submissions
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (kycError) throw kycError;

      // Then fetch profiles for each user
      const userIds = kycData.map(k => k.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return kycData.map(kyc => ({
        ...kyc,
        profiles: profilesMap.get(kyc.user_id) || undefined,
      })) as KYCWithProfile[];
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const updateKYCStatusMutation = useMutation({
    mutationFn: async ({ kycId, status, reason }: { kycId: string; status: 'submitted' | 'approved' | 'rejected'; reason?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: status === 'rejected' ? reason : null,
      };

      const { data, error } = await supabase
        .from('kyc_submissions')
        .update(updateData)
        .eq('id', kycId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: `kyc_${status}`,
        _entity_type: 'kyc_submission',
        _entity_id: kycId,
        _user_id: data.user_id,
        _admin_id: user.id,
        _new_value: { status, reason },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: `KYC ${variables.status.charAt(0).toUpperCase() + variables.status.slice(1)}`,
        description: `The KYC submission status has been updated to ${variables.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const approveKYCMutation = useMutation({
    mutationFn: async (kycId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('kyc_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: null,
        })
        .eq('id', kycId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: 'kyc_approved',
        _entity_type: 'kyc_submission',
        _entity_id: kycId,
        _user_id: data.user_id,
        _admin_id: user.id,
        _new_value: { status: 'approved' },
      });

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'KYC Approved',
        description: 'The KYC submission has been approved.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectKYCMutation = useMutation({
    mutationFn: async ({ kycId, reason }: { kycId: string; reason: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('kyc_submissions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason,
        })
        .eq('id', kycId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: 'kyc_rejected',
        _entity_type: 'kyc_submission',
        _entity_id: kycId,
        _user_id: data.user_id,
        _admin_id: user.id,
        _new_value: { status: 'rejected', reason },
      });

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'KYC Rejected',
        description: 'The KYC submission has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteKYCMutation = useMutation({
    mutationFn: async (kycId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get the KYC data first for logging
      const { data: kycData } = await supabase
        .from('kyc_submissions')
        .select('user_id')
        .eq('id', kycId)
        .single();

      const { error } = await supabase
        .from('kyc_submissions')
        .delete()
        .eq('id', kycId);

      if (error) throw error;

      // Log the action
      if (kycData) {
        await supabase.rpc('create_audit_log', {
          _action_type: 'kyc_deleted',
          _entity_type: 'kyc_submission',
          _entity_id: kycId,
          _user_id: kycData.user_id,
          _admin_id: user.id,
          _new_value: { status: 'deleted' },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'KYC Deleted',
        description: 'The KYC submission has been deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDocumentUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    const { data } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(path, 3600); // 1 hour expiry

    return data?.signedUrl || null;
  };

  const getAllDocumentUrls = async (kyc: KYCWithProfile): Promise<KYCDocumentUrls> => {
    const [aadhaarFront, aadhaarBack, pan, bankStatement, faceImage] = await Promise.all([
      getDocumentUrl(kyc.aadhaar_front_url),
      getDocumentUrl(kyc.aadhaar_back_url),
      getDocumentUrl(kyc.pan_document_url),
      kyc.bank_statement_url ? getDocumentUrl(kyc.bank_statement_url) : Promise.resolve(null),
      kyc.face_image_url ? getDocumentUrl(kyc.face_image_url) : Promise.resolve(null),
    ]);

    return {
      aadhaar_front: aadhaarFront || '',
      aadhaar_back: aadhaarBack || '',
      pan: pan || '',
      bank_statement: bankStatement,
      face_image: faceImage,
    };
  };

  const pendingCount = kycSubmissions.filter(k => k.status === 'submitted').length;

  return {
    kycSubmissions,
    isLoading,
    pendingCount,
    approveKYC: approveKYCMutation.mutate,
    rejectKYC: rejectKYCMutation.mutate,
    deleteKYC: deleteKYCMutation.mutate,
    updateKYCStatus: updateKYCStatusMutation.mutate,
    isApproving: approveKYCMutation.isPending,
    isRejecting: rejectKYCMutation.isPending,
    isDeleting: deleteKYCMutation.isPending,
    isUpdatingStatus: updateKYCStatusMutation.isPending,
    getDocumentUrl,
    getAllDocumentUrls,
  };
};
