import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const SecurityStatusCard: React.FC = () => {
  const { user } = useAuth();
  const [email2FAEnabled, setEmail2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSecurityStatus = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email_2fa_enabled')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setEmail2FAEnabled(data.email_2fa_enabled ?? false);
        }
      } catch (error) {
        console.error('Error loading security status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityStatus();
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isSecure = email2FAEnabled;

  return (
    <Card className={`border ${isSecure ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isSecure ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
            {isSecure ? (
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground">Account Security</span>
              <Badge 
                variant={isSecure ? 'default' : 'secondary'}
                className={`text-xs ${isSecure ? 'bg-green-600' : 'bg-amber-600'}`}
              >
                {isSecure ? 'Protected' : 'At Risk'}
              </Badge>
            </div>
            <p className={`text-xs ${isSecure ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {isSecure 
                ? 'Two-factor authentication is enabled' 
                : 'Enable 2FA to secure your account'}
            </p>
          </div>
        </div>
        
        {!isSecure && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10" 
            asChild
          >
            <Link to="/dashboard/profile">
              <Shield className="w-4 h-4 mr-2" />
              Enable 2FA
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
        )}
        
        {isSecure && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3 text-green-700 dark:text-green-300 hover:bg-green-500/10" 
            asChild
          >
            <Link to="/dashboard/profile">
              Manage Security Settings
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};