import React from 'react';
import { useOnboardingGuide, OnboardingCategory } from '@/hooks/useOnboardingGuide';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Shield, 
  Store, 
  ShoppingCart, 
  Briefcase, 
  Wallet,
  CheckCircle,
  Circle,
  ChevronRight,
  X,
  Rocket,
  Trophy
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

export const OnboardingSidebar: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    overallProgress,
    isSidebarOpen,
    toggleSidebar,
    markStepCompleted,
  } = useOnboardingGuide();

  if (!isSidebarOpen) return null;

  const handleStepClick = (stepId: string, route: string) => {
    markStepCompleted(stepId);
    navigate(route);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="font-semibold">Onboarding Progress</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {overallProgress === 100 && (
          <div className="mt-3 flex items-center gap-2 text-emerald-600 bg-emerald-500/10 p-2 rounded-lg">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">All steps completed!</span>
          </div>
        )}
      </div>

      {/* Categories List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon] || Circle;
            const isCompleted = category.progress === 100;

            return (
              <div key={category.id} className="space-y-2">
                {/* Category Header */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isCompleted ? "bg-emerald-500/20" : "bg-primary/10"
                  )}>
                    <IconComponent className={cn(
                      "w-4 h-4",
                      isCompleted ? "text-emerald-500" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.title}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          isCompleted && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        )}
                      >
                        {category.progress}%
                      </Badge>
                    </div>
                    <Progress value={category.progress} className="h-1 mt-1" />
                  </div>
                </div>

                {/* Steps List */}
                <div className="ml-10 space-y-1">
                  {category.steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step.id, step.route)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all",
                        "hover:bg-accent/50 group",
                        step.isCompleted && "opacity-60"
                      )}
                    >
                      {step.isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm flex-1",
                        step.isCompleted && "line-through text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <Button variant="outline" className="w-full" onClick={toggleSidebar}>
          Close Checklist
        </Button>
      </div>
    </div>
  );
};
