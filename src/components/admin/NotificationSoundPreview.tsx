import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Square,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { playNotificationSound } from '@/lib/notificationSound';
import { cn } from '@/lib/utils';

interface NotificationSoundPreviewProps {
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  isUpdating?: boolean;
}

export const NotificationSoundPreview: React.FC<NotificationSoundPreviewProps> = ({
  soundEnabled,
  onSoundEnabledChange,
  isUpdating = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [playSuccess, setPlaySuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlaySound = async () => {
    setIsPlaying(true);
    setPlaySuccess(false);
    
    try {
      // Create audio element with volume control
      const audio = new Audio('/notification.mp3');
      audioRef.current = audio;
      audio.volume = volume[0] / 100;
      
      audio.onended = () => {
        setIsPlaying(false);
        setPlaySuccess(true);
        setTimeout(() => setPlaySuccess(false), 2000);
      };
      
      audio.onerror = () => {
        // Fallback to web audio beep
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = volume[0] / 100 * 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        setTimeout(() => {
          oscillator.stop();
          setIsPlaying(false);
          setPlaySuccess(true);
          setTimeout(() => setPlaySuccess(false), 2000);
        }, 300);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play sound:', error);
      setIsPlaying(false);
    }
  };

  const handleStopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <CardTitle>Notification Sound</CardTitle>
          <Badge variant="outline" className="ml-2">Preview</Badge>
        </div>
        <CardDescription>
          Test and configure the notification sound for new chat assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="sound-toggle">Sound Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when new chat is assigned
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={onSoundEnabledChange}
            disabled={isUpdating}
          />
        </div>

        {/* Volume Control */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Preview Volume</Label>
            <span className="text-sm text-muted-foreground">{volume[0]}%</span>
          </div>
          <div className="flex items-center gap-4">
            <VolumeX className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Preview Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={isPlaying ? handleStopSound : handlePlaySound}
            disabled={!soundEnabled}
            variant={isPlaying ? "destructive" : "default"}
            className={cn(
              "gap-2 transition-all",
              playSuccess && "bg-green-500 hover:bg-green-600"
            )}
          >
            {playSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sound Played!
              </>
            ) : isPlaying ? (
              <>
                <Square className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Test Sound
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground">
            {!soundEnabled 
              ? "Enable sound notifications to preview" 
              : "Click to hear the notification sound"
            }
          </p>
        </div>

        {/* Sound Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">When will this sound play?</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>New chat assigned to you</li>
                <li>Chat reassigned from another agent</li>
                <li>User returns to waiting chat</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
