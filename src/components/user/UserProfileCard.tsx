import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { User, CheckCircle, Clock, XCircle, Shield, Award, ShoppingBag, Key, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useKYC } from '@/hooks/useKYC';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { maskAadhaar, maskPAN } from '@/lib/maskingUtils';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { calculateUserLevel, getLevelProgress, UserLevel } from '@/lib/userLevelUtils';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { MFASettings } from '@/components/mfa/MFASettings';
import { LoginActivityLog } from './LoginActivityLog';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/admin/ImageCropper';

interface UserProfile {
  wallet_balance: number;
  name: string;
  email: string;
  profile_image_url: string | null;
}

const levelConfig: Record<UserLevel, { label: string; color: string; bgColor: string }> = {
  bronze: { 
    label: 'Bronze', 
    color: 'text-amber-700', 
    bgColor: 'bg-gradient-to-r from-amber-200 to-amber-300 border-amber-400'
  },
  silver: { 
    label: 'Silver', 
    color: 'text-slate-600', 
    bgColor: 'bg-gradient-to-r from-slate-200 to-slate-300 border-slate-400'
  },
  gold: { 
    label: 'Gold', 
    color: 'text-yellow-700', 
    bgColor: 'bg-gradient-to-r from-yellow-300 to-yellow-400 border-yellow-500'
  },
};

const kycStatusConfig = {
  not_submitted: { label: 'Not Submitted', color: 'bg-muted text-muted-foreground', icon: Clock },
  submitted: { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  approved: { label: 'Verified', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  const { kycSubmission, kycStatus, isLoading: kycLoading } = useKYC();
  const { settingsMap } = usePlatformSettings();
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-level', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance, name, email, profile_image_url')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // Fetch completed order count for calculating level
  const { data: completedOrderCount = 0, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-completed-orders-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await (supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }) as any)
        .eq('dropshipper_user_id', user.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Use signed URL for KYC face image (expires in 1 hour for security)
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (kycSubmission?.face_image_url) {
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(kycSubmission.face_image_url, 3600); // 1 hour expiry
        
        if (!error && data?.signedUrl) {
          setFaceImageUrl(data.signedUrl);
        }
      }
    };
    fetchSignedUrl();
  }, [kycSubmission?.face_image_url]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user?.id) return;

    setIsUploadingImage(true);
    setCropperOpen(false);

    try {
      const fileName = `${user.id}/profile-${Date.now()}.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['user-profile-level', user.id] });
      
      toast.success('Profile image updated successfully');
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to update profile image');
    } finally {
      setIsUploadingImage(false);
      setSelectedImage(null);
    }
  };

  // Get profile image URL - prioritize custom profile image over KYC face image
  const profileImageUrl = profile?.profile_image_url || faceImageUrl;

  const isLoading = kycLoading || profileLoading || ordersLoading;
  
  // Calculate user level based on completed orders
  const userLevel = calculateUserLevel(
    completedOrderCount,
    settingsMap.level_threshold_silver,
    settingsMap.level_threshold_gold
  );
  
  const levelProgress = getLevelProgress(
    completedOrderCount,
    settingsMap.level_threshold_silver,
    settingsMap.level_threshold_gold
  );
  
  const levelInfo = levelConfig[userLevel];
  const kycInfo = kycStatusConfig[kycStatus as keyof typeof kycStatusConfig] || kycStatusConfig.not_submitted;
  const KycIcon = kycInfo.icon;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden trading-glow">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="w-5 h-5 text-primary" />
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={profileImageUrl || undefined} alt="Profile" />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {isUploadingImage ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {kycSubmission ? `${kycSubmission.first_name} ${kycSubmission.last_name}` : user?.name}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`gap-1 ${levelInfo.bgColor} ${levelInfo.color} border`}>
                <Award className="w-3 h-3" />
                {levelInfo.label} Member
              </Badge>
              <Badge className={`gap-1 ${kycInfo.color}`}>
                <KycIcon className="w-3 h-3" />
                KYC: {kycInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Level Progress
            </h3>
            <span className="text-sm text-muted-foreground">
              {completedOrderCount} orders completed
            </span>
          </div>
          
          {levelProgress.nextLevel ? (
            <>
              <Progress value={levelProgress.progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {levelProgress.ordersToNextLevel} more order{levelProgress.ordersToNextLevel !== 1 ? 's' : ''} to reach{' '}
                <span className="font-medium capitalize">{levelProgress.nextLevel}</span> level
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              🎉 Congratulations! You've reached the highest level.
            </p>
          )}
        </div>

        {/* KYC Details - Read Only */}
        {kycSubmission && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              KYC Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">First Name</p>
                <p className="font-medium">{kycSubmission.first_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Name</p>
                <p className="font-medium">{kycSubmission.last_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{new Date(kycSubmission.date_of_birth).toLocaleDateString()}</p>
              </div>
              {(kycSubmission as any).mobile_number && (
                <div>
                  <p className="text-muted-foreground">Mobile Number</p>
                  <p className="font-medium font-mono">{(kycSubmission as any).mobile_number}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Aadhaar Number</p>
                <p className="font-medium font-mono">{maskAadhaar(kycSubmission.aadhaar_number)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PAN Number</p>
                <p className="font-medium font-mono">{maskPAN(kycSubmission.pan_number)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted On</p>
                <p className="font-medium">{new Date(kycSubmission.submitted_at).toLocaleDateString()}</p>
              </div>
            </div>
            {kycSubmission.rejection_reason && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                <p className="font-medium">Rejection Reason:</p>
                <p>{kycSubmission.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {!kycSubmission && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Complete your KYC verification to access all features.
            </p>
          </div>
        )}

        {/* Password Change Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4" />
                Account Security
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account password
              </p>
            </div>
            <ChangePasswordDialog>
              <Button variant="outline" size="sm" className="gap-2">
                <Key className="w-4 h-4" />
                Change Password
              </Button>
            </ChangePasswordDialog>
          </div>
        </div>

        {/* Image Cropper Modal */}
        <ImageCropper
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage || ''}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          isLoading={isUploadingImage}
        />
      </CardContent>
    </Card>
  );
};
