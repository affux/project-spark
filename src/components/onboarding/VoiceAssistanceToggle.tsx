import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoiceAssistance } from '@/hooks/useVoiceAssistance';
import { cn } from '@/lib/utils';

interface VoiceAssistanceToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const VoiceAssistanceToggle: React.FC<VoiceAssistanceToggleProps> = ({
  className,
  showLabel = false,
  size = 'default',
}) => {
  const { isEnabled, isSupported, isSpeaking, toggleVoiceAssistance } = useVoiceAssistance();

  if (!isSupported) {
    return null;
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="icon"
            onClick={toggleVoiceAssistance}
            className={cn(
              buttonSize,
              isEnabled && isSpeaking && 'animate-pulse',
              className
            )}
          >
            {isEnabled ? (
              <Volume2 className={cn(iconSize, isSpeaking && 'text-primary-foreground')} />
            ) : (
              <VolumeX className={iconSize} />
            )}
            {showLabel && (
              <span className="ml-2">{isEnabled ? 'Voice On' : 'Voice Off'}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isEnabled ? 'Disable voice assistance' : 'Enable voice assistance'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
