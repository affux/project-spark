import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CustomThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  sidebar: string;
}

export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Fetch user's theme preference from database
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Save theme preference mutation
  const saveThemeMutation = useMutation({
    mutationFn: async (newTheme: string) => {
      if (!user?.id) return;

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ theme: newTheme, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, theme: newTheme });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
    },
  });

  // Apply theme from database on initial load
  useEffect(() => {
    if (preferences?.theme && !isInitialized) {
      setTheme(preferences.theme);
      setIsInitialized(true);
    } else if (!isLoading && !preferences && !isInitialized) {
      // No preferences stored, use default 'light'
      setIsInitialized(true);
    }
  }, [preferences, isLoading, isInitialized, setTheme]);

  // Custom setTheme that also saves to database
  const setThemeWithPersistence = useCallback((newTheme: string) => {
    setTheme(newTheme);
    setPreviewTheme(null);
    if (user?.id) {
      saveThemeMutation.mutate(newTheme);
    }
  }, [setTheme, user?.id, saveThemeMutation]);

  // Preview a theme temporarily without saving
  const startPreview = useCallback((themeToPreview: string) => {
    setPreviewTheme(themeToPreview);
    // Apply theme class temporarily
    document.documentElement.classList.remove('light', 'dark', 'trading', 'blue', 'green', 'purple', 'custom');
    document.documentElement.classList.add(themeToPreview);
  }, []);

  // Cancel preview and restore original theme
  const cancelPreview = useCallback(() => {
    if (previewTheme && theme) {
      document.documentElement.classList.remove('light', 'dark', 'trading', 'blue', 'green', 'purple', 'custom');
      document.documentElement.classList.add(theme);
    }
    setPreviewTheme(null);
  }, [previewTheme, theme]);

  // Apply preview as permanent theme
  const applyPreview = useCallback(() => {
    if (previewTheme) {
      setThemeWithPersistence(previewTheme);
    }
  }, [previewTheme, setThemeWithPersistence]);

  return {
    theme: previewTheme || theme,
    actualTheme: theme,
    resolvedTheme,
    setTheme: setThemeWithPersistence,
    isLoading: isLoading && !isInitialized,
    isSaving: saveThemeMutation.isPending,
    // Preview functionality
    isPreviewActive: !!previewTheme,
    previewTheme,
    startPreview,
    cancelPreview,
    applyPreview,
  };
}
