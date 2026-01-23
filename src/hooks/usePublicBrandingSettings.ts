import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicBrandingSettings {
  site_name: string;
  site_title: string;
  site_favicon_url: string;
  site_logo_url: string;
  landing_page_enabled: boolean;
  landing_page_title: string;
  landing_page_subtitle: string;
  landing_video_url: string;
  footer_text: string;
  faq_items: Array<{ id: string; question: string; answer: string }>;
  contact_email: string;
  contact_phone: string;
}

export const usePublicBrandingSettings = () => {
  const query = useQuery({
    queryKey: ['public-branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'site_name',
          'site_title',
          'site_favicon_url',
          'site_logo_url',
          'landing_page_enabled',
          'landing_page_title',
          'landing_page_subtitle',
          'landing_video_url',
          'footer_text',
          'faq_items',
          'contact_email',
          'contact_phone',
        ]);

      if (error) {
        console.error('Error fetching public branding settings:', error);
        throw error;
      }

      const settings: PublicBrandingSettings = {
        site_name: 'DropShip',
        site_title: 'DropShip',
        site_favicon_url: '',
        site_logo_url: '',
        landing_page_enabled: true,
        landing_page_title: 'Launch Your Dropshipping Empire',
        landing_page_subtitle: 'The all-in-one dropshipping platform to source products from global suppliers, automate fulfillment, and scale your e-commerce business without inventory.',
        landing_video_url: '',
        footer_text: '© {year} {site_name}. All rights reserved.',
        faq_items: [],
        contact_email: '',
        contact_phone: '',
      };

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'site_name':
            settings.site_name = setting.value || settings.site_name;
            break;
          case 'site_title':
            settings.site_title = setting.value || settings.site_title;
            break;
          case 'site_favicon_url':
            settings.site_favicon_url = setting.value || '';
            break;
          case 'site_logo_url':
            settings.site_logo_url = setting.value || '';
            break;
          case 'landing_page_enabled':
            settings.landing_page_enabled = setting.value !== 'false';
            break;
          case 'landing_page_title':
            settings.landing_page_title = setting.value || settings.landing_page_title;
            break;
          case 'landing_page_subtitle':
            settings.landing_page_subtitle = setting.value || settings.landing_page_subtitle;
            break;
          case 'landing_video_url':
            settings.landing_video_url = setting.value || '';
            break;
          case 'footer_text':
            settings.footer_text = setting.value || settings.footer_text;
            break;
          case 'faq_items':
            try {
              settings.faq_items = JSON.parse(setting.value);
            } catch {
              // Keep default
            }
            break;
          case 'contact_email':
            settings.contact_email = setting.value || '';
            break;
          case 'contact_phone':
            settings.contact_phone = setting.value || '';
            break;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    settings: query.data || {
      site_name: 'DropShip',
      site_title: 'DropShip',
      site_favicon_url: '',
      site_logo_url: '',
      landing_page_enabled: true,
      landing_page_title: 'Launch Your Dropshipping Empire',
      landing_page_subtitle: 'The all-in-one dropshipping platform to source products from global suppliers, automate fulfillment, and scale your e-commerce business without inventory.',
      landing_video_url: '',
      footer_text: '© {year} {site_name}. All rights reserved.',
      faq_items: [],
      contact_email: '',
      contact_phone: '',
    },
    isLoading: query.isLoading,
    error: query.error,
  };
};
