import { useEffect } from 'react';
import { usePublicBrandingSettings } from '@/hooks/usePublicBrandingSettings';

export const DynamicHead: React.FC = () => {
  const { settings, isLoading } = usePublicBrandingSettings();

  useEffect(() => {
    if (isLoading) return;

    // Update document title
    const siteTitle = settings.site_title || settings.site_name || 'DropShip';
    document.title = siteTitle;

    // Update meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', siteTitle);
    }

    // Update meta description
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', `${siteTitle} - Professional Dropshipping Platform`);
    }

    // Update og:description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', `${siteTitle} - Professional Dropshipping Platform`);
    }

    // Update favicon
    const faviconUrl = settings.site_favicon_url;
    if (faviconUrl) {
      // Remove existing favicons
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(el => el.remove());

      // Add new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      
      // Determine type based on URL
      if (faviconUrl.includes('.svg')) {
        link.type = 'image/svg+xml';
      } else if (faviconUrl.includes('.png')) {
        link.type = 'image/png';
      } else if (faviconUrl.includes('.ico')) {
        link.type = 'image/x-icon';
      } else if (faviconUrl.includes('.webp')) {
        link.type = 'image/webp';
      } else {
        link.type = 'image/png'; // Default to PNG
      }
      
      document.head.appendChild(link);
    }

    // Update og:image if logo is set
    if (settings.site_logo_url) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', settings.site_logo_url);
      }
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', settings.site_logo_url);
      }
    }
  }, [settings, isLoading]);

  return null;
};
