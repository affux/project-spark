import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingGuide, OnboardingCategory } from '@/hooks/useOnboardingGuide';
import { useVoiceAssistance } from '@/hooks/useVoiceAssistance';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Shield, 
  Store, 
  ShoppingCart, 
  Briefcase, 
  Wallet,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Circle,
  Sparkles,
  Rocket,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceAssistanceToggle } from './VoiceAssistanceToggle';

const iconMap: Record<string, React.ElementType> = {
  User,
  Shield,
  Store,
  ShoppingCart,
  Briefcase,
  Wallet,
};

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isWizardOpen, 
    closeWizard, 
    categories, 
    overallProgress,
    markStepCompleted,
  } = useOnboardingGuide();
  
  const { 
    isEnabled: voiceEnabled, 
    speakStep, 
    speakWelcome, 
    stop: stopSpeaking 
  } = useVoiceAssistance();
  
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);

  const currentCategory = categories[currentCategoryIndex];
  const currentStep = currentCategory?.steps[currentStepIndex];
  const IconComponent = iconMap[currentCategory?.icon] || Circle;

  // Speak welcome message when wizard opens
  useEffect(() => {
    if (isWizardOpen && voiceEnabled && !hasSpokenWelcome) {
      speakWelcome();
      setHasSpokenWelcome(true);
    }
    if (!isWizardOpen) {
      setHasSpokenWelcome(false);
      stopSpeaking();
    }
  }, [isWizardOpen, voiceEnabled, hasSpokenWelcome, speakWelcome, stopSpeaking]);

  // Speak current step when it changes
  useEffect(() => {
    if (isWizardOpen && currentStep && voiceEnabled && hasSpokenWelcome) {
      const timer = setTimeout(() => {
        speakStep(currentStep.title, currentStep.description);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isWizardOpen, currentStep, voiceEnabled, hasSpokenWelcome, speakStep]);

  const handleNext = () => {
    if (currentStepIndex < currentCategory.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
      setCurrentStepIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
      setCurrentStepIndex(categories[currentCategoryIndex - 1].steps.length - 1);
    }
  };

  const handleGoToStep = () => {
    if (currentStep) {
      markStepCompleted(currentStep.id);
      closeWizard();
      navigate(currentStep.route);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const isFirstStep = currentCategoryIndex === 0 && currentStepIndex === 0;
  const isLastStep = currentCategoryIndex === categories.length - 1 && 
    currentStepIndex === currentCategory.steps.length - 1;

  const totalSteps = categories.reduce((sum, cat) => sum + cat.steps.length, 0);
  const currentOverallStep = categories.slice(0, currentCategoryIndex).reduce((sum, cat) => sum + cat.steps.length, 0) + currentStepIndex + 1;

  return (
    <Dialog open={isWizardOpen} onOpenChange={(open) => !open && closeWizard()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <VoiceAssistanceToggle size="sm" />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeWizard}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Getting Started Guide</DialogTitle>
              <p className="text-sm text-muted-foreground">Follow these steps to set up your account</p>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex gap-1 px-6 py-3 border-b bg-muted/30 overflow-x-auto">
          {categories.map((cat, idx) => {
            const CatIcon = iconMap[cat.icon] || Circle;
            const isActive = idx === currentCategoryIndex;
            const isCompleted = cat.progress === 100;
            
            return (
              <Button
                key={cat.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex-shrink-0 gap-2",
                  isCompleted && !isActive && "text-emerald-600"
                )}
                onClick={() => {
                  setCurrentCategoryIndex(idx);
                  setCurrentStepIndex(0);
                }}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <CatIcon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{cat.title}</span>
              </Button>
            );
          })}
        </div>

        {/* Current Step Content */}
        <div className="p-6">
          {/* Category Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              currentCategory.progress === 100 ? "bg-emerald-500/20" : "bg-primary/10"
            )}>
              <IconComponent className={cn(
                "w-5 h-5",
                currentCategory.progress === 100 ? "text-emerald-500" : "text-primary"
              )} />
            </div>
            <div>
              <h3 className="font-semibold">{currentCategory.title}</h3>
              <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              {currentStepIndex + 1} / {currentCategory.steps.length}
            </Badge>
          </div>

          {/* Step Card */}
          {currentStep && (
            <Card className={cn(
              "border-2 transition-all",
              currentStep.isCompleted ? "border-emerald-500/50 bg-emerald-500/5" : "border-primary/20"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    currentStep.isCompleted ? "bg-emerald-500 text-white" : "bg-primary/20"
                  )}>
                    {currentStep.isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold text-primary">{currentStepIndex + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{currentStep.title}</h4>
                    <p className="text-muted-foreground mb-4">{currentStep.description}</p>
                    
                    {!currentStep.isCompleted && (
                      <Button onClick={handleGoToStep} className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        {currentStep.action}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {currentStep.isCompleted && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Steps indicator */}
          <div className="flex justify-center gap-1 mt-4">
            {currentCategory.steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentStepIndex 
                    ? "bg-primary w-6" 
                    : step.isCompleted 
                      ? "bg-emerald-500" 
                      : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Step {currentOverallStep} of {totalSteps}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            {!currentStep?.isCompleted && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isLastStep}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
