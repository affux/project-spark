import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Volume2, VolumeX, Play, Loader2, Save, Bell, BellOff, Check, X } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const NotificationSoundSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSettingAsync, isUpdating } = usePlatformSettings();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Initialize from settings
  useEffect(() => {
    if (settingsMap && !hasInitialized) {
      setSoundEnabled(settingsMap.notification_sound_enabled);
      setVolume(settingsMap.notification_sound_volume);
      setHasInitialized(true);
    }
  }, [settingsMap, hasInitialized]);

  // Track changes
  useEffect(() => {
    if (hasInitialized) {
      const changed =
        soundEnabled !== settingsMap.notification_sound_enabled ||
        volume !== settingsMap.notification_sound_volume;
      setHasChanges(changed);
    }
  }, [soundEnabled, volume, settingsMap, hasInitialized]);

  const handlePlayTest = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/notification.mp3');
    }
    audioRef.current.volume = volume / 100;
    audioRef.current.currentTime = 0;
    setIsPlaying(true);
    audioRef.current.play().catch(() => {
      setIsPlaying(false);
    });
    audioRef.current.onended = () => setIsPlaying(false);
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Browser notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive browser notifications for new messages.',
        });
        
        // Show a test notification
        new Notification('Notifications Enabled!', {
          body: 'You will receive alerts for new order chat messages.',
          icon: '/favicon.ico',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Permission Denied',
          description: 'Browser notifications were denied. You can change this in your browser settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSettingAsync({
          key: 'notification_sound_enabled',
          value: soundEnabled.toString(),
          oldValue: settingsMap.notification_sound_enabled.toString(),
        }),
        updateSettingAsync({
          key: 'notification_sound_volume',
          value: volume.toString(),
          oldValue: settingsMap.notification_sound_volume.toString(),
        }),
      ]);
      setHasChanges(false);
      toast({
        title: 'Sound Settings Saved',
        description: 'Notification sound settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving sound settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save sound settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPermissionBadge = () => {
    switch (notificationPermission) {
      case 'granted':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
            <Check className="w-3 h-3" />
            Enabled
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="w-3 h-3" />
            Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <BellOff className="w-3 h-3" />
            Not Set
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-indigo-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-indigo-600" />
            )}
          </div>
          <div>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure sound and browser notification settings.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Browser Notifications</Label>
                {getPermissionBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                Receive alerts even when the browser tab is not active.
              </p>
            </div>
          </div>
          
          {notificationPermission === 'default' && (
            <Button
              variant="outline"
              onClick={handleRequestPermission}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              Enable Browser Notifications
            </Button>
          )}
          
          {notificationPermission === 'denied' && (
            <p className="text-sm text-muted-foreground">
              To enable notifications, click the lock icon in your browser's address bar and allow notifications.
            </p>
          )}
        </div>

        <Separator />

        {/* Sound Settings Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Notification Sound</Label>
            <p className="text-sm text-muted-foreground">
              Play a sound when receiving new chat messages.
            </p>
          </div>
          <Switch
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Volume</Label>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="flex items-center gap-4">
            <VolumeX className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(val) => setVolume(val[0])}
              max={100}
              step={5}
              disabled={!soundEnabled}
              className="flex-1"
            />
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePlayTest}
            disabled={!soundEnabled || isPlaying}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            {isPlaying ? 'Playing...' : 'Test Sound'}
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isUpdating}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
