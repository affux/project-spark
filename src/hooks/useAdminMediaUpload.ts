import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UploadedMedia {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  uploadedAt: string;
}

export const useAdminMediaUpload = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMedia = async (
    file: File,
    folder: string = 'general'
  ): Promise<UploadedMedia | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM');
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 10MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setUploadProgress(25);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('admin-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress(75);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('admin-media')
        .getPublicUrl(data.path);

      setUploadProgress(100);

      const uploadedMedia: UploadedMedia = {
        id: data.path,
        name: file.name,
        url: urlData.publicUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded.`,
      });

      return uploadedMedia;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload file.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadMultiple = async (
    files: File[],
    folder: string = 'general'
  ): Promise<UploadedMedia[]> => {
    const results: UploadedMedia[] = [];
    
    for (const file of files) {
      const result = await uploadMedia(file, folder);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  };

  const deleteMedia = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('admin-media')
        .remove([path]);

      if (error) throw error;

      toast({
        title: 'Media deleted',
        description: 'The file has been removed.',
      });

      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete file.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const listMedia = async (folder?: string): Promise<UploadedMedia[]> => {
    try {
      const { data, error } = await supabase.storage
        .from('admin-media')
        .list(folder || '', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const media: UploadedMedia[] = (data || [])
        .filter(item => !item.id.endsWith('/'))
        .map(item => {
          const { data: urlData } = supabase.storage
            .from('admin-media')
            .getPublicUrl(folder ? `${folder}/${item.name}` : item.name);

          return {
            id: item.id,
            name: item.name,
            url: urlData.publicUrl,
            type: item.metadata?.mimetype?.startsWith('video/') ? 'video' : 'image',
            size: item.metadata?.size || 0,
            uploadedAt: item.created_at || '',
          };
        });

      return media;
    } catch (error) {
      console.error('List error:', error);
      return [];
    }
  };

  return {
    uploadMedia,
    uploadMultiple,
    deleteMedia,
    listMedia,
    isUploading,
    uploadProgress,
  };
};
