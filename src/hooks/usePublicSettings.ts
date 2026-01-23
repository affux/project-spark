import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayoutMethodsEnabled {
  bank_transfer: boolean;
  upi: boolean;
  paypal: boolean;
  crypto: boolean;
}

export interface PaymentIconsEnabled {
  visa: boolean;
  mastercard: boolean;
  apple_pay: boolean;
  paypal: boolean;
  secure_checkout: boolean;
}

export interface PublicSettings {
  storefront_greeting_message: string;
  storefront_ordering_enabled: boolean;
  storefront_ordering_disabled_message: string;
  payout_enabled: boolean;
  payout_disabled_message: string;
  chat_greeting_message: string;
  payout_methods_enabled: PayoutMethodsEnabled;
  storefront_payment_icons: PaymentIconsEnabled;
  // Storefront footer contact
  storefront_contact_email: string;
  storefront_contact_phone: string;
  storefront_contact_address: string;
  storefront_contact_whatsapp: string;
  storefront_business_hours: string;
}

export const usePublicSettings = () => {
  const query = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'storefront_greeting_message',
          'storefront_ordering_enabled',
          'storefront_ordering_disabled_message',
          'payout_enabled',
          'payout_disabled_message',
          'chat_greeting_message',
          'payout_methods_enabled',
          'storefront_payment_icons',
          'storefront_contact_email',
          'storefront_contact_phone',
          'storefront_contact_address',
          'storefront_contact_whatsapp',
          'storefront_business_hours',
        ]);

      if (error) {
        console.error('Error fetching public settings:', error);
        throw error;
      }

      const settings: PublicSettings = {
        storefront_greeting_message: 'Welcome to our store! Browse our amazing products.',
        storefront_ordering_enabled: true,
        storefront_ordering_disabled_message: 'Ordering is currently disabled. Please contact the store owner for assistance.',
        payout_enabled: true,
        payout_disabled_message: 'Payout requests are currently disabled. Please contact admin for assistance.',
        chat_greeting_message: 'Hello! How can I help you today?',
        payout_methods_enabled: {
          bank_transfer: true,
          upi: true,
          paypal: true,
          crypto: true,
        },
        storefront_payment_icons: {
          visa: true,
          mastercard: true,
          apple_pay: true,
          paypal: true,
          secure_checkout: true,
        },
        storefront_contact_email: 'support@store.com',
        storefront_contact_phone: '+91 1234567890',
        storefront_contact_address: '',
        storefront_contact_whatsapp: '',
        storefront_business_hours: 'Mon - Sat: 9AM - 6PM',
      };

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'storefront_greeting_message':
            settings.storefront_greeting_message = setting.value || settings.storefront_greeting_message;
            break;
          case 'storefront_ordering_enabled':
            settings.storefront_ordering_enabled = setting.value !== 'false';
            break;
          case 'storefront_ordering_disabled_message':
            settings.storefront_ordering_disabled_message = setting.value || settings.storefront_ordering_disabled_message;
            break;
          case 'payout_enabled':
            settings.payout_enabled = setting.value !== 'false';
            break;
          case 'payout_disabled_message':
            settings.payout_disabled_message = setting.value || settings.payout_disabled_message;
            break;
          case 'chat_greeting_message':
            settings.chat_greeting_message = setting.value || settings.chat_greeting_message;
            break;
          case 'payout_methods_enabled':
            try {
              settings.payout_methods_enabled = JSON.parse(setting.value);
            } catch {
              // Keep default
            }
            break;
          case 'storefront_payment_icons':
            try {
              settings.storefront_payment_icons = JSON.parse(setting.value);
            } catch {
              // Keep default
            }
            break;
          case 'storefront_contact_email':
            settings.storefront_contact_email = setting.value || settings.storefront_contact_email;
            break;
          case 'storefront_contact_phone':
            settings.storefront_contact_phone = setting.value || settings.storefront_contact_phone;
            break;
          case 'storefront_contact_address':
            settings.storefront_contact_address = setting.value || settings.storefront_contact_address;
            break;
          case 'storefront_contact_whatsapp':
            settings.storefront_contact_whatsapp = setting.value || settings.storefront_contact_whatsapp;
            break;
          case 'storefront_business_hours':
            settings.storefront_business_hours = setting.value || settings.storefront_business_hours;
            break;
        }
      });

      return settings;
    },
  });

  return {
    settings: query.data || {
      storefront_greeting_message: 'Welcome to our store! Browse our amazing products.',
      storefront_ordering_enabled: true,
      storefront_ordering_disabled_message: 'Ordering is currently disabled. Please contact the store owner for assistance.',
      payout_enabled: true,
      payout_disabled_message: 'Payout requests are currently disabled. Please contact admin for assistance.',
      chat_greeting_message: 'Hello! How can I help you today?',
      payout_methods_enabled: {
        bank_transfer: true,
        upi: true,
        paypal: true,
        crypto: true,
      },
      storefront_payment_icons: {
        visa: true,
        mastercard: true,
        apple_pay: true,
        paypal: true,
        secure_checkout: true,
      },
      storefront_contact_email: 'support@store.com',
      storefront_contact_phone: '+91 1234567890',
      storefront_contact_address: '',
      storefront_contact_whatsapp: '',
      storefront_business_hours: 'Mon - Sat: 9AM - 6PM',
    },
    isLoading: query.isLoading,
    error: query.error,
  };
};