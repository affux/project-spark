import React, { useEffect, useState } from 'react';
import { useOnboardingGuide } from '@/hooks/useOnboardingGuide';
import { useVoiceAssistance } from '@/hooks/useVoiceAssistance';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  MapPin,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceAssistanceToggle } from './VoiceAssistanceToggle';

export const OnboardingTour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    allSteps,
    isTourActive,
    currentTourStep,
    stopTour,
    nextTourStep,
    prevTourStep,
    markStepCompleted,
  } = useOnboardingGuide();

  const [position, setPosition] = useState({ top: 20, right: 20 });
  const { isEnabled: voiceEnabled, speakStep, stop: stopSpeaking } = useVoiceAssistance();

  const incompleteSteps = allSteps.filter(s => !s.isCompleted);
  const currentStep = incompleteSteps[currentTourStep];

  // Auto-navigate to step route if not already there
  useEffect(() => {
    if (isTourActive && currentStep && !location.pathname.startsWith(currentStep.route)) {
      navigate(currentStep.route);
    }
  }, [isTourActive, currentStep, location.pathname, navigate]);

  // Speak current step when it changes
  useEffect(() => {
    if (isTourActive && currentStep && voiceEnabled) {
      speakStep(currentStep.title, currentStep.description);
    }
  }, [isTourActive, currentStep, voiceEnabled, speakStep]);

  // Stop speaking when tour ends
  useEffect(() => {
    if (!isTourActive) {
      stopSpeaking();
    }
  }, [isTourActive, stopSpeaking]);

  if (!isTourActive || !currentStep) return null;

  const handleComplete = () => {
    markStepCompleted(currentStep.id);
    nextTourStep();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-[100] pointer-events-none" />
      
      {/* Tour Card */}
      <Card 
        className="fixed z-[101] w-80 shadow-2xl border-2 border-primary/30 animate-in slide-in-from-right-5"
        style={{ top: position.top, right: position.right }}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-primary/5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Guided Tour</span>
            </div>
            <div className="flex items-center gap-2">
              <VoiceAssistanceToggle size="sm" className="h-6 w-6" />
              <Badge variant="outline" className="text-xs">
                {currentTourStep + 1} / {incompleteSteps.length}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stopTour}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{currentTourStep + 1}</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{currentStep.title}</h4>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleComplete}>
              <Sparkles className="w-4 h-4" />
              {currentStep.action}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-3 border-t bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevTourStep}
              disabled={currentTourStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button variant="ghost" size="sm" onClick={stopTour}>
              Exit Tour
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={nextTourStep}
              disabled={currentTourStep === incompleteSteps.length - 1}
            >
              Skip
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating indicator pointing to action */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[101]">
        <div className={cn(
          "bg-primary text-primary-foreground px-4 py-2 rounded-full",
          "flex items-center gap-2 shadow-lg animate-bounce"
        )}>
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Complete this step to continue</span>
        </div>
      </div>
    </>
  );
};
