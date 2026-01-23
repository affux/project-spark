import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ShieldCheck, Loader2, Save, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const UserEmail2FASettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email2FAEnabled, setEmail2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValue, setOriginalValue] = useState(false);

  // Load user's 2FA preference
  useEffect(() => {
    const loadUserPreference = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email_2fa_enabled')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        const enabled = data?.email_2fa_enabled ?? false;
        setEmail2FAEnabled(enabled);
        setOriginalValue(enabled);
      } catch (error) {
        console.error('Error loading 2FA preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreference();
  }, [user?.id]);

  const handleToggle = (checked: boolean) => {
    setEmail2FAEnabled(checked);
    setHasChanges(checked !== originalValue);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_2fa_enabled: email2FAEnabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setOriginalValue(email2FAEnabled);
      setHasChanges(false);

      toast({
        title: 'Settings Saved',
        description: `Email 2FA has been ${email2FAEnabled ? 'enabled' : 'disabled'} for your account.`,
      });
    } catch (error) {
      console.error('Error saving 2FA preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to save 2FA settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${email2FAEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Email Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your login
            </CardDescription>
          </div>
          <Badge variant={email2FAEnabled ? 'default' : 'secondary'}>
            {email2FAEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1 flex-1 pr-4">
            <Label htmlFor="user-email-2fa-toggle" className="font-medium cursor-pointer">
              Enable Email 2FA for Login
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, you'll receive a 6-digit verification code via email each time you log in.
            </p>
          </div>
          <Switch
            id="user-email-2fa-toggle"
            checked={email2FAEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {email2FAEnabled && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your account will be protected with email verification. A 6-digit code will be sent to <strong>{user?.email}</strong> on each login.
            </AlertDescription>
          </Alert>
        )}

        {!email2FAEnabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              We recommend enabling two-factor authentication to protect your account from unauthorized access.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};