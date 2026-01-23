import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  DollarSign, 
  Zap,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const AutoPayoutSettings: React.FC = () => {
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(settingsMap.auto_payout_enabled);
  const [threshold, setThreshold] = useState(settingsMap.auto_payout_threshold.toString());
  const [schedule, setSchedule] = useState(settingsMap.auto_payout_schedule);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting({ 
        key: 'auto_payout_enabled', 
        value: enabled.toString(),
        oldValue: settingsMap.auto_payout_enabled.toString()
      });
      await updateSetting({ 
        key: 'auto_payout_threshold', 
        value: threshold,
        oldValue: settingsMap.auto_payout_threshold.toString()
      });
      await updateSetting({ 
        key: 'auto_payout_schedule', 
        value: schedule,
        oldValue: settingsMap.auto_payout_schedule
      });
      toast({
        title: 'Settings Saved',
        description: 'Auto-payout settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleLabels: Record<string, string> = {
    daily: 'Every day at midnight',
    weekly: 'Every Monday at midnight',
    monthly: 'First of each month at midnight',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <CardTitle>Auto-Payout Settings</CardTitle>
            <CardDescription>
              Automatically create payout requests when dropshipper balances exceed threshold
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Enable Auto-Payout</p>
              <p className="text-sm text-muted-foreground">
                Automatically create payout requests for eligible dropshippers
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Threshold Setting */}
        <div className="space-y-2">
          <Label htmlFor="threshold" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Minimum Balance Threshold
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="max-w-[200px]"
              disabled={!enabled}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Payout requests will be created when wallet balance reaches this amount
          </p>
        </div>

        {/* Schedule Setting */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Processing Schedule
          </Label>
          <Select
            value={schedule}
            onValueChange={(v) => setSchedule(v as 'daily' | 'weekly' | 'monthly')}
            disabled={!enabled}
          >
            <SelectTrigger className="max-w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {scheduleLabels[schedule]}
          </p>
        </div>

        {/* How it works */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>System checks dropshipper wallet balances on the selected schedule</li>
            <li>Dropshippers with approved KYC and balance ≥ threshold are eligible</li>
            <li>Payout request is auto-created if no pending request exists</li>
            <li>Dropshipper is notified via email about the pending payout</li>
            <li>Admin can then approve/reject the payout as usual</li>
          </ul>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving || isUpdating} className="gap-2">
          {(isSaving || isUpdating) && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
