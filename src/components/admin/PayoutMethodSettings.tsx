import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Wallet, Building2, CreditCard, DollarSign } from 'lucide-react';

export interface PayoutMethodConfig {
  bank_transfer: boolean;
  upi: boolean;
  paypal: boolean;
  crypto: boolean;
}

const PayoutMethodSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSettingAsync, isUpdating, isLoading } = usePlatformSettings();
  
  const [methods, setMethods] = useState<PayoutMethodConfig>({
    bank_transfer: true,
    upi: true,
    paypal: true,
    crypto: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isLoading && settingsMap) {
      const savedMethods = (settingsMap as any).payout_methods_enabled;
      if (savedMethods) {
        setMethods(savedMethods);
      }
    }
  }, [isLoading, settingsMap]);

  const handleToggle = (method: keyof PayoutMethodConfig) => {
    setMethods(prev => {
      const updated = { ...prev, [method]: !prev[method] };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettingAsync({
        key: 'payout_methods_enabled',
        value: JSON.stringify(methods),
        oldValue: JSON.stringify((settingsMap as any).payout_methods_enabled || {}),
      });
      setHasChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Payout method settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving payout methods:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payout method settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const methodConfig = [
    {
      key: 'bank_transfer' as const,
      label: 'Bank Transfer',
      description: 'Allow users to request payouts via bank transfer',
      icon: Building2,
    },
    {
      key: 'upi' as const,
      label: 'UPI',
      description: 'Allow users to request payouts via UPI',
      icon: CreditCard,
    },
    {
      key: 'paypal' as const,
      label: 'PayPal',
      description: 'Allow users to request payouts via PayPal',
      icon: DollarSign,
    },
    {
      key: 'crypto' as const,
      label: 'USD Wallet',
      description: 'Allow users to request payouts to USD wallets',
      icon: Wallet,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Payout Methods</CardTitle>
            <CardDescription>
              Enable or disable payout methods available to users
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {methodConfig.map((config) => {
          const Icon = config.icon;
          return (
            <div
              key={config.key}
              className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <Switch
                checked={methods[config.key]}
                onCheckedChange={() => handleToggle(config.key)}
              />
            </div>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={isSaving || isUpdating || !hasChanges}
          className="w-full gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PayoutMethodSettings;
