import React, { useState, useEffect } from 'react';
import { ChevronDown, RotateCcw, Save, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  searchQuery?: string;
  sectionKeywords?: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onResetToDefaults?: () => void;
  showResetButton?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  gridColumns?: 1 | 2 | 3;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  icon,
  children,
  defaultOpen = true,
  className,
  searchQuery = '',
  sectionKeywords = [],
  isOpen: controlledIsOpen,
  onOpenChange,
  onResetToDefaults,
  showResetButton = false,
  hasChanges = false,
  onSave,
  isSaving = false,
  gridColumns = 3,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  // Auto-open section if search matches
  useEffect(() => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = title.toLowerCase().includes(searchLower);
      const descMatch = description?.toLowerCase().includes(searchLower);
      const keywordMatch = sectionKeywords.some(kw => kw.toLowerCase().includes(searchLower));
      
      if (titleMatch || descMatch || keywordMatch) {
        setIsOpen(true);
      }
    }
  }, [searchQuery, title, description, sectionKeywords]);

  // Check if section should be visible based on search
  const isVisible = () => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = title.toLowerCase().includes(searchLower);
    const descMatch = description?.toLowerCase().includes(searchLower);
    const keywordMatch = sectionKeywords.some(kw => kw.toLowerCase().includes(searchLower));
    return titleMatch || descMatch || keywordMatch;
  };

  if (!isVisible()) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("col-span-full", className)}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button className="flex-1 flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  {hasChanges && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 rounded">
                      Unsaved
                    </span>
                  )}
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        {hasChanges && onSave && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            disabled={isSaving}
            className="shrink-0 gap-1.5"
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>
        )}
        {showResetButton && onResetToDefaults && (
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onResetToDefaults();
            }}
            className="shrink-0 h-9 w-9"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
        <div className={cn(
          "grid gap-4 pt-4",
          gridColumns === 1 && "grid-cols-1",
          gridColumns === 2 && "grid-cols-1 lg:grid-cols-2",
          gridColumns === 3 && "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
        )}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
