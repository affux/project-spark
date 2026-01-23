import React, { useState, useEffect } from 'react';
import { Save, Loader2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePendingPaymentBlockAdmin, PendingPaymentBlockSettings as SettingsType } from '@/hooks/usePendingPaymentBlock';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function PendingPaymentBlockSettings() {
  const { toast } = useToast();
  const { settings, isLoading, updateSettings } = usePendingPaymentBlockAdmin();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<SettingsType>({
    enabled: true,
    title: 'Payout Not Available',
    message: 'You currently have pending payments for one or more orders.\nPlease complete or resolve these payments before requesting a payout.',
    showOrderCount: true,
    showViewOrdersLink: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast({
        title: 'Settings Saved',
        description: 'Pending payment block settings have been updated.',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Pending Payment Block
        </CardTitle>
        <CardDescription>
          Block payout requests when users have pending order payments. The popup will be shown when they try to request a payout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base font-medium">Enable Blocking</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, users with pending payments cannot request payouts
            </p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        {/* Popup Title */}
        <div className="space-y-2">
          <Label htmlFor="popup-title">Popup Title</Label>
          <Input
            id="popup-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Payout Not Available"
          />
        </div>

        {/* Popup Message */}
        <div className="space-y-2">
          <Label htmlFor="popup-message">Popup Message</Label>
          <Textarea
            id="popup-message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="You currently have pending payments for one or more orders..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Use line breaks to format the message. This will be shown when a user tries to request a payout with pending payments.
          </p>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <Label className="text-base">Display Options</Label>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-normal">Show Pending Order Count</Label>
              <p className="text-sm text-muted-foreground">
                Display the number of pending orders in the popup
              </p>
            </div>
            <Switch
              checked={formData.showOrderCount}
              onCheckedChange={(checked) => setFormData({ ...formData, showOrderCount: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-normal">Show "View Orders" Link</Label>
              <p className="text-sm text-muted-foreground">
                Add a button to navigate to the orders page
              </p>
            </div>
            <Switch
              checked={formData.showViewOrdersLink}
              onCheckedChange={(checked) => setFormData({ ...formData, showViewOrdersLink: checked })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Popup Preview</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {/* Preview Card */}
                <div className="border rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{formData.title || 'Payout Not Available'}</h3>
                        {formData.showOrderCount && (
                          <p className="text-sm text-amber-600">3 pending orders require payment</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {formData.message || 'No message configured.'}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-muted/30 border-t flex gap-2">
                    {formData.showViewOrdersLink && (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        View Pending Orders
                      </Button>
                    )}
                    <Button size="sm" className="flex-1" disabled>
                      I Understand
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
