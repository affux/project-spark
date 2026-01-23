import { Sun, Moon, Droplets, Leaf, Sparkles, Check, Loader2, Eye, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useThemePreference } from '@/hooks/useThemePreference';

interface ThemeSelectorProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export const themes = [
  { 
    value: 'light', 
    label: 'Light', 
    icon: Sun, 
    description: 'Clean white theme',
    preview: 'bg-white border-gray-200'
  },
  { 
    value: 'dark', 
    label: 'Dark', 
    icon: Moon, 
    description: 'Easy on the eyes',
    preview: 'bg-gray-900 border-gray-700'
  },
  { 
    value: 'trading', 
    label: 'Trading', 
    icon: TrendingUp, 
    description: 'Dark with orange accents',
    preview: 'bg-[#0d0f14] border-orange-500'
  },
  { 
    value: 'blue', 
    label: 'Blue', 
    icon: Droplets, 
    description: 'Professional blue theme',
    preview: 'bg-blue-500 border-blue-600'
  },
  { 
    value: 'green', 
    label: 'Green', 
    icon: Leaf, 
    description: 'Fresh and natural',
    preview: 'bg-emerald-500 border-emerald-600'
  },
  { 
    value: 'purple', 
    label: 'Purple', 
    icon: Sparkles, 
    description: 'Creative and bold',
    preview: 'bg-purple-500 border-purple-600'
  },
];

export function ThemeSelector({ className, variant = 'ghost', showLabel = false }: ThemeSelectorProps) {
  const { theme, setTheme, isSaving, startPreview, cancelPreview, isPreviewActive } = useThemePreference();

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu onOpenChange={(open) => !open && isPreviewActive && cancelPreview()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? 'default' : 'icon'}
          className={cn('gap-2', showLabel ? 'px-3' : 'h-9 w-9', className)}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CurrentIcon className="h-4 w-4" />
          )}
          {showLabel && <span>{currentTheme.label}</span>}
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          Hover to preview
        </div>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              onMouseEnter={() => startPreview(themeOption.value)}
              onMouseLeave={() => cancelPreview()}
              className={cn(
                'flex items-center gap-3 cursor-pointer py-3',
                isSelected && 'bg-accent'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0',
                themeOption.preview
              )}>
                <Icon className={cn(
                  'h-4 w-4',
                  themeOption.value === 'light' ? 'text-gray-700' : 'text-white'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{themeOption.label}</p>
                <p className="text-xs text-muted-foreground">{themeOption.description}</p>
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Card-based theme selector for settings pages with preview
export function ThemeSelectorCard({ className }: { className?: string }) {
  const { theme, setTheme, isSaving, startPreview, cancelPreview, isPreviewActive, previewTheme } = useThemePreference();

  return (
    <div className={cn('space-y-3', className)}>
      {isPreviewActive && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <Eye className="h-4 w-4" />
          <span>Previewing: {themes.find(t => t.value === previewTheme)?.label}</span>
          <button onClick={cancelPreview} className="ml-auto text-xs underline">
            Cancel
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          const isPreviewing = previewTheme === themeOption.value;
          return (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              onMouseEnter={() => startPreview(themeOption.value)}
              onMouseLeave={() => cancelPreview()}
              disabled={isSaving}
              className={cn(
                'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : isPreviewing
                    ? 'border-primary/50 bg-accent/30'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center',
                themeOption.preview
              )}>
                <Icon className={cn(
                  'h-5 w-5 sm:h-6 sm:w-6',
                  themeOption.value === 'light' ? 'text-gray-700' : 'text-white'
                )} />
              </div>
              <span className={cn(
                'text-xs sm:text-sm font-medium',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {themeOption.label}
              </span>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Hover over a theme to preview • Click to apply
      </p>
      {isSaving && (
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving preference...
        </p>
      )}
    </div>
  );
}
