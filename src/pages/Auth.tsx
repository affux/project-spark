import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Check, Eye, EyeOff, Loader2, LogIn, MailCheck, UserPlus, X, Shield, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useTrustedDevice } from '@/hooks/useTrustedDevice';
import { useEmailMFA } from '@/hooks/useEmailMFA';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Strong password requirements
const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be less than 128 characters' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(100, { message: 'Name must be less than 100 characters' }),
    email: z.string().trim().email({ message: 'Invalid email address' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  if (score < 40) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score < 60) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
};

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[^a-zA-Z0-9]/, label: 'One special character' },
];

const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  
  // MFA state
  const [showMFAInput, setShowMFAInput] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email'>('totp');
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkTrustedDevice, trustDevice } = useTrustedDevice();
  const { sendEmailCode, verifyEmailCode, isSendingCode, isVerifyingCode, codeSent, resetState: resetEmailMFAState } = useEmailMFA();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const isEmailNotConfirmed = useMemo(() => {
    return !!lastAuthError && lastAuthError.toLowerCase().includes('email not confirmed');
  }, [lastAuthError]);

  const validateForm = () => {
    setErrors({});

    try {
      if (isSignUp) {
        signupSchema.parse({ name, email, password, confirmPassword });
      } else {
        loginSchema.parse({ email, password });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // State for confirmation email sent
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const resendConfirmationEmail = async () => {
    if (!email) return;

    setIsConfirmingEmail(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      setConfirmationEmailSent(true);
      toast({
        title: 'Confirmation email sent!',
        description: 'Please check your inbox and click the confirmation link to verify your email.',
      });
    } catch (err: any) {
      const message = err?.message || 'Failed to send confirmation email';
      toast({
        title: 'Could not send email',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsConfirmingEmail(false);
    }
  };

  // Check for MFA requirement after login
  const checkMFARequirement = async (userId: string, userEmail: string) => {
    // First check if this is a trusted device
    const isTrusted = await checkTrustedDevice(userId);
    if (isTrusted) {
      console.log('Trusted device - skipping MFA');
      return false;
    }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      // User has MFA enabled and needs to verify
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];
      
      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setMfaUserId(userId);
        setMfaEmail(userEmail);
        setMfaMethod('totp');
        setShowMFAInput(true);
        return true;
      }
    }
    return false;
  };

  const handleMFAVerify = async () => {
    if (mfaCode.length !== 6) return;
    
    setIsVerifyingMFA(true);
    try {
      if (mfaMethod === 'totp' && mfaFactorId) {
        // TOTP verification
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });

        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: mfaCode,
        });

        if (verifyError) throw verifyError;
      } else if (mfaMethod === 'email' && mfaUserId) {
        // Email verification
        const result = await verifyEmailCode(mfaUserId, mfaCode);
        if (!result.success) {
          throw new Error(result.error || 'Invalid verification code');
        }
      }

      // Handle "Remember this device"
      if (rememberDevice && mfaUserId) {
        await trustDevice(mfaUserId);
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      
      setShowMFAInput(false);
      setMfaCode('');
      setRememberDevice(false);
      resetEmailMFAState();
      // Navigation will be handled by App.tsx
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!mfaUserId || !mfaEmail) return;
    await sendEmailCode(mfaUserId, mfaEmail);
    setMfaMethod('email');
    setMfaCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLastAuthError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const result = await signup(email, password, name);

        if (result.success) {
          toast({
            title: 'Account created!',
            description: 'Welcome to DropShip. You are now signed in.',
          });
          navigate('/dashboard');
        } else {
          setLastAuthError(result.error || 'Failed to create account');
          toast({
            title: 'Sign up failed',
            description: result.error || 'Failed to create account',
            variant: 'destructive',
          });
        }
      } else {
        const result = await login(email, password);

        if (result.success) {
          // Get user session to get userId
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          const userEmail = sessionData?.session?.user?.email;
          
          if (userId && userEmail) {
            // Check if MFA is required
            const needsMFA = await checkMFARequirement(userId, userEmail);
            
            if (!needsMFA) {
              setLastAuthError(null);
              toast({
                title: 'Welcome back!',
                description: 'You have successfully signed in.',
              });
              // Navigation handled by App.tsx based on role
            }
          }
        } else {
          setLastAuthError(result.error || 'Invalid credentials');
          toast({
            title: 'Sign in failed',
            description: result.error || 'Invalid credentials',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      setLastAuthError('An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setLastAuthError(null);
    setPassword('');
    setConfirmPassword('');
    setShowMFAInput(false);
    setMfaCode('');
    setConfirmationEmailSent(false);
  };

  const handleCancelMFA = async () => {
    await supabase.auth.signOut();
    setShowMFAInput(false);
    setMfaCode('');
    setMfaFactorId(null);
    setMfaUserId(null);
    setMfaEmail(null);
    setRememberDevice(false);
    setMfaMethod('totp');
    resetEmailMFAState();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
              top: '-10%',
              right: '-10%',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)',
              bottom: '-5%',
              left: '-10%',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div 
            className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              top: '40%',
              right: '20%',
              animation: 'float 12s ease-in-out infinite 2s',
            }}
          />
        </div>

        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Animated diagonal lines */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 30px,
              hsl(var(--accent)) 30px,
              hsl(var(--accent)) 31px
            )`,
            animation: 'shimmer 20s linear infinite',
          }}
        />

        <div className="relative z-10 flex flex-col justify-center px-16 text-foreground">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-2xl mb-6">
              <span className="text-accent-foreground font-bold text-2xl">D</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 text-foreground">DropShip</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
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
                <h3 className="font-semibold text-lg text-foreground">Private Main Store</h3>
                <p className="text-muted-foreground text-sm">
                  Centralized inventory, accessible only to you and your dropshippers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-lg">◈</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Dropshipper Storefronts</h3>
                <p className="text-muted-foreground text-sm">
                  Each dropshipper gets their own branded storefront with custom pricing.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-lg">◆</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Secure Payment Flow</h3>
                <p className="text-muted-foreground text-sm">
                  Orders fulfilled only after dropshipper payment confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Corner glow effects */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-pulse" />
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {showMFAInput ? (
            /* MFA Verification Form */
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">A</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {mfaMethod === 'totp' ? <ShieldCheck className="w-6 h-6 text-primary" /> : <Mail className="w-6 h-6 text-primary" />}
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">Two-Factor Authentication</h2>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {mfaMethod === 'totp' ? 'Enter the 6-digit code from your authenticator app' : `Enter the code sent to ${mfaEmail?.replace(/(.{2}).*(@.*)/, '$1***$2') || 'your email'}`}
                </p>
              </div>

              <div className="space-y-4">
                {/* Method toggle */}
                <div className="flex gap-2">
                  <Button type="button" variant={mfaMethod === 'totp' ? 'default' : 'outline'} size="sm" className="flex-1 gap-2" onClick={() => setMfaMethod('totp')}>
                    <ShieldCheck className="w-4 h-4" /> Authenticator
                  </Button>
                  <Button type="button" variant={mfaMethod === 'email' ? 'default' : 'outline'} size="sm" className="flex-1 gap-2" onClick={() => setMfaMethod('email')}>
                    <Mail className="w-4 h-4" /> Email Backup
                  </Button>
                </div>

                {/* Send email code button */}
                {mfaMethod === 'email' && !codeSent && (
                  <Button type="button" variant="outline" className="w-full h-12 gap-2" onClick={handleSendEmailCode} disabled={isSendingCode}>
                    {isSendingCode ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send code to email</>}
                  </Button>
                )}

                {/* Code input */}
                {(mfaMethod === 'totp' || codeSent) && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="mfaCode" className="text-sm font-medium">Verification Code</Label>
                        {mfaMethod === 'email' && <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs h-auto py-1" onClick={handleSendEmailCode} disabled={isSendingCode}><RefreshCw className="w-3 h-3" /> Resend</Button>}
                      </div>
                      <Input id="mfaCode" type="text" inputMode="numeric" pattern="[0-9]*" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="h-14 text-center text-2xl tracking-[0.5em] font-mono" maxLength={6} autoFocus />
                    </div>

                    {/* Remember device */}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="rememberDevice" checked={rememberDevice} onCheckedChange={(checked) => setRememberDevice(checked === true)} />
                      <label htmlFor="rememberDevice" className="text-sm text-muted-foreground cursor-pointer">Remember this device for 30 days</label>
                    </div>

                    <Button onClick={handleMFAVerify} className="w-full h-12 text-base gap-2" disabled={mfaCode.length !== 6 || isVerifyingMFA || isVerifyingCode}>
                      {isVerifyingMFA || isVerifyingCode ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : <><Shield className="w-5 h-5" /> Verify & Sign In</>}
                    </Button>
                  </>
                )}

                <Button variant="ghost" className="w-full" onClick={handleCancelMFA}>Cancel and sign out</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">A</span>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
                <p className="mt-2 text-muted-foreground">
                  {isSignUp ? 'Join Afflux and start selling' : 'Sign in to access your dashboard'}
                </p>
              </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className={`h-12 ${errors.name ? 'border-destructive' : ''}`}
                  autoComplete="name"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`h-12 ${errors.email ? 'border-destructive' : ''}`}
                autoComplete="email"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-12 pr-12 ${errors.password ? 'border-destructive' : ''}`}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}

              {/* Password strength indicator - only show during signup */}
              {isSignUp && password.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span
                      className={`font-medium ${
                        passwordStrength.label === 'Weak'
                          ? 'text-red-500'
                          : passwordStrength.label === 'Fair'
                            ? 'text-orange-500'
                            : passwordStrength.label === 'Good'
                              ? 'text-yellow-500'
                              : 'text-green-500'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={passwordStrength.score} className="h-1.5" />

                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {passwordRequirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-1.5 text-xs">
                        {req.regex.test(password) ? (
                          <Check className="w-3 h-3 text-accent" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span
                          className={
                            req.regex.test(password)
                              ? 'text-accent-foreground'
                              : 'text-muted-foreground'
                          }
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-12 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign in
                    </>
                  )}
                </>
              )}
            </Button>

            {!isSignUp && lastAuthError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Sign in failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{lastAuthError}</p>
                {isEmailNotConfirmed && (
                  <div className="mt-3 space-y-2">
                    {confirmationEmailSent ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20 text-accent-foreground">
                        <MailCheck className="w-5 h-5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">Confirmation email sent!</p>
                          <p className="text-muted-foreground">Check your inbox and click the link to verify your email.</p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 gap-2"
                        onClick={resendConfirmationEmail}
                        disabled={isSubmitting || isConfirmingEmail}
                      >
                        {isConfirmingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending email...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Resend confirmation email
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-12" onClick={toggleMode}>
            {isSignUp ? 'Sign in instead' : 'Create an account'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog open={showForgotPassword} onOpenChange={setShowForgotPassword} />
    </div>
  );
};

export default Auth;
