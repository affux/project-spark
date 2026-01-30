import React from 'react';
import { useOnboardingGuide } from '@/hooks/useOnboardingGuide';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { 
  HelpCircle, 
  Rocket, 
  MapPin, 
  ListChecks,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const OnboardingFAB: React.FC = () => {
  const {
    overallProgress,
    startWizard,
    startTour,
    toggleSidebar,
    resetProgress,
    isTourActive,
    isSidebarOpen,
  } = useOnboardingGuide();

  if (isTourActive) return null;

  const isComplete = overallProgress === 100;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "rounded-full w-14 h-14 shadow-lg relative",
              !isComplete && "animate-pulse"
            )}
          >
            <HelpCircle className="w-6 h-6" />
            {!isComplete && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                !
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Setup Progress</span>
                <span className="text-primary font-bold">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={startWizard} className="gap-2 cursor-pointer">
            <Rocket className="w-4 h-4" />
            <div>
              <div className="font-medium">Setup Wizard</div>
              <div className="text-xs text-muted-foreground">Step-by-step guide</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={startTour} className="gap-2 cursor-pointer">
            <MapPin className="w-4 h-4" />
            <div>
              <div className="font-medium">Guided Tour</div>
              <div className="text-xs text-muted-foreground">Interactive walkthrough</div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={toggleSidebar} className="gap-2 cursor-pointer">
            <ListChecks className="w-4 h-4" />
            <div>
              <div className="font-medium">Checklist</div>
              <div className="text-xs text-muted-foreground">
                {isSidebarOpen ? 'Close sidebar' : 'View all tasks'}
              </div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={resetProgress} className="gap-2 cursor-pointer text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>Reset Progress</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
