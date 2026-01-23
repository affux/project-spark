import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, PlayCircle, Bot, MessageCircle, ExternalLink, Video, X, CheckCircle, Circle } from 'lucide-react';
import { usePlatformSettings, VideoTutorial } from '@/hooks/usePlatformSettings';
import { useVideoTutorialProgress } from '@/hooks/useVideoTutorialProgress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TutorialAchievements } from '@/components/user/TutorialAchievements';

const UserHelp: React.FC = () => {
  const { settingsMap, isLoading } = usePlatformSettings();
  const { isTutorialWatched, markAsWatched, watchedCount, getProgress } = useVideoTutorialProgress();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const faqItems = settingsMap.faq_items || [];
  const videoTutorials = settingsMap.video_tutorials || [];

  // If a dedicated “Getting Started” video isn’t set, fallback to the first tutorial.
  const videoUrl = settingsMap.user_dashboard_video_url || videoTutorials[0]?.videoUrl;

  const progressPercentage = getProgress(videoTutorials.length);

  // Group tutorials by topic
  const tutorialsByTopic = useMemo(() => {
    const grouped: Record<string, VideoTutorial[]> = {};
    videoTutorials.forEach(tutorial => {
      const topic = tutorial.topic || 'General';
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(tutorial);
    });
    // Sort by sortOrder within each topic
    Object.keys(grouped).forEach(topic => {
      grouped[topic].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return grouped;
  }, [videoTutorials]);

  const topics = Object.keys(tutorialsByTopic).sort();

  // Extract YouTube video ID for embedding
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;

    // Handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    // Always prefer the privacy-enhanced domain to avoid embed blocking in some environments.
    const base = 'https://www.youtube-nocookie.com/embed';

    if (match && match[2].length === 11) {
      return `${base}/${match[2]}?autoplay=1&rel=0&modestbranding=1`;
    }

    // If it's already an embed URL, normalize to youtube-nocookie when possible.
    if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
      return url
        .replace('https://www.youtube.com/embed/', `${base}/`)
        .replace('https://www.youtube-nocookie.com/embed/', `${base}/`);
    }

    // Otherwise return as-is (may be a direct video link or other provider)
    return url;
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

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  const handlePlayVideo = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            Help & FAQ
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to use the platform and find answers to common questions.
          </p>
        </div>

        {/* Getting Started Video */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Watch our tutorial to learn how to use the platform effectively.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="aspect-video w-full rounded-lg" />
            ) : videoUrl && embedUrl ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {isVideoPlaying ? (
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Getting Started Tutorial"
                  />
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
                <p className="text-xs mt-1">Contact support if you need help getting started</p>
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
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : topics.length === 1 ? (
                // Single topic - show grid directly
                <div className="grid sm:grid-cols-2 gap-4">
                  {tutorialsByTopic[topics[0]].map(tutorial => {
                    const thumbnail = getYouTubeThumbnail(tutorial.videoUrl);
                    const isWatched = isTutorialWatched(tutorial.id);
                    return (
                      <div
                        key={tutorial.id}
                        className={`group border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${isWatched ? 'border-green-500/50 bg-green-500/5' : ''}`}
                        onClick={() => handlePlayVideo(tutorial)}
                      >
                        <div className="relative aspect-video bg-muted">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              loading="lazy"
                              alt={tutorial.title}
                              className="w-full h-full object-cover"
                            />
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
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">
                              {tutorial.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Multiple topics - use tabs
                <Tabs defaultValue={topics[0]} className="w-full">
                  <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                    {topics.map(topic => (
                      <TabsTrigger key={topic} value={topic} className="text-sm">
                        {topic}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {topics.map(topic => (
                    <TabsContent key={topic} value={topic} className="mt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {tutorialsByTopic[topic].map(tutorial => {
                          const thumbnail = getYouTubeThumbnail(tutorial.videoUrl);
                          const isWatched = isTutorialWatched(tutorial.id);
                          return (
                            <div
                              key={tutorial.id}
                              className={`group border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${isWatched ? 'border-green-500/50 bg-green-500/5' : ''}`}
                              onClick={() => handlePlayVideo(tutorial)}
                            >
                              <div className="relative aspect-video bg-muted">
                                {thumbnail ? (
                                  <img
                                    src={thumbnail}
                                    loading="lazy"
                                    alt={tutorial.title}
                                    className="w-full h-full object-cover"
                                  />
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
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">
                                    {tutorial.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Chat Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Talk to our support team directly. Click the chat icon in the bottom right corner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant answers from our AI. Look for the AI button in the bottom right corner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Find answers to the most common questions about our platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : faqItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No FAQs available yet</p>
                <p className="text-sm mt-1">Check back soon or contact support for help</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={item.id || index}
                    value={item.id || `faq-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4 text-left">
                      <span className="font-medium">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Additional Help */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Still need help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you couldn't find the answer you were looking for, our support team is here to help.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the chat widget to message our team directly</li>
                  <li>• Ask our AI assistant for instant answers</li>
                  <li>• Submit a support ticket for complex issues</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="pr-8">{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {selectedVideo && (
              <iframe
                src={getYouTubeEmbedUrl(selectedVideo.videoUrl) || ''}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={selectedVideo.title}
              />
            )}
          </div>
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              {selectedVideo?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedVideo.description}
                </p>
              )}
            </div>
            {selectedVideo && (
              <Button
                variant={isTutorialWatched(selectedVideo.id) ? "secondary" : "default"}
                size="sm"
                onClick={() => {
                  markAsWatched(selectedVideo.id);
                }}
                disabled={isTutorialWatched(selectedVideo.id)}
                className="shrink-0"
              >
                {isTutorialWatched(selectedVideo.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 mr-2" />
                    Mark as Watched
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserHelp;