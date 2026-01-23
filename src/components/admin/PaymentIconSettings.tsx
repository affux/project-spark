import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Save, Loader2, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

interface PaymentIconsEnabled {
  visa: boolean;
  mastercard: boolean;
  apple_pay: boolean;
  paypal: boolean;
  secure_checkout: boolean;
}

const defaultPaymentIcons: PaymentIconsEnabled = {
  visa: true,
  mastercard: true,
  apple_pay: true,
  paypal: true,
  secure_checkout: true,
};

export const PaymentIconSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [paymentIcons, setPaymentIcons] = useState<PaymentIconsEnabled>(defaultPaymentIcons);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  useEffect(() => {
    try {
      const savedIcons = settingsMap.storefront_payment_icons;
      if (savedIcons && typeof savedIcons === 'object') {
        setPaymentIcons({ ...defaultPaymentIcons, ...savedIcons });
      }
    } catch {
      setPaymentIcons(defaultPaymentIcons);
    }
  }, [settingsMap.storefront_payment_icons]);

  const handleToggle = (key: keyof PaymentIconsEnabled) => {
    setPaymentIcons(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettingAsync({
        key: 'storefront_payment_icons',
        value: JSON.stringify(paymentIcons),
        oldValue: getRawValue('storefront_payment_icons'),
      });
      setSaved(true);
      toast({
        title: 'Settings Saved',
        description: 'Payment icon settings have been updated.',
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

  const paymentOptions = [
    { key: 'visa' as const, label: 'Visa', description: 'Show Visa card icon' },
    { key: 'mastercard' as const, label: 'Mastercard', description: 'Show Mastercard icon' },
    { key: 'apple_pay' as const, label: 'Apple Pay', description: 'Show Apple Pay icon' },
    { key: 'paypal' as const, label: 'PayPal', description: 'Show PayPal icon' },
    { key: 'secure_checkout' as const, label: 'Secure Checkout', description: 'Show secure checkout lock icon' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Payment Icons</CardTitle>
            <CardDescription>
              Configure which payment method icons appear on the storefront footer
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable or disable payment method icons displayed in the storefront footer to show customers which payment options are available.
          </p>
          
          <div className="space-y-4">
            {paymentOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="space-y-0.5">
                  <Label htmlFor={option.key} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <Switch
                  id={option.key}
                  checked={paymentIcons[option.key]}
                  onCheckedChange={() => handleToggle(option.key)}
                />
              </div>
            ))}
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
