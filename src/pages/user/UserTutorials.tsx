import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, Video, CheckCircle, Circle, X, Shield, Store, Briefcase, ShoppingCart, Wallet } from 'lucide-react';
import { VideoTutorial } from '@/hooks/usePlatformSettings';
import { useVideoTutorialProgress } from '@/hooks/useVideoTutorialProgress';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TutorialAchievements } from '@/components/user/TutorialAchievements';
import { cn } from '@/lib/utils';

const quickNavSteps = [
  { label: 'COMPLETE YOUR KYC', icon: Shield, route: '/dashboard/kyc' },
  { label: 'CREATE YOUR STORE FRONT', icon: Store, route: '/dashboard/storefront' },
  { label: 'COMPLETE YOUR WORK SPACE', icon: Briefcase, route: '/dashboard/workspace' },
  { label: 'HOW TO COMPLETE THE ORDER', icon: ShoppingCart, route: '/dashboard/orders' },
  { label: 'HOW TO RISE PAYOUT REQUEST', icon: Wallet, route: '/dashboard/payments' },
];

const UserTutorials: React.FC = () => {
  const navigate = useNavigate();
  const { settings: publicSettings, isLoading } = usePublicSettings();
  const { isTutorialWatched, markAsWatched, watchedCount, getProgress } = useVideoTutorialProgress();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [videoLoadErrorUrl, setVideoLoadErrorUrl] = useState<string | null>(null);

  const videoTutorials = publicSettings.video_tutorials || [];
  const videoUrl = publicSettings.user_dashboard_video_url || videoTutorials[0]?.videoUrl;
  const progressPercentage = getProgress(videoTutorials.length);

  const tutorialsByTopic = useMemo(() => {
    const grouped: Record<string, VideoTutorial[]> = {};
    videoTutorials.forEach(tutorial => {
      const topic = tutorial.topic || 'General';
      if (!grouped[topic]) grouped[topic] = [];
      grouped[topic].push(tutorial);
    });
    Object.keys(grouped).forEach(topic => {
      grouped[topic].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return grouped;
  }, [videoTutorials]);

  const topics = Object.keys(tutorialsByTopic).sort();

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

  const embedUrl = isYouTubeUrl(videoUrl || '') ? getYouTubeEmbedUrl(videoUrl || '') : null;
  const isGettingStartedDirectVideo = isDirectVideoUrl(videoUrl || '');

  const handlePlayVideo = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
  };

  const renderTutorialCard = (tutorial: VideoTutorial) => {
    const thumbnail = isYouTubeUrl(tutorial.videoUrl) ? getYouTubeThumbnail(tutorial.videoUrl) : null;
    const isDirectVideo = isDirectVideoUrl(tutorial.videoUrl);
    const isWatched = isTutorialWatched(tutorial.id);
    return (
      <div
        key={tutorial.id}
        className={`group border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${isWatched ? 'border-green-500/50 bg-green-500/5' : ''}`}
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
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          {isWatched && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            {isWatched ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <h4 className="font-medium text-sm line-clamp-1">{tutorial.title}</h4>
          </div>
          {tutorial.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">{tutorial.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            Tutorials
          </h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step video guides to help you use the platform effectively.
          </p>
        </div>

        {/* Quick Navigation Steps */}
        <div className="bg-muted/50 rounded-xl p-3">
          <div className="flex flex-wrap justify-center gap-2">
            {quickNavSteps.map((step, index) => (
              <button
                key={step.label}
                onClick={() => navigate(step.route)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all",
                  "bg-background hover:bg-primary hover:text-primary-foreground",
                  "border border-border hover:border-primary",
                  "shadow-sm hover:shadow-md"
                )}
              >
                <span>{index + 1}.</span>
                {step.label}
              </button>
            ))}
          </div>
        </div>

        {/* Getting Started Video */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>Watch our tutorial to learn how to use the platform effectively.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="aspect-video w-full rounded-lg" />
            ) : videoUrl && (embedUrl || isGettingStartedDirectVideo) ? (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {isVideoPlaying ? (
                  isGettingStartedDirectVideo ? (
                    <video src={videoUrl} className="absolute inset-0 w-full h-full" controls autoPlay playsInline />
                  ) : (
                    <iframe
                      src={embedUrl || ''}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Getting Started Tutorial"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <PlayCircle className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Platform Tutorial</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md px-4">
                      Learn how to set up your storefront, add products, and start earning commissions.
                    </p>
                    <Button onClick={() => setIsVideoPlaying(true)} className="gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Watch Tutorial
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                <PlayCircle className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-sm">Tutorial video coming soon</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements Section */}
        {videoTutorials.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <TutorialAchievements
                videoTutorials={videoTutorials}
                isTutorialWatched={isTutorialWatched}
                watchedCount={watchedCount}
              />
            </CardContent>
          </Card>
        )}

        {/* Video Tutorials by Topic */}
        {videoTutorials.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Video Tutorials
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Step-by-step video guides organized by topic to help you use the platform.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant={progressPercentage === 100 ? "default" : "secondary"} className="mb-1">
                    {watchedCount}/{videoTutorials.length} completed
                  </Badge>
                  <Progress value={progressPercentage} className="w-24 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : topics.length === 1 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {tutorialsByTopic[topics[0]].map(renderTutorialCard)}
                </div>
              ) : (
                <Tabs defaultValue={topics[0]} className="w-full">
                  <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                    {topics.map(topic => (
                      <TabsTrigger key={topic} value={topic} className="text-sm">{topic}</TabsTrigger>
                    ))}
                  </TabsList>
                  {topics.map(topic => (
                    <TabsContent key={topic} value={topic} className="mt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {tutorialsByTopic[topic].map(renderTutorialCard)}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

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
                {!isTutorialWatched(selectedVideo.id) && (
                  <Button className="mt-3 gap-2" onClick={() => { markAsWatched(selectedVideo.id); }}>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Watched
                  </Button>
                )}
                {isTutorialWatched(selectedVideo.id) && (
                  <Badge variant="default" className="mt-3 bg-green-500">
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
