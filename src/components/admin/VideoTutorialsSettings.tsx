import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Video, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  GripVertical,
  PlayCircle,
  ExternalLink
} from 'lucide-react';
import { usePlatformSettings, VideoTutorial } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const VideoTutorialsSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSettingAsync, isUpdating, isLoading } = usePlatformSettings();
  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Wait for settings to load before initializing
    if (!hasInitialized && !isLoading) {
      setTutorials(settingsMap.video_tutorials || []);
      setHasInitialized(true);
    }
  }, [settingsMap.video_tutorials, hasInitialized, isLoading]);

  const addTutorial = () => {
    const newTutorial: VideoTutorial = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      videoUrl: '',
      topic: '',
      sortOrder: tutorials.length,
    };
    setTutorials([...tutorials, newTutorial]);
  };

  const updateTutorial = (id: string, field: keyof VideoTutorial, value: string | number) => {
    setTutorials(tutorials.map(tutorial => 
      tutorial.id === id ? { ...tutorial, [field]: value } : tutorial
    ));
  };

  const removeTutorial = (id: string) => {
    setTutorials(tutorials.filter(tutorial => tutorial.id !== id));
  };

  const getYouTubeThumbnail = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
    }
    return null;
  };

  const handleSave = async () => {
    // Validate that all items have required fields
    const invalidItems = tutorials.filter(item => 
      !item.title.trim() || !item.videoUrl.trim() || !item.topic.trim()
    );
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in title, topic, and video URL for all tutorials.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettingAsync({
        key: 'video_tutorials',
        value: JSON.stringify(tutorials),
        oldValue: JSON.stringify(settingsMap.video_tutorials),
      });
      toast({
        title: "Video Tutorials Saved",
        description: "Your video tutorials have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving video tutorials:', error);
      toast({
        title: "Error",
        description: "Failed to save video tutorials.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique topics for display
  const uniqueTopics = [...new Set(tutorials.map(t => t.topic).filter(Boolean))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Video className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <CardTitle>Video Tutorials</CardTitle>
            <CardDescription>
              Add guidance videos organized by topic to help users learn how to use the platform.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            <span className="text-sm text-muted-foreground">Topics:</span>
            {uniqueTopics.map(topic => (
              <span 
                key={topic} 
                className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {tutorials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No video tutorials yet. Click the button below to add one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tutorials.map((tutorial, index) => {
              const thumbnail = getYouTubeThumbnail(tutorial.videoUrl);
              return (
                <div 
                  key={tutorial.id} 
                  className="p-4 border rounded-lg bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Tutorial #{index + 1}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTutorial(tutorial.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label>Topic <span className="text-destructive">*</span></Label>
                        <Input
                          value={tutorial.topic}
                          onChange={(e) => updateTutorial(tutorial.id, 'topic', e.target.value)}
                          placeholder="e.g., Getting Started, Orders, Payments..."
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Title <span className="text-destructive">*</span></Label>
                        <Input
                          value={tutorial.title}
                          onChange={(e) => updateTutorial(tutorial.id, 'title', e.target.value)}
                          placeholder="Enter video title..."
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Video URL <span className="text-destructive">*</span></Label>
                        <Input
                          value={tutorial.videoUrl}
                          onChange={(e) => updateTutorial(tutorial.id, 'videoUrl', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          value={tutorial.description}
                          onChange={(e) => updateTutorial(tutorial.id, 'description', e.target.value)}
                          placeholder="Brief description of what this tutorial covers..."
                          rows={2}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      {thumbnail ? (
                        <div className="relative w-full max-w-[280px] aspect-video rounded-lg overflow-hidden group">
                          <img 
                            src={thumbnail} 
                            alt={tutorial.title || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle className="w-12 h-12 text-white" />
                          </div>
                          <a 
                            href={tutorial.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-md text-white hover:bg-black/80 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-full max-w-[280px] aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                          <Video className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-xs">Enter a YouTube URL to preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={addTutorial} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Video Tutorial
          </Button>
          
          {tutorials.length > 0 && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isUpdating}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Tutorials
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
