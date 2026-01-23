import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLanguage, languages, Language } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export function LanguageSelector({ className, variant = 'ghost', showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? 'default' : 'icon'}
          className={cn('gap-2', showLabel ? 'px-3' : 'h-9 w-9', className)}
        >
          <Globe className="h-4 w-4" />
          {showLabel && <span>{currentLanguage.nativeName}</span>}
          <span className="sr-only">Select language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg z-50">
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                'flex items-center gap-3 cursor-pointer py-2.5',
                isSelected && 'bg-accent'
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{lang.nativeName}</p>
                <p className="text-xs text-muted-foreground">{lang.name}</p>
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

// Card-based language selector for settings pages
export function LanguageSelectorCard({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {languages.map((lang) => {
        const isSelected = language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              isSelected 
                ? 'border-primary bg-primary/5 shadow-md' 
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="text-center">
              <p className="text-sm font-medium">{lang.nativeName}</p>
              <p className="text-xs text-muted-foreground">{lang.name}</p>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
