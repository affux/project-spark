import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TradingStatCard } from '@/components/dashboard/TradingStatCard';
import { TradingChart } from '@/components/dashboard/TradingChart';
import { LiveDataCard } from '@/components/dashboard/LiveDataCard';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import { KYCStatusBanner } from '@/components/kyc/KYCStatusBanner';
import { AdminManagedLeaderboard } from '@/components/user/AdminManagedLeaderboard';
import { SecurityStatusCard } from '@/components/user/SecurityStatusCard';
import DashboardMessageBanner from '@/components/dashboard/DashboardMessageBanner';
import { PostpaidDueReminder } from '@/components/user/PostpaidDueReminder';
import { PostpaidSidePanel } from '@/components/user/PostpaidSidePanel';
import { TutorialAchievements } from '@/components/user/TutorialAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS, VideoTutorial } from '@/hooks/usePlatformSettings';
import { useVideoTutorialProgress } from '@/hooks/useVideoTutorialProgress';
import { useLevelMilestone } from '@/hooks/useLevelMilestone';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOrderRealtimeUser, useProfileRealtimeUser, useWalletRealtimeUser } from '@/hooks/useRealtimeSubscription';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Wallet,
  TrendingUp,
  Loader2,
  Play,
  ExternalLink,
  Activity,
  ArrowUpRight,
  Store,
  Video,
  PlayCircle,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { orders, recentOrders, stats, profile, isLoading, refetchOrders } = useUserDashboard();
  const { settingsMap } = usePlatformSettings();
  const { isTutorialWatched, markAsWatched, watchedCount, getProgress } = useVideoTutorialProgress();
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isPostpaidPanelOpen, setIsPostpaidPanelOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  
  // Hook for milestone notifications (runs in background)
  useLevelMilestone();
  
  // Enable push notifications for order status changes
  usePushNotifications(user?.id);
  
  // Enable real-time updates
  useOrderRealtimeUser(user?.id);
  useProfileRealtimeUser(user?.id);
  useWalletRealtimeUser(user?.id);
  
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  const tutorialVideoUrl = settingsMap.user_dashboard_video_url;
  const videoTutorials = settingsMap.video_tutorials || [];
  const progressPercentage = getProgress(videoTutorials.length);

  // Get YouTube thumbnail
  const getYouTubeThumbnail = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
    }
    return null;
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
    }
    return url;
  };

  // Helper to render video (supports YouTube, Vimeo, direct video)
  const renderVideo = (url: string) => {
    if (!url) return null;

    // YouTube embed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Vimeo embed
    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full aspect-video rounded-xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Direct video file
    return (
      <video
        src={url}
        controls
        className="w-full aspect-video rounded-xl"
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  const handlePayOrder = async (order: typeof recentOrders[0]) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'paid_by_user',
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Payment Successful',
        description: `Payment of ${currencySymbol}${(order.base_price * order.quantity).toFixed(2)} confirmed for order ${order.order_number}`,
      });
      
      refetchOrders();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not process payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  // Generate sparkline data from recent orders
  const generateSparkline = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.toDateString() === date.toDateString();
      }).reduce((sum, o) => sum + o.selling_price * o.quantity, 0);
    });
    return last7Days;
  };

  const revenueSparkline = generateSparkline();

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <Badge variant="outline" className="gap-1">
                  <Activity className="h-3 w-3 text-green-500" />
                  Live
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/products">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Products
                </Link>
              </Button>
              {user.storefrontSlug && (
                <Button size="sm" asChild>
                  <Link to={`/store/${user.storefrontSlug}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    My Store
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Admin Announcement Banner */}
          <DashboardMessageBanner className="max-w-4xl mx-auto" />

          {/* Postpaid Due Reminder */}
          <PostpaidDueReminder onOpenPostpaidPanel={() => setIsPostpaidPanelOpen(true)} />

          {/* KYC Status Banner */}
          <KYCStatusBanner compact />

          {/* Wallet & Store Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Wallet Card - Enhanced with Trading theme orange glow */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 trading-glow wallet-glow-pulse relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              {/* Subtle animated glow overlay for Trading theme */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 trading:opacity-100 animate-pulse pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Wallet Balance</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {currencySymbol}{user.walletBalance.toFixed(2)}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/payments">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Add Funds
                  </Link>
                </Button>
              </div>
            </div>

            {/* Store Card */}
            <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {user.storefrontName || 'My Storefront'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user.storefrontSlug 
                      ? <span className="font-mono text-foreground">/store/{user.storefrontSlug}</span>
                      : 'Set up your storefront to start selling'}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/storefront">
                    Manage
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid - Trading Style */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <TradingStatCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={ShoppingCart}
              delay={0}
            />
            <TradingStatCard
              title="Pending"
              value={stats.pendingOrders}
              icon={Clock}
              variant="warning"
              delay={50}
            />
            <TradingStatCard
              title="Completed"
              value={stats.completedOrders}
              icon={CheckCircle}
              variant="success"
              delay={100}
            />
            <TradingStatCard
              title="Total Profit"
              value={`${currencySymbol}${stats.totalRevenue.toFixed(0)}`}
              icon={TrendingUp}
              variant="accent"
              sparkline={revenueSparkline}
              delay={150}
            />
            <TradingStatCard
              title="Payable"
              value={`${currencySymbol}${stats.pendingPayments.toFixed(0)}`}
              icon={DollarSign}
              variant="warning"
              delay={200}
            />
            <TradingStatCard
              title="Paid"
              value={`${currencySymbol}${stats.paidAmount.toFixed(0)}`}
              icon={Wallet}
              variant="success"
              delay={250}
            />
          </div>

          {/* Main Chart */}
          <TradingChart 
            orders={orders.map(o => ({
              id: o.id,
              selling_price: o.selling_price,
              base_price: o.base_price,
              quantity: o.quantity,
              created_at: o.created_at,
              status: o.status
            }))} 
            currencySymbol={currencySymbol} 
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="xl:col-span-2">
              <LiveDataCard title="Recent Orders">
                <OrdersTableNew 
                  orders={recentOrders} 
                  userRole="user"
                  onViewOrder={(order) => console.log('View order:', order.id)}
                  onPayOrder={handlePayOrder}
                />
                <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                  <Link to="/dashboard/orders">View all orders →</Link>
                </Button>
              </LiveDataCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <LiveDataCard title="Quick Actions" isLive={false}>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard/storefront">
                      <Store className="h-4 w-4 mr-2" />
                      Manage Storefront
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard/products">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add Products
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link to="/dashboard/payments">
                      <Wallet className="h-4 w-4 mr-2" />
                      Add Funds
                    </Link>
                  </Button>
                </div>
              </LiveDataCard>

              {/* Security Status */}
              <SecurityStatusCard />

              {/* Admin-Managed Leaderboard */}
              <AdminManagedLeaderboard />

              {/* Tutorial Video Card */}
              {tutorialVideoUrl && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">Getting Started</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Watch our tutorial to learn how to use the platform.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowVideoDialog(true)}>
                    <Play className="h-3 w-3 mr-2" />
                    Watch Tutorial
                  </Button>
                </div>
              )}

              {/* Pending Payments Alert */}
              {stats.pendingPayments > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold text-amber-700 dark:text-amber-300 text-sm">Pending Payments</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                    {currencySymbol}{stats.pendingPayments.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    Pay now to fulfill orders
                  </p>
                  <Button variant="outline" size="sm" className="w-full border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10" asChild>
                    <Link to="/dashboard/orders">View Pending Orders</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tutorial Achievements */}
          {videoTutorials.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="h-5 w-5 text-primary" />
                    Video Tutorials
                  </CardTitle>
                  <TutorialAchievements
                    videoTutorials={videoTutorials}
                    isTutorialWatched={isTutorialWatched}
                    watchedCount={watchedCount}
                    compact
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videoTutorials.slice(0, 8).map((tutorial) => {
                    const thumbnail = getYouTubeThumbnail(tutorial.videoUrl);
                    const isWatched = isTutorialWatched(tutorial.id);
                    return (
                      <div
                        key={tutorial.id}
                        className={`group border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${isWatched ? 'border-green-500/50 bg-green-500/5' : ''}`}
                        onClick={() => setSelectedVideo(tutorial)}
                      >
                        <div className="relative aspect-video bg-muted">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={tutorial.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <PlayCircle className="w-6 h-6 text-primary" />
                            </div>
                          </div>
                          {isWatched ? (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5">
                              {tutorial.topic}
                            </Badge>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="flex items-center gap-1">
                            {isWatched ? (
                              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            <h4 className="font-medium text-xs line-clamp-1">{tutorial.title}</h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {videoTutorials.length > 8 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                    <Link to="/dashboard/help">View all tutorials →</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Getting Started Tutorial</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {tutorialVideoUrl && renderVideo(tutorialVideoUrl)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Tutorial Player Dialog */}
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

      {/* Postpaid Side Panel */}
      <PostpaidSidePanel 
        open={isPostpaidPanelOpen} 
        onOpenChange={setIsPostpaidPanelOpen} 
      />
    </>
  );
};

export default UserDashboard;
