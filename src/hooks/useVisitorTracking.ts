import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VisitorActionType = 
  | 'page_view'
  | 'link_click'
  | 'button_click'
  | 'form_submit'
  | 'external_link'
  | 'cta_click';

interface TrackOptions {
  actionType: VisitorActionType;
  pageUrl?: string;
  referrer?: string;
  linkClicked?: string;
}

// Debounce tracking to avoid duplicate calls
const DEBOUNCE_MS = 1000;
const trackedUrls = new Set<string>();

export const trackVisitor = async (options: TrackOptions): Promise<boolean> => {
  try {
    // Create a unique key for deduplication
    const trackKey = `${options.actionType}-${options.pageUrl || ''}-${options.linkClicked || ''}-${Date.now()}`;
    
    // Skip if we've recently tracked this exact action
    const recentKey = `${options.actionType}-${options.linkClicked || options.pageUrl || ''}`;
    if (trackedUrls.has(recentKey)) {
      return false;
    }
    
    trackedUrls.add(recentKey);
    setTimeout(() => trackedUrls.delete(recentKey), DEBOUNCE_MS);

    const { error } = await supabase.functions.invoke('track-visitor', {
      body: {
        action_type: options.actionType,
        page_url: options.pageUrl || window.location.href,
        referrer: options.referrer || document.referrer || null,
        link_clicked: options.linkClicked || null,
      },
    });

    if (error) {
      console.warn('Failed to track visitor:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('Error tracking visitor:', e);
    return false;
  }
};

export const useVisitorTracking = (trackPageView = true) => {
  const hasTrackedPageView = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (trackPageView && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      trackVisitor({
        actionType: 'page_view',
        pageUrl: window.location.href,
        referrer: document.referrer,
      });
    }
  }, [trackPageView]);

  // Track link clicks
  const trackLinkClick = useCallback((linkUrl: string, linkText?: string) => {
    trackVisitor({
      actionType: 'link_click',
      linkClicked: linkText ? `${linkText}: ${linkUrl}` : linkUrl,
    });
  }, []);

  // Track button clicks
  const trackButtonClick = useCallback((buttonName: string) => {
    trackVisitor({
      actionType: 'button_click',
      linkClicked: buttonName,
    });
  }, []);

  // Track CTA clicks
  const trackCtaClick = useCallback((ctaName: string, destination?: string) => {
    trackVisitor({
      actionType: 'cta_click',
      linkClicked: destination ? `${ctaName}: ${destination}` : ctaName,
    });
  }, []);

  // Track external links
  const trackExternalLink = useCallback((url: string) => {
    trackVisitor({
      actionType: 'external_link',
      linkClicked: url,
    });
  }, []);

  // Track form submissions
  const trackFormSubmit = useCallback((formName: string) => {
    trackVisitor({
      actionType: 'form_submit',
      linkClicked: formName,
    });
  }, []);

  return {
    trackLinkClick,
    trackButtonClick,
    trackCtaClick,
    trackExternalLink,
    trackFormSubmit,
  };
};

// Global click listener for automatic link tracking
export const initGlobalLinkTracking = () => {
  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    
    if (link) {
      const href = link.getAttribute('href');
      const linkText = link.textContent?.trim() || '';
      
      if (href) {
        // Check if external link
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        
        trackVisitor({
          actionType: isExternal ? 'external_link' : 'link_click',
          linkClicked: linkText ? `${linkText}: ${href}` : href,
        });
      }
    }
    
    // Track button clicks
    const button = target.closest('button');
    if (button) {
      const buttonText = button.textContent?.trim() || button.getAttribute('aria-label') || 'Unknown Button';
      trackVisitor({
        actionType: 'button_click',
        linkClicked: buttonText,
      });
    }
  };

  document.addEventListener('click', handleClick, { passive: true });

  return () => {
    document.removeEventListener('click', handleClick);
  };
};
