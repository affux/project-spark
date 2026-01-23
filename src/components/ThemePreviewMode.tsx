import { useState } from 'react';
import { Eye, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useThemePreference } from '@/hooks/useThemePreference';

const themes = [
  { 
    value: 'light', 
    label: 'Light',
    colors: ['#f8fafc', '#1e293b', '#f59e0b', '#1e3a5f']
  },
  { 
    value: 'dark', 
    label: 'Dark',
    colors: ['#0f172a', '#f8fafc', '#f59e0b', '#0f172a']
  },
  { 
    value: 'trading', 
    label: 'Trading',
    colors: ['#0d0f14', '#f97316', '#22c55e', '#ef4444']
  },
  { 
    value: 'blue', 
    label: 'Blue',
    colors: ['#e0f2fe', '#1e3a8a', '#0ea5e9', '#3b82f6']
  },
  { 
    value: 'green', 
    label: 'Green',
    colors: ['#ecfdf5', '#166534', '#10b981', '#22c55e']
  },
  { 
    value: 'purple', 
    label: 'Purple',
    colors: ['#faf5ff', '#581c87', '#a855f7', '#8b5cf6']
  },
];

interface ThemePreviewModeProps {
  className?: string;
}

export function ThemePreviewMode({ className }: ThemePreviewModeProps) {
  const { 
    actualTheme, 
    isPreviewActive, 
    previewTheme, 
    startPreview, 
    cancelPreview, 
    applyPreview,
    isSaving 
  } = useThemePreference();
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = themes.findIndex(t => t.value === actualTheme);
    return idx >= 0 ? idx : 0;
  });

  const handleStartPreview = () => {
    const theme = themes[currentIndex];
    startPreview(theme.value);
  };

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? themes.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    if (isPreviewActive) {
      startPreview(themes[newIndex].value);
    }
  };

  const handleNext = () => {
    const newIndex = currentIndex === themes.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    if (isPreviewActive) {
      startPreview(themes[newIndex].value);
    }
  };

  const currentTheme = themes[currentIndex];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Theme Preview Mode</span>
          </div>
          {isPreviewActive && (
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              Previewing
            </span>
          )}
        </div>

        {/* Theme Carousel */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div 
              className="flex-1 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50"
              onClick={handleStartPreview}
              style={{ 
                borderColor: isPreviewActive && previewTheme === currentTheme.value 
                  ? 'hsl(var(--primary))' 
                  : undefined 
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{currentTheme.label}</span>
                {actualTheme === currentTheme.value && (
                  <span className="text-xs text-muted-foreground">Current</span>
                )}
              </div>
              
              {/* Color preview */}
              <div className="flex gap-1">
                {currentTheme.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-8 rounded first:rounded-l-lg last:rounded-r-lg"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-1.5 mt-3">
            {themes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  if (isPreviewActive) {
                    startPreview(themes[idx].value);
                  }
                }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  idx === currentIndex 
                    ? 'bg-primary w-3' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>
        </div>

        {/* Preview Actions */}
        {isPreviewActive && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={cancelPreview}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={applyPreview}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 mr-2" />
              {isSaving ? 'Applying...' : 'Apply Theme'}
            </Button>
          </div>
        )}

        {!isPreviewActive && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Click on a theme to preview it before applying
          </p>
        )}
      </CardContent>
    </Card>
  );
}
