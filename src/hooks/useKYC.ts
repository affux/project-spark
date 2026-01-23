import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KYCSubmission {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  aadhaar_number: string;
  pan_number: string;
  aadhaar_front_url: string;
  aadhaar_back_url: string;
  pan_document_url: string;
  bank_statement_url: string | null;
  face_image_url: string | null;
  status: 'not_submitted' | 'submitted' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYCFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mobile_number: string;
  aadhaar_number: string;
  pan_number: string;
  aadhaar_front: File | null;
  aadhaar_back: File | null;
  pan_document: File | null;
  bank_statement: File | null;
  face_image: File | null;
}

export const useKYC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: kycSubmission, isLoading } = useQuery({
    queryKey: ['kyc-submission', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as KYCSubmission | null;
    },
    enabled: !!user?.id,
  });

  const uploadDocument = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return data.path;
  };

  const submitKYCMutation = useMutation({
    mutationFn: async (formData: KYCFormData) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload documents
      const timestamp = Date.now();
      const aadhaarFrontPath = `${user.id}/aadhaar_front_${timestamp}`;
      const aadhaarBackPath = `${user.id}/aadhaar_back_${timestamp}`;
      const panPath = `${user.id}/pan_${timestamp}`;
      const bankStatementPath = `${user.id}/bank_statement_${timestamp}`;
      const faceImagePath = `${user.id}/face_image_${timestamp}`;

      if (!formData.aadhaar_front || !formData.aadhaar_back || !formData.pan_document) {
        throw new Error('All identity documents are required');
      }

      if (!formData.bank_statement) {
        throw new Error('Bank statement is required');
      }

      if (!formData.face_image) {
        throw new Error('Face image is required');
      }

      const [aadhaarFrontUrl, aadhaarBackUrl, panUrl, bankStatementUrl, faceImageUrl] = await Promise.all([
        uploadDocument(formData.aadhaar_front, aadhaarFrontPath),
        uploadDocument(formData.aadhaar_back, aadhaarBackPath),
        uploadDocument(formData.pan_document, panPath),
        uploadDocument(formData.bank_statement, bankStatementPath),
        uploadDocument(formData.face_image, faceImagePath),
      ]);

      const kycData = {
        user_id: user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        mobile_number: formData.mobile_number,
        aadhaar_number: formData.aadhaar_number,
        pan_number: formData.pan_number.toUpperCase(),
        aadhaar_front_url: aadhaarFrontUrl,
        aadhaar_back_url: aadhaarBackUrl,
        pan_document_url: panUrl,
        bank_statement_url: bankStatementUrl,
        face_image_url: faceImageUrl,
        status: 'submitted' as const,
        submitted_at: new Date().toISOString(),
      };

      // Check if resubmitting (update) or first time (insert)
      if (kycSubmission?.status === 'rejected') {
        const { data, error } = await supabase
          .from('kyc_submissions')
          .update({
            ...kycData,
            rejection_reason: null,
          })
          .eq('id', kycSubmission.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('kyc_submissions')
          .insert(kycData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast({
        title: 'KYC Submitted',
        description: 'Your KYC documents have been submitted for review.',
      });
      queryClient.invalidateQueries({ queryKey: ['kyc-submission'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const kycStatus = kycSubmission?.status || 'not_submitted';
  const isKYCApproved = kycStatus === 'approved';
  const canSubmitKYC = kycStatus === 'not_submitted' || kycStatus === 'rejected';

  return {
    kycSubmission,
    kycStatus,
    isKYCApproved,
    canSubmitKYC,
    isLoading,
    submitKYC: submitKYCMutation.mutate,
    isSubmitting: submitKYCMutation.isPending,
  };
};
