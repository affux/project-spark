import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Globe, Image as ImageIcon, Type, Upload, X, Loader2, Save, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SiteBrandingSettings: React.FC = () => {
  const { settingsMap, updateSetting, isLoading } = usePlatformSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [siteTitle, setSiteTitle] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setSiteTitle(settingsMap.site_title || settingsMap.site_name || '');
      setFaviconUrl(settingsMap.site_favicon_url || '');
    }
  }, [settingsMap, isLoading]);

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/ico', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG, JPG, SVG, or ICO file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 500KB for favicon)
    if (file.size > 500 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Favicon should be smaller than 500KB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('branding')
        .getPublicUrl(data.path);

      setFaviconUrl(publicUrlData.publicUrl);
      toast({
        title: 'Favicon Uploaded',
        description: 'Click Save to apply the new favicon.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload favicon.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFavicon = () => {
    setFaviconUrl('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting({ key: 'site_title', value: siteTitle });
      await updateSetting({ key: 'site_favicon_url', value: faviconUrl });
      
      toast({
        title: 'Settings Saved',
        description: 'Site title and favicon have been updated. Refresh to see changes.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Site Branding
        </CardTitle>
        <CardDescription>
          Configure the browser tab title and favicon for your site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Site Title */}
        <div className="space-y-2">
          <Label htmlFor="site-title" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Site Title
          </Label>
          <Input
            id="site-title"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="Enter site title..."
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            This appears in the browser tab. Keep it under 60 characters.
          </p>
        </div>

        {/* Favicon */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Site Favicon
          </Label>
          
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className={cn(
              "w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 shrink-0",
              faviconUrl && "border-solid border-primary/30"
            )}>
              {faviconUrl ? (
                <img 
                  src={faviconUrl} 
                  alt="Favicon preview" 
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Icon
                </Button>
                {faviconUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFavicon}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.ico,image/png,image/jpeg,image/svg+xml,image/x-icon"
                onChange={handleFaviconUpload}
                className="hidden"
              />

              <p className="text-xs text-muted-foreground">
                PNG, JPG, SVG, or ICO (max 500KB). Recommended: 32x32 or 64x64 pixels.
              </p>

              {/* URL Input as alternative */}
              <div className="pt-2">
                <Label htmlFor="favicon-url" className="text-xs text-muted-foreground">
                  Or enter URL directly:
                </Label>
                <Input
                  id="favicon-url"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.png"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Branding Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
