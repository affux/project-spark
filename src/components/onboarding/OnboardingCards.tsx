import React from 'react';
import { useOnboardingGuide, OnboardingCategory } from '@/hooks/useOnboardingGuide';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  Store, 
  ShoppingCart, 
  Briefcase, 
  Wallet,
  CheckCircle,
  ChevronRight,
  X,
  Sparkles,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  User,
  Shield,
  Store,
  ShoppingCart,
  Briefcase,
  Wallet,
};

interface OnboardingCardsProps {
  maxCards?: number;
  className?: string;
}

export const OnboardingCards: React.FC<OnboardingCardsProps> = ({ 
  maxCards = 3,
  className 
}) => {
  const navigate = useNavigate();
  const {
    categories,
    overallProgress,
    showOnboardingCards,
    hideOnboardingCards,
    markStepCompleted,
    startWizard,
  } = useOnboardingGuide();

  if (!showOnboardingCards || overallProgress === 100) return null;

  // Get incomplete categories sorted by progress
  const incompleteCategories = categories
    .filter(cat => cat.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, maxCards);

  const handleStepClick = (stepId: string, route: string) => {
    markStepCompleted(stepId);
    navigate(route);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main CTA Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 overflow-hidden relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 opacity-60 hover:opacity-100"
          onClick={hideOnboardingCards}
        >
          <X className="w-3 h-3" />
        </Button>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Complete Your Setup</h3>
                <Badge variant="outline">{overallProgress}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Complete these steps to unlock all features and start earning
              </p>
              <Progress value={overallProgress} className="h-2 mb-3" />
              <Button size="sm" onClick={startWizard} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Start Setup Wizard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incompleteCategories.map((category) => {
          const IconComponent = iconMap[category.icon] || Rocket;
          const nextStep = category.steps.find(s => !s.isCompleted);

          return (
            <Card 
              key={category.id} 
              className={cn(
                "hover:shadow-md transition-all cursor-pointer group",
                category.progress > 0 && "border-primary/20"
              )}
              onClick={() => nextStep && handleStepClick(nextStep.id, nextStep.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      category.progress > 0 ? "bg-primary/20" : "bg-muted"
                    )}>
                      <IconComponent className={cn(
                        "w-4 h-4",
                        category.progress > 0 ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <CardTitle className="text-sm">{category.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {category.steps.filter(s => s.isCompleted).length}/{category.steps.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={category.progress} className="h-1.5 mb-3" />
                
                {nextStep && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Next:</span>
                    <span className="font-medium flex-1 truncate">{nextStep.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completed steps indicator */}
      {categories.some(c => c.progress === 100) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>
            {categories.filter(c => c.progress === 100).length} of {categories.length} sections completed
          </span>
        </div>
      )}
    </div>
  );
};
