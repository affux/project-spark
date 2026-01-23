import React, { useState } from 'react';
import { Loader2, CreditCard, Wallet, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { USDTIcon } from '@/components/icons/USDTIcon';

interface BulkPaymentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  onSuccess: () => void;
}

export const BulkPaymentSettingsDialog: React.FC<BulkPaymentSettingsDialogProps> = ({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { settingsMap } = usePlatformSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState({
    wallet: true,
    upi: true,
    bank_transfer: true,
    usd_wallet: true,
  });

  const globalSettings = {
    wallet: settingsMap.payment_method_wallet_balance_enabled,
    upi: settingsMap.payment_method_upi_enabled,
    bank_transfer: settingsMap.payment_method_bank_enabled,
    usd_wallet: settingsMap.payment_method_usd_wallet_enabled,
  };

  const handleToggle = (method: keyof typeof enabledMethods) => {
    setEnabledMethods(prev => ({
      ...prev,
      [method]: !prev[method],
    }));
  };

  const handleApply = async () => {
    if (selectedUserIds.length === 0) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Process each user
      for (const userId of selectedUserIds) {
        // Check if settings exist
        const { data: existing } = await supabase
          .from('user_payment_settings')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from('user_payment_settings')
            .update({
              enabled_methods: enabledMethods,
              updated_by: user?.id,
            })
            .eq('user_id', userId);
        } else {
          // Insert new
          await supabase
            .from('user_payment_settings')
            .insert({
              user_id: userId,
              enabled_methods: enabledMethods,
              updated_by: user?.id,
            });
        }
      }

      toast({
        title: 'Payment Settings Updated',
        description: `Updated payment settings for ${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''}.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bulk payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const methods = [
    {
      key: 'wallet' as const,
      label: 'Wallet Payment',
      icon: Wallet,
      globalEnabled: globalSettings.wallet,
    },
    {
      key: 'upi' as const,
      label: 'UPI Payment',
      icon: CreditCard,
      globalEnabled: globalSettings.upi,
    },
    {
      key: 'bank_transfer' as const,
      label: 'Bank Transfer',
      icon: Building2,
      globalEnabled: globalSettings.bank_transfer,
    },
    {
      key: 'usd_wallet' as const,
      label: 'USDT Wallet',
      icon: () => <USDTIcon className="w-4 h-4" />,
      globalEnabled: globalSettings.usd_wallet,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Bulk Payment Settings
          </DialogTitle>
          <DialogDescription>
            Configure payment methods for {selectedUserIds.length} selected user{selectedUserIds.length > 1 ? 's' : ''}.
            This will override their current payment settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {methods.map((method) => {
            const Icon = method.icon;
            return (
              <div
                key={method.key}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label className="font-medium">{method.label}</Label>
                    {!method.globalEnabled && (
                      <p className="text-xs text-destructive">Globally Disabled</p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={enabledMethods[method.key]}
                  onCheckedChange={() => handleToggle(method.key)}
                  disabled={!method.globalEnabled}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>Apply to {selectedUserIds.length} User{selectedUserIds.length > 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
