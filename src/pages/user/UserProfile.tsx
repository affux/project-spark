import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserProfileCard } from '@/components/user/UserProfileCard';
import { MFASettings } from '@/components/mfa/MFASettings';
import { UserEmail2FASettings } from '@/components/user/UserEmail2FASettings';
import { LoginActivityLog } from '@/components/user/LoginActivityLog';
import { ThemeSelectorCard } from '@/components/ThemeSelector';
import { LanguageSelectorCard } from '@/components/LanguageSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Palette, Globe, Video, CheckCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate, Link } from 'react-router-dom';
import { useVideoTutorialProgress } from '@/hooks/useVideoTutorialProgress';
import { usePlatformSettings, VideoTutorial } from '@/hooks/usePlatformSettings';

const UserProfile: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const { watchedCount, getProgress, isTutorialWatched } = useVideoTutorialProgress();
  const { settingsMap } = usePlatformSettings();
  const videoTutorials: VideoTutorial[] = settingsMap.video_tutorials || [];
  
  const totalTutorials = videoTutorials.length;
  const progressPercent = getProgress(totalTutorials);
  const allCompleted = totalTutorials > 0 && watchedCount >= totalTutorials;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('profile.description')}
          </p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <UserProfileCard />
            
            {/* Theme Selector Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  {t('profile.appearance')}
                </CardTitle>
                <CardDescription>
                  {t('profile.appearance_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSelectorCard />
              </CardContent>
            </Card>
            
            {/* Language Selector Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t('profile.language')}
                </CardTitle>
                <CardDescription>
                  {t('profile.language_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSelectorCard />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {/* Tutorial Progress Card */}
            {totalTutorials > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Tutorial Progress
                  </CardTitle>
                  <CardDescription>
                    Track your learning progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {watchedCount} of {totalTutorials} tutorials completed
                    </span>
                    {allCompleted ? (
                      <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        All Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {progressPercent}%
                      </Badge>
                    )}
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  
                  {/* Tutorial list */}
                  <div className="space-y-2 pt-2">
                    {videoTutorials.map((tutorial) => {
                      const isWatched = isTutorialWatched(tutorial.id);
                      return (
                        <div 
                          key={tutorial.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {isWatched ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm ${isWatched ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {tutorial.title}
                            </span>
                          </div>
                          {isWatched && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              Completed
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <Link 
                    to="/help" 
                    className="block text-center text-sm text-primary hover:underline pt-2"
                  >
                    View all tutorials →
                  </Link>
                </CardContent>
              </Card>
            )}

            <UserEmail2FASettings />
            <MFASettings />
            <LoginActivityLog />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;