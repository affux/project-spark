import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShoppingCart, Save, Loader2, Check, AlertTriangle, MessageSquare, ShoppingBag, Mail, Phone, MapPin, MessageCircle, Clock } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const StorefrontSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [orderFailedMessage, setOrderFailedMessage] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [orderingDisabledMessage, setOrderingDisabledMessage] = useState('');
  const [chatGreetingMessage, setChatGreetingMessage] = useState('');
  
  // Footer contact settings
  const [storefrontContactEmail, setStorefrontContactEmail] = useState('');
  const [storefrontContactPhone, setStorefrontContactPhone] = useState('');
  const [storefrontContactAddress, setStorefrontContactAddress] = useState('');
  const [storefrontContactWhatsapp, setStorefrontContactWhatsapp] = useState('');
  const [storefrontBusinessHours, setStorefrontBusinessHours] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  useEffect(() => {
    setOrderFailedMessage(settingsMap.order_failed_message || 'Order not available in India or you are using VPN, fake order.');
    setGreetingMessage(settingsMap.storefront_greeting_message || 'Welcome to our store! Browse our amazing products.');
    setOrderingEnabled(settingsMap.storefront_ordering_enabled !== false);
    setOrderingDisabledMessage(settingsMap.storefront_ordering_disabled_message || 'Ordering is currently disabled. Please contact the store owner for assistance.');
    setChatGreetingMessage(settingsMap.chat_greeting_message || 'Hello! How can I help you today?');
    
    // Load footer contact settings
    setStorefrontContactEmail(getRawValue('storefront_contact_email') || 'support@store.com');
    setStorefrontContactPhone(getRawValue('storefront_contact_phone') || '+91 1234567890');
    setStorefrontContactAddress(getRawValue('storefront_contact_address') || '');
    setStorefrontContactWhatsapp(getRawValue('storefront_contact_whatsapp') || '');
    setStorefrontBusinessHours(getRawValue('storefront_business_hours') || 'Mon - Sat: 9AM - 6PM');
  }, [settingsMap.order_failed_message, settingsMap.storefront_greeting_message, settingsMap.storefront_ordering_enabled, settingsMap.storefront_ordering_disabled_message, settingsMap.chat_greeting_message, settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSettingAsync({
          key: 'order_failed_message',
          value: orderFailedMessage,
          oldValue: getRawValue('order_failed_message')
        }),
        updateSettingAsync({
          key: 'storefront_greeting_message',
          value: greetingMessage,
          oldValue: getRawValue('storefront_greeting_message')
        }),
        updateSettingAsync({
          key: 'storefront_ordering_enabled',
          value: orderingEnabled.toString(),
          oldValue: getRawValue('storefront_ordering_enabled')
        }),
        updateSettingAsync({
          key: 'storefront_ordering_disabled_message',
          value: orderingDisabledMessage,
          oldValue: getRawValue('storefront_ordering_disabled_message')
        }),
        updateSettingAsync({
          key: 'chat_greeting_message',
          value: chatGreetingMessage,
          oldValue: getRawValue('chat_greeting_message')
        }),
        // Save footer contact settings
        updateSettingAsync({
          key: 'storefront_contact_email',
          value: storefrontContactEmail,
          oldValue: getRawValue('storefront_contact_email')
        }),
        updateSettingAsync({
          key: 'storefront_contact_phone',
          value: storefrontContactPhone,
          oldValue: getRawValue('storefront_contact_phone')
        }),
        updateSettingAsync({
          key: 'storefront_contact_address',
          value: storefrontContactAddress,
          oldValue: getRawValue('storefront_contact_address')
        }),
        updateSettingAsync({
          key: 'storefront_contact_whatsapp',
          value: storefrontContactWhatsapp,
          oldValue: getRawValue('storefront_contact_whatsapp')
        }),
        updateSettingAsync({
          key: 'storefront_business_hours',
          value: storefrontBusinessHours,
          oldValue: getRawValue('storefront_business_hours')
        }),
      ]);
      setSaved(true);
      toast({
        title: 'Settings Saved',
        description: 'Storefront settings have been updated.',
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Storefront Settings</CardTitle>
            <CardDescription>
              Configure public storefront behavior and messages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Greeting Message */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Greeting Message</h4>
              <p className="text-sm text-muted-foreground">
                This message is displayed at the top of the storefront to welcome customers.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="greeting-message">Custom Greeting Message</Label>
            <Textarea
              id="greeting-message"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="Enter a welcome message for your customers"
              rows={2}
            />
          </div>
        </div>

        {/* Ordering Toggle */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Enable Customer Ordering</h4>
                <Switch
                  checked={orderingEnabled}
                  onCheckedChange={setOrderingEnabled}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                When disabled, customers will see a custom message instead of being able to place orders.
              </p>
            </div>
          </div>
          
          {!orderingEnabled && (
            <div className="space-y-2">
              <Label htmlFor="ordering-disabled-message">Ordering Disabled Message</Label>
              <Textarea
                id="ordering-disabled-message"
                value={orderingDisabledMessage}
                onChange={(e) => setOrderingDisabledMessage(e.target.value)}
                placeholder="Enter the message shown when ordering is disabled"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This message will be shown to customers when they try to place an order.
              </p>
            </div>
          )}
        </div>

        {/* Order Failed Message */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Order Failed Message</h4>
              <p className="text-sm text-muted-foreground">
                This message is shown when an order is blocked due to geo-restriction or VPN detection.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order-failed-message">Custom Error Message</Label>
            <Textarea
              id="order-failed-message"
              value={orderFailedMessage}
              onChange={(e) => setOrderFailedMessage(e.target.value)}
              placeholder="Enter the error message shown to blocked users"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This message appears when orders are blocked from India or VPN/proxy users.
            </p>
          </div>
        </div>

        {/* Chat Greeting Message */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Chat Greeting Message</h4>
              <p className="text-sm text-muted-foreground">
                This message is displayed as the first message when users open chat support.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chat-greeting-message">Chat Greeting Message</Label>
            <Textarea
              id="chat-greeting-message"
              value={chatGreetingMessage}
              onChange={(e) => setChatGreetingMessage(e.target.value)}
              placeholder="Enter a greeting message for chat support"
              rows={2}
            />
          </div>
        </div>

        {/* Footer Contact Information */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Storefront Footer Contact</h4>
              <p className="text-sm text-muted-foreground">
                Contact information displayed in the storefront footer for customers.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storefront-contact-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Email
              </Label>
              <Input
                id="storefront-contact-email"
                value={storefrontContactEmail}
                onChange={(e) => setStorefrontContactEmail(e.target.value)}
                placeholder="support@store.com"
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storefront-contact-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Phone
              </Label>
              <Input
                id="storefront-contact-phone"
                value={storefrontContactPhone}
                onChange={(e) => setStorefrontContactPhone(e.target.value)}
                placeholder="+91 1234567890"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storefront-contact-whatsapp" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp Number
              </Label>
              <Input
                id="storefront-contact-whatsapp"
                value={storefrontContactWhatsapp}
                onChange={(e) => setStorefrontContactWhatsapp(e.target.value)}
                placeholder="+91 9876543210"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Include country code (e.g., +91 for India).
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storefront-business-hours" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Business Hours
              </Label>
              <Input
                id="storefront-business-hours"
                value={storefrontBusinessHours}
                onChange={(e) => setStorefrontBusinessHours(e.target.value)}
                placeholder="Mon - Sat: 9AM - 6PM"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="storefront-contact-address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Business Address
            </Label>
            <Textarea
              id="storefront-contact-address"
              value={storefrontContactAddress}
              onChange={(e) => setStorefrontContactAddress(e.target.value)}
              placeholder="Enter your business address (optional)"
              rows={2}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || isUpdating}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};