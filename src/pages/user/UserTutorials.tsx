import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Video, CheckCircle, Circle, X, Shield, Store, Briefcase, ShoppingCart, Wallet, ArrowRight, Lock, Trophy, ChevronRight } from 'lucide-react';
import { VideoTutorial } from '@/hooks/usePlatformSettings';
import { useVideoTutorialProgress } from '@/hooks/useVideoTutorialProgress';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const steps = [
  { id: 'kyc', num: 1, label: 'Complete Your KYC', icon: Shield, route: '/dashboard/kyc', description: 'Verify your identity to unlock all features' },
  { id: 'storefront', num: 2, label: 'Create Your Store Front', icon: Store, route: '/dashboard/storefront', description: 'Set up your store and start selling' },
  { id: 'workspace', num: 3, label: 'Complete Your Work Space', icon: Briefcase, route: '/dashboard/workspace', description: 'Submit your first proof of work' },
  { id: 'order', num: 4, label: 'How to Complete the Order', icon: ShoppingCart, route: '/dashboard/orders', description: 'Learn the order fulfillment process' },
  { id: 'payout', num: 5, label: 'How to Rise Payout Request', icon: Wallet, route: '/dashboard/payments', description: 'Learn how to withdraw your earnings' },
];

const UserTutorials: React.FC = () => {
  const navigate = useNavigate();
  const { settings: publicSettings, isLoading } = usePublicSettings();
  const { isTutorialWatched, markAsWatched, watchedCount, getProgress } = useVideoTutorialProgress();
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [videoLoadErrorUrl, setVideoLoadErrorUrl] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const videoTutorials = publicSettings.video_tutorials || [];
  const progressPercentage = getProgress(videoTutorials.length);
  const totalSteps = Math.max(steps.length, videoTutorials.length);
  const completedSteps = watchedCount;

  // Map tutorials to steps by sortOrder
  const stepTutorialMap = useMemo(() => {
    const map: Record<number, VideoTutorial[]> = {};
    videoTutorials.forEach((t, i) => {
      const stepIndex = Math.min(i, steps.length - 1);
      if (!map[stepIndex]) map[stepIndex] = [];
      map[stepIndex].push(t);
    });
    return map;
  }, [videoTutorials]);

  // Find first incomplete step
  const firstIncompleteStep = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const tutorials = stepTutorialMap[i] || [];
      const allWatched = tutorials.length > 0 && tutorials.every(t => isTutorialWatched(t.id));
      if (!allWatched) return i;
    }
    return 0;
  }, [stepTutorialMap, isTutorialWatched]);

  // Auto-expand the first incomplete step on load
  React.useEffect(() => {
    if (activeStep === null) {
      setActiveStep(firstIncompleteStep);
    }
  }, [firstIncompleteStep]);

  const isStepComplete = (index: number) => {
    const tutorials = stepTutorialMap[index] || [];
    return tutorials.length > 0 && tutorials.every(t => isTutorialWatched(t.id));
  };

  // video utility functions
  const isDirectVideoUrl = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return false;
    return lower.startsWith('http://') || lower.startsWith('https://');
  };

  const isYouTubeUrl = (url: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const base = 'https://www.youtube-nocookie.com/embed';
    if (match && match[2].length === 11) return `${base}/${match[2]}?autoplay=1&rel=0&modestbranding=1`;
    if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
      return url.replace('https://www.youtube.com/embed/', `${base}/`).replace('https://www.youtube-nocookie.com/embed/', `${base}/`);
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
    return null;
  };

  const handlePlayVideo = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header with overall progress */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="w-7 h-7 text-primary" />
              Complete Your Setup
            </h1>
            <p className="text-muted-foreground mt-1">
              Follow these steps to start earning. Watch each tutorial and take action!
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</div>
            <p className="text-xs text-muted-foreground">{completedSteps}/{videoTutorials.length} done</p>
          </div>
        </div>

        {/* Main progress bar */}
        <div className="relative">
          <Progress value={progressPercentage} className="h-3" />
          {progressPercentage === 100 && (
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle className="w-4 h-4" />
              All tutorials completed! You're all set.
            </div>
          )}
        </div>

        {/* Step-by-step cards - vertical timeline */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const complete = isStepComplete(index);
            const isActive = index === firstIncompleteStep;
            const tutorials = stepTutorialMap[index] || [];
            const watchedInStep = tutorials.filter(t => isTutorialWatched(t.id)).length;
            const isExpanded = activeStep === index;

            return (
              <Card
                key={step.id}
                className={cn(
                  "transition-all overflow-hidden",
                  isActive && "ring-2 ring-primary shadow-lg",
                  complete && "border-primary/30 bg-primary/5",
                  !complete && !isActive && "opacity-75"
                )}
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setActiveStep(isExpanded ? -1 : index)}
                >
                  {/* Step number / status */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold",
                    complete ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {complete ? <CheckCircle className="w-6 h-6" /> : step.num}
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "font-semibold text-base",
                        complete && "text-primary"
                      )}>
                        {step.label}
                      </h3>
                      {isActive && !complete && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0 animate-pulse">
                          DO THIS NEXT
                        </Badge>
                      )}
                      {complete && (
                        <Badge variant="outline" className="text-primary border-primary text-[10px] px-2 py-0">
                          DONE
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                    {tutorials.length > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={tutorials.length > 0 ? (watchedInStep / tutorials.length) * 100 : 0} className="h-1.5 flex-1 max-w-[120px]" />
                        <span className="text-xs text-muted-foreground">{watchedInStep}/{tutorials.length} watched</span>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!complete && (
                      <Button
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="gap-1 hidden sm:flex"
                        disabled={tutorials.length > 0 && watchedInStep < tutorials.length}
                        onClick={(e) => { e.stopPropagation(); navigate(step.route); }}
                      >
                        {tutorials.length > 0 && watchedInStep < tutorials.length ? (
                          <><Lock className="w-3 h-3" /> Watch First</>
                        ) : (
                          <>Go <ArrowRight className="w-3 h-3" /></>
                        )}
                      </Button>
                    )}
                    <ChevronRight className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Always show tutorials for the active (next incomplete) step */}
                {(isExpanded || isActive) && tutorials.length > 0 && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {tutorials.map((tutorial) => {
                        const thumbnail = isYouTubeUrl(tutorial.videoUrl) ? getYouTubeThumbnail(tutorial.videoUrl) : null;
                        const isDirectVideo = isDirectVideoUrl(tutorial.videoUrl);
                        const isWatched = isTutorialWatched(tutorial.id);
                        return (
                          <div
                            key={tutorial.id}
                            className={cn(
                              "group border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md",
                              isWatched ? "border-primary/40 bg-primary/5" : "bg-background hover:border-primary/50"
                            )}
                            onClick={() => handlePlayVideo(tutorial)}
                          >
                            <div className="relative aspect-video bg-muted">
                              {thumbnail ? (
                                <img src={thumbnail} loading="lazy" alt={tutorial.title} className="w-full h-full object-cover" />
                              ) : isDirectVideo ? (
                                <video src={tutorial.videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Video className="w-10 h-10 text-muted-foreground opacity-50" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
                                  <PlayCircle className="w-8 h-8 text-primary" />
                                </div>
                              </div>
                              {isWatched && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex items-center gap-2">
                              {isWatched ? (
                                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="font-medium text-sm line-clamp-1">{tutorial.title}</span>
                              {!isWatched && (
                                <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">Watch</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      className="mt-3 w-full gap-2"
                      variant={complete ? "outline" : "default"}
                      disabled={!complete && tutorials.length > 0 && watchedInStep < tutorials.length}
                      onClick={() => navigate(step.route)}
                    >
                      <Icon className="w-4 h-4" />
                      {!complete && tutorials.length > 0 && watchedInStep < tutorials.length ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Watch all videos to unlock
                        </>
                      ) : (
                        <>
                          Go to {step.label}
                          <ArrowRight className="w-4 h-4 ml-auto" />
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Show "Go" button for steps without tutorials */}
                {isExpanded && tutorials.length === 0 && (
                  <div className="border-t bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground mb-3">No tutorial video yet for this step. Navigate to the section to get started.</p>
                    <Button
                      className="w-full gap-2"
                      onClick={() => navigate(step.route)}
                    >
                      <Icon className="w-4 h-4" />
                      Go to {step.label}
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Video Player Dialog */}
        {selectedVideo && (
          <Dialog open={!!selectedVideo} onOpenChange={() => { setSelectedVideo(null); setVideoLoadErrorUrl(null); }}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg">{selectedVideo.title}</DialogTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedVideo(null); setVideoLoadErrorUrl(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="px-4 pb-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {isYouTubeUrl(selectedVideo.videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(selectedVideo.videoUrl) || ''}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedVideo.title}
                    />
                  ) : isDirectVideoUrl(selectedVideo.videoUrl) ? (
                    videoLoadErrorUrl === selectedVideo.videoUrl ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Video className="w-12 h-12 opacity-50" />
                        <p className="text-sm">Video could not be loaded in the browser.</p>
                        <Button variant="outline" size="sm" onClick={() => window.open(selectedVideo.videoUrl, '_blank')}>
                          Open video in new tab
                        </Button>
                      </div>
                    ) : (
                      <video
                        src={selectedVideo.videoUrl}
                        className="absolute inset-0 w-full h-full"
                        controls
                        autoPlay
                        playsInline
                        onError={() => setVideoLoadErrorUrl(selectedVideo.videoUrl)}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <p>Unsupported video format</p>
                    </div>
                  )}
                </div>
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground mt-3">{selectedVideo.description}</p>
                )}
                {!isTutorialWatched(selectedVideo.id) ? (
                  <Button className="mt-3 gap-2" onClick={() => markAsWatched(selectedVideo.id)}>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Watched
                  </Button>
                ) : (
                  <Badge variant="default" className="mt-3 bg-primary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserTutorials;
