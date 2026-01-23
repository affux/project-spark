import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Video, 
  Upload, 
  X, 
  Save, 
  Loader2,
  Play
} from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const VideoSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSettingAsync, isUpdating } = usePlatformSettings();
  
  const [landingVideoUrl, setLandingVideoUrl] = useState('');
  const [userDashboardVideoUrl, setUserDashboardVideoUrl] = useState('');
  const [isUploadingLanding, setIsUploadingLanding] = useState(false);
  const [isUploadingDashboard, setIsUploadingDashboard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const landingVideoRef = useRef<HTMLInputElement>(null);
  const dashboardVideoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasInitialized) {
      setLandingVideoUrl(settingsMap.landing_video_url || '');
      setUserDashboardVideoUrl(settingsMap.user_dashboard_video_url || '');
      setHasInitialized(true);
    }
  }, [settingsMap, hasInitialized]);

  const handleVideoUpload = async (
    file: File, 
    type: 'landing' | 'dashboard',
    setUrl: (url: string) => void,
    setUploading: (uploading: boolean) => void
  ) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a video smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-video-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      setUrl(publicUrl);
      toast({
        title: "Video uploaded",
        description: "Your video has been uploaded. Save to apply.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSettingAsync({
          key: 'landing_video_url',
          value: landingVideoUrl,
          oldValue: settingsMap.landing_video_url,
        }),
        updateSettingAsync({
          key: 'user_dashboard_video_url',
          value: userDashboardVideoUrl,
          oldValue: settingsMap.user_dashboard_video_url,
        }),
      ]);
      toast({
        title: "Video Settings Saved",
        description: "Your video settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving video settings:', error);
      toast({
        title: "Error",
        description: "Failed to save video settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const VideoPreview = ({ url, label }: { url: string; label: string }) => {
    if (!url) return null;
    
    // Check if it's a YouTube or Vimeo URL
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');
    
    if (isYouTube || isVimeo) {
      return (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>
      );
    }
    
    return (
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <video 
          src={url} 
          controls 
          className="w-full max-h-48 rounded-lg"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Video className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Video Settings</CardTitle>
            <CardDescription>
              Add tutorial videos to the landing page and user dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Landing Page Video */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Landing Page Video</Label>
          <p className="text-sm text-muted-foreground">
            This video will be shown on the public landing page to explain how the platform works.
          </p>
          
          {landingVideoUrl && (
            <div className="relative">
              <VideoPreview url={landingVideoUrl} label="Landing Page Video" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive hover:text-destructive"
                onClick={() => setLandingVideoUrl('')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              ref={landingVideoRef}
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleVideoUpload(file, 'landing', setLandingVideoUrl, setIsUploadingLanding);
                }
              }}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => landingVideoRef.current?.click()}
              disabled={isUploadingLanding}
              className="gap-2"
            >
              {isUploadingLanding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload Video
            </Button>
            <span className="text-sm text-muted-foreground self-center">or</span>
            <Input
              value={landingVideoUrl}
              onChange={(e) => setLandingVideoUrl(e.target.value)}
              placeholder="Enter video URL (YouTube, Vimeo, or direct link)"
              className="flex-1"
            />
          </div>
        </div>

        {/* User Dashboard Video */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">User Dashboard Video</Label>
          <p className="text-sm text-muted-foreground">
            This video will be shown on the user dashboard to help dropshippers get started.
          </p>
          
          {userDashboardVideoUrl && (
            <div className="relative">
              <VideoPreview url={userDashboardVideoUrl} label="User Dashboard Video" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive hover:text-destructive"
                onClick={() => setUserDashboardVideoUrl('')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              ref={dashboardVideoRef}
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleVideoUpload(file, 'dashboard', setUserDashboardVideoUrl, setIsUploadingDashboard);
                }
              }}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => dashboardVideoRef.current?.click()}
              disabled={isUploadingDashboard}
              className="gap-2"
            >
              {isUploadingDashboard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload Video
            </Button>
            <span className="text-sm text-muted-foreground self-center">or</span>
            <Input
              value={userDashboardVideoUrl}
              onChange={(e) => setUserDashboardVideoUrl(e.target.value)}
              placeholder="Enter video URL (YouTube, Vimeo, or direct link)"
              className="flex-1"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving || isUpdating}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Video Settings
        </Button>
      </CardContent>
    </Card>
  );
};