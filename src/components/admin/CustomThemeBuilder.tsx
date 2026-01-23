import { useState, useEffect } from 'react';
import { Palette, RotateCcw, Save, Eye, EyeOff, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils';

interface ThemeColor {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
}

interface ThemePreset {
  id: string;
  name: string;
  colors: Record<string, string>;
  createdAt: string;
}

const themeColors: ThemeColor[] = [
  { key: 'primary', label: 'Primary', description: 'Main brand color', defaultValue: '#1e3a5f' },
  { key: 'secondary', label: 'Secondary', description: 'Secondary elements', defaultValue: '#f1f5f9' },
  { key: 'accent', label: 'Accent', description: 'Highlights & CTAs', defaultValue: '#f59e0b' },
  { key: 'background', label: 'Background', description: 'Page background', defaultValue: '#f8fafc' },
  { key: 'foreground', label: 'Text', description: 'Primary text color', defaultValue: '#1e293b' },
  { key: 'sidebar', label: 'Sidebar', description: 'Sidebar background', defaultValue: '#1e3a5f' },
];

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (!parts) return '#000000';
  
  const h = parseInt(parts[1]) / 360;
  const s = parseInt(parts[2]) / 100;
  const l = parseInt(parts[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function CustomThemeBuilder() {
  const { settingsMap, updateSetting, isLoading, isUpdating } = usePlatformSettings();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  // Load saved custom theme colors and presets from settings
  useEffect(() => {
    if (settingsMap) {
      const savedColors: Record<string, string> = {};
      themeColors.forEach(color => {
        const settingKey = `custom_theme_${color.key}` as keyof typeof settingsMap;
        const savedValue = settingsMap[settingKey];
        if (savedValue && typeof savedValue === 'string') {
          savedColors[color.key] = hslToHex(savedValue);
        } else {
          savedColors[color.key] = color.defaultValue;
        }
      });
      setColors(savedColors);

      // Load presets
      const presetsValue = settingsMap['custom_theme_presets'] as string | undefined;
      if (presetsValue) {
        try {
          const parsedPresets = JSON.parse(presetsValue);
          setPresets(Array.isArray(parsedPresets) ? parsedPresets : []);
        } catch {
          setPresets([]);
        }
      }
    }
  }, [settingsMap]);

  const handleColorChange = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    if (isPreviewActive) {
      applyPreviewColors({ ...colors, [key]: value });
    }
  };

  const applyPreviewColors = (colorSet: Record<string, string>) => {
    const root = document.documentElement;
    
    root.classList.remove('light', 'dark', 'blue', 'green', 'purple');
    root.classList.add('custom');
    
    root.style.setProperty('--primary', hexToHsl(colorSet.primary || '#1e3a5f'));
    root.style.setProperty('--secondary', hexToHsl(colorSet.secondary || '#f1f5f9'));
    root.style.setProperty('--accent', hexToHsl(colorSet.accent || '#f59e0b'));
    root.style.setProperty('--background', hexToHsl(colorSet.background || '#f8fafc'));
    root.style.setProperty('--foreground', hexToHsl(colorSet.foreground || '#1e293b'));
    root.style.setProperty('--sidebar-background', hexToHsl(colorSet.sidebar || '#1e3a5f'));
    
    const bgHsl = hexToHsl(colorSet.background || '#f8fafc');
    const fgHsl = hexToHsl(colorSet.foreground || '#1e293b');
    root.style.setProperty('--card', bgHsl);
    root.style.setProperty('--card-foreground', fgHsl);
    root.style.setProperty('--popover', bgHsl);
    root.style.setProperty('--popover-foreground', fgHsl);
    root.style.setProperty('--muted', hexToHsl(colorSet.secondary || '#f1f5f9'));
    root.style.setProperty('--border', hexToHsl(colorSet.secondary || '#f1f5f9'));
    root.style.setProperty('--input', hexToHsl(colorSet.secondary || '#f1f5f9'));
    root.style.setProperty('--ring', hexToHsl(colorSet.primary || '#1e3a5f'));
    root.style.setProperty('--sidebar-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-primary', hexToHsl(colorSet.accent || '#f59e0b'));
  };

  const togglePreview = () => {
    if (isPreviewActive) {
      const root = document.documentElement;
      root.classList.remove('custom');
      root.classList.add('light');
      
      themeColors.forEach(color => {
        root.style.removeProperty(`--${color.key}`);
      });
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--popover');
      root.style.removeProperty('--popover-foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--border');
      root.style.removeProperty('--input');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--sidebar-primary');
      
      setIsPreviewActive(false);
    } else {
      applyPreviewColors(colors);
      setIsPreviewActive(true);
    }
  };

  const handleReset = () => {
    const defaultColors: Record<string, string> = {};
    themeColors.forEach(color => {
      defaultColors[color.key] = color.defaultValue;
    });
    setColors(defaultColors);
    if (isPreviewActive) {
      applyPreviewColors(defaultColors);
    }
    toast.info('Colors reset to defaults');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const color of themeColors) {
        const key = `custom_theme_${color.key}`;
        const value = hexToHsl(colors[color.key] || color.defaultValue);
        await new Promise<void>((resolve, reject) => {
          updateSetting(
            { key, value },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }
      toast.success('Custom theme saved successfully');
    } catch (error) {
      console.error('Error saving custom theme:', error);
      toast.error('Failed to save custom theme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsPreset = async () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    setIsSavingPreset(true);
    try {
      const newPreset: ThemePreset = {
        id: crypto.randomUUID(),
        name: newPresetName.trim(),
        colors: { ...colors },
        createdAt: new Date().toISOString(),
      };

      const updatedPresets = [...presets, newPreset];
      
      await new Promise<void>((resolve, reject) => {
        updateSetting(
          { key: 'custom_theme_presets', value: JSON.stringify(updatedPresets) },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });

      setPresets(updatedPresets);
      setNewPresetName('');
      setIsPresetDialogOpen(false);
      toast.success(`Theme preset "${newPreset.name}" saved successfully`);
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Failed to save theme preset');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleLoadPreset = (preset: ThemePreset) => {
    setColors(preset.colors);
    if (isPreviewActive) {
      applyPreviewColors(preset.colors);
    }
    toast.success(`Loaded preset "${preset.name}"`);
  };

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    try {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      
      await new Promise<void>((resolve, reject) => {
        updateSetting(
          { key: 'custom_theme_presets', value: JSON.stringify(updatedPresets) },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });

      setPresets(updatedPresets);
      toast.success(`Preset "${presetName}" deleted`);
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Custom Theme Builder</CardTitle>
              <CardDescription>Create your own brand theme with custom colors</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePreview}
              className={cn(isPreviewActive && 'bg-primary text-primary-foreground')}
            >
              {isPreviewActive ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Exit Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {themeColors.map(color => (
            <div key={color.key} className="space-y-2">
              <Label htmlFor={color.key} className="text-sm font-medium">
                {color.label}
              </Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-border shadow-sm flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: colors[color.key] || color.defaultValue }}
                >
                  <input
                    type="color"
                    id={color.key}
                    value={colors[color.key] || color.defaultValue}
                    onChange={(e) => handleColorChange(color.key, e.target.value)}
                    className="w-full h-full cursor-pointer opacity-0"
                  />
                </div>
                <Input
                  value={colors[color.key] || color.defaultValue}
                  onChange={(e) => handleColorChange(color.key, e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-xs h-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">{color.description}</p>
            </div>
          ))}
        </div>

        {/* Color Preview Swatches */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preview</Label>
          <div className="flex items-center gap-2 p-4 rounded-lg border bg-card">
            {themeColors.map(color => (
              <div
                key={color.key}
                className="w-12 h-12 rounded-lg shadow-sm border"
                style={{ backgroundColor: colors[color.key] || color.defaultValue }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Saved Presets */}
        {presets.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Saved Presets</Label>
            <ScrollArea className="max-h-48">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex gap-0.5 flex-shrink-0">
                        {Object.values(preset.colors).slice(0, 4).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-sm border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium truncate">{preset.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleLoadPreset(preset)}
                        title="Load preset"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePreset(preset.id, preset.name)}
                        title="Delete preset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-2">
            <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Save as Preset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Theme Preset</DialogTitle>
                  <DialogDescription>
                    Give your custom theme a name to save it for later use.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      placeholder="e.g., Ocean Blue, Corporate Brand"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveAsPreset()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {themeColors.map(color => (
                      <div
                        key={color.key}
                        className="w-8 h-8 rounded-md border shadow-sm"
                        style={{ backgroundColor: colors[color.key] || color.defaultValue }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAsPreset} disabled={isSavingPreset}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingPreset ? 'Saving...' : 'Save Preset'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Apply Theme'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
