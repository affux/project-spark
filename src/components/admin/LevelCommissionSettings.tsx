import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Award, Save, Loader2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LEVEL_CONFIG = [
  { key: 'bronze', label: 'Bronze', color: 'bg-amber-700', thresholdKey: null },
  { key: 'silver', label: 'Silver', color: 'bg-gray-400', thresholdKey: 'level_threshold_silver' },
  { key: 'gold', label: 'Gold', color: 'bg-yellow-500', thresholdKey: 'level_threshold_gold' },
] as const;

export const LevelCommissionSettings: React.FC = () => {
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  const { toast } = useToast();

  const [thresholds, setThresholds] = useState({
    silver: settingsMap.level_threshold_silver,
    gold: settingsMap.level_threshold_gold,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setThresholds({
      silver: settingsMap.level_threshold_silver,
      gold: settingsMap.level_threshold_gold,
    });
  }, [
    settingsMap.level_threshold_silver,
    settingsMap.level_threshold_gold
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save thresholds
      if (thresholds.silver !== settingsMap.level_threshold_silver) {
        await new Promise<void>((resolve, reject) => {
          updateSetting(
            { key: 'level_threshold_silver', value: String(thresholds.silver), oldValue: String(settingsMap.level_threshold_silver) },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }

      if (thresholds.gold !== settingsMap.level_threshold_gold) {
        await new Promise<void>((resolve, reject) => {
          updateSetting(
            { key: 'level_threshold_gold', value: String(thresholds.gold), oldValue: String(settingsMap.level_threshold_gold) },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }
      
      toast({
        title: 'Settings Updated',
        description: 'Level badge thresholds have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    thresholds.silver !== settingsMap.level_threshold_silver ||
    thresholds.gold !== settingsMap.level_threshold_gold;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          User Level Badges
        </CardTitle>
        <CardDescription>
          Configure order thresholds for each user level badge. Users automatically earn badges based on their completed orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LEVEL_CONFIG.map((level) => (
            <div key={level.key} className={`space-y-3 p-4 rounded-lg border bg-card ${level.key === 'gold' ? 'ring-2 ring-yellow-500/20' : ''}`}>
              <div className="flex items-center justify-between">
                <Badge className={`${level.color} text-white`}>
                  {level.label}
                </Badge>
              </div>

              {/* Order Threshold (only for Silver and Gold) */}
              {level.thresholdKey ? (
                <div className="space-y-1">
                  <Label htmlFor={`threshold-${level.key}`} className="flex items-center gap-1 text-xs">
                    <ShoppingBag className="w-3 h-3" />
                    Orders Required
                  </Label>
                  <Input
                    id={`threshold-${level.key}`}
                    type="number"
                    min="1"
                    value={thresholds[level.key as keyof typeof thresholds]}
                    onChange={(e) => setThresholds(prev => ({
                      ...prev,
                      [level.key]: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
              ) : (
                <div className="h-[52px] flex items-center">
                  <p className="text-sm text-muted-foreground">Default level</p>
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-muted-foreground">
                {level.key === 'bronze' && 'Starting badge for new users'}
                {level.key === 'silver' && `Unlocks at ${thresholds.silver}+ completed orders`}
                {level.key === 'gold' && `Unlocks at ${thresholds.gold}+ completed orders`}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || isUpdating || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> User level badges are honor badges automatically assigned based on completed order count. 
            Bronze is the default level, Silver unlocks at {thresholds.silver} orders, and Gold at {thresholds.gold} orders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
