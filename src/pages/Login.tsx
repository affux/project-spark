import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowRight, Loader2, Shield, Mail, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useEmailMFA } from '@/hooks/useEmailMFA';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { z } from 'zod';
import { useLoginRateLimit } from '@/hooks/useLoginRateLimit';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Email validation schema
const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' });

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMFAStep, setShowMFAStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendEmailCode, verifyEmailCode, isSendingCode, isVerifyingCode } = useEmailMFA();
  const { checkRateLimit, recordAttempt, isChecking, rateLimitInfo, formatRetryTime, clearRateLimitInfo } = useLoginRateLimit();

  // Real-time email validation
  const emailValidation = useMemo(() => {
    if (!email || !emailTouched) return { isValid: false, error: null };
    try {
      emailSchema.parse(email);
      return { isValid: true, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.errors[0]?.message || 'Invalid email' };
      }
      return { isValid: false, error: 'Invalid email' };
    }
  }, [email, emailTouched]);

  // Fetch MFA setting on mount (public query)
  useEffect(() => {
    const fetchMFASetting = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'mfa_enabled')
        .maybeSingle();
      
      setIsMFAEnabled(data?.value === 'true');
    };
    fetchMFASetting();
  }, []);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setEmailError(null);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0]?.message || 'Invalid email');
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail()) {
      toast({
        title: 'Invalid Email',
        description: emailError || 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Error',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    // Check rate limit before attempting login
    const rateLimitResult = await checkRateLimit(email);
    if (rateLimitResult.blocked) {
      toast({
        title: 'Too Many Attempts',
        description: rateLimitResult.reason || `Please try again in ${formatRetryTime(rateLimitResult.retry_after_seconds)}`,
        variant: 'destructive',
      });
      return;
    }

    const result = await login(email, password, rememberMe);
    
    if (result.success && result.userId) {
      // Record successful login attempt
      await recordAttempt(email, true);
      clearRateLimitInfo();

      // Check if user has email 2FA enabled (user-specific preference)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email_2fa_enabled')
        .eq('user_id', result.userId)
        .single();

      const userHas2FAEnabled = profileData?.email_2fa_enabled === true;
      
      // Check both global MFA setting OR user's personal preference
      if (isMFAEnabled || userHas2FAEnabled) {
        setPendingUserId(result.userId);
        // Send MFA code to email
        const mfaResult = await sendEmailCode(result.userId, email);
        if (mfaResult.success) {
          setShowMFAStep(true);
        } else {
          // If MFA fails to send, still allow login (fallback)
          proceedToLogin();
        }
      } else {
        proceedToLogin();
      }
    } else {
      // Record failed login attempt
      await recordAttempt(email, false);

      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid credentials',
        variant: 'destructive',
      });
    }
  };

  const proceedToLogin = () => {
    toast({
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
    });
    // Redirect based on role
    const user = email.includes('admin') ? '/admin' : '/dashboard';
    navigate(user);
  };

  const handleVerifyMFA = async () => {
    if (!pendingUserId || mfaCode.length !== 6) return;

    const result = await verifyEmailCode(pendingUserId, mfaCode);
    
    if (result.success) {
      proceedToLogin();
    } else {
      toast({
        title: 'Verification Failed',
        description: result.error || 'Invalid verification code',
        variant: 'destructive',
      });
      setMfaCode('');
    }
  };

  const handleResendCode = async () => {
    if (!pendingUserId) return;
    await sendEmailCode(pendingUserId, email);
  };

  // MFA Verification Step
  if (showMFAStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Two-Factor Authentication</h2>
            <p className="mt-2 text-muted-foreground">
              We've sent a 6-digit verification code to
            </p>
            <p className="font-medium text-foreground flex items-center justify-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {email}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                value={mfaCode}
                onChange={(value) => setMfaCode(value)}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleVerifyMFA}
              className="w-full h-12 text-base gap-2"
              disabled={mfaCode.length !== 6 || isVerifyingCode}
            >
              {isVerifyingCode ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={isSendingCode}
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowMFAStep(false);
                setMfaCode('');
                setPendingUserId(null);
              }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-2xl mb-6">
              <span className="text-accent-foreground font-bold text-2xl">D</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">
              DropShip
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              The modern dropshipping platform.<br />
              Empower your dropshippers. Grow together.
            </p>
          </div>

          <div className="space-y-6 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-lg">✦</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Private Main Store</h3>
                <p className="text-primary-foreground/70 text-sm">Centralized inventory, accessible only to you and your dropshippers.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-lg">◈</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Dropshipper Storefronts</h3>
                <p className="text-primary-foreground/70 text-sm">Each dropshipper gets their own branded storefront with custom pricing.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-lg">◆</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure Payment Flow</h3>
                <p className="text-primary-foreground/70 text-sm">Orders fulfilled only after dropshipper payment confirmation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">A</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to access your dashboard
            </p>
            {isMFAEnabled && (
              <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                <Shield className="w-3 h-3" />
                <span>Protected by Two-Factor Authentication</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  className={`h-12 pr-10 ${
                    emailTouched && email
                      ? emailValidation.isValid
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                  autoComplete="email"
                />
                {emailTouched && email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValidation.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {emailTouched && emailValidation.error && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {emailValidation.error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label 
                  htmlFor="remember-me" 
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Rate limit warning */}
            {rateLimitInfo && rateLimitInfo.blocked && (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {rateLimitInfo.reason || `Too many failed attempts. Please try again in ${formatRetryTime(rateLimitInfo.retry_after_seconds)}.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Show remaining attempts warning when low */}
            {rateLimitInfo && !rateLimitInfo.blocked && rateLimitInfo.remaining_attempts <= 2 && rateLimitInfo.remaining_attempts > 0 && (
              <Alert variant="default" className="border-amber-500 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-600">
                  {rateLimitInfo.remaining_attempts === 1 
                    ? 'Warning: 1 attempt remaining before temporary lockout.'
                    : `Warning: ${rateLimitInfo.remaining_attempts} attempts remaining.`}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base gap-2"
              disabled={isLoading || isSendingCode || isChecking || (rateLimitInfo?.blocked ?? false)}
            >
              {isLoading || isSendingCode || isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isChecking ? 'Checking...' : isSendingCode ? 'Sending code...' : 'Signing in...'}
                </>
              ) : rateLimitInfo?.blocked ? (
                <>
                  <Clock className="w-5 h-5" />
                  Try again in {formatRetryTime(rateLimitInfo.retry_after_seconds)}
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Demo Credentials</span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-1">Admin Access</p>
              <p className="text-xs text-muted-foreground">admin@dropship.com / password123</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-1">Dropshipper Access</p>
              <p className="text-xs text-muted-foreground">john@reseller.com / password123</p>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Login;
