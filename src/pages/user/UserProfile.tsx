import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserProfileCard } from '@/components/user/UserProfileCard';
import { MFASettings } from '@/components/mfa/MFASettings';
import { UserEmail2FASettings } from '@/components/user/UserEmail2FASettings';
import { LoginActivityLog } from '@/components/user/LoginActivityLog';
import { ThemeSelectorCard } from '@/components/ThemeSelector';
import { LanguageSelectorCard } from '@/components/LanguageSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

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