import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Key, Eye, EyeOff, AlertTriangle, Copy, Check, RefreshCw, Send } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

const getPasswordStrength = (password: string): { score: number; label: string } => {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  if (score < 40) return { score, label: 'Weak' };
  if (score < 60) return { score, label: 'Fair' };
  if (score < 80) return { score, label: 'Good' };
  return { score, label: 'Strong' };
};

const generateStrongPassword = (): string => {
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill remaining characters
  for (let i = 0; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const extractFunctionErrorMessage = async (err: any): Promise<string | null> => {
  // supabase.functions.invoke throws an error object that may include a Response on `context`
  const ctx = err?.context;
  if (ctx && typeof ctx === 'object' && typeof ctx.clone === 'function' && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error && typeof body.error === 'string') return body.error;
      if (body?.message && typeof body.message === 'string') return body.message;
    } catch {
      // ignore JSON parse errors
    }
  }

  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return null;
};

export const AdminResetPasswordDialog: React.FC<AdminResetPasswordDialogProps> = ({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailPasswordToUser, setEmailPasswordToUser] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSendResetEmail = async () => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, sendResetEmail: true },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Password reset email sent to ${userEmail}`);
      handleClose();
    } catch (error: any) {
      console.error('Reset email error:', error);
      const msg = await extractFunctionErrorMessage(error);
      toast.error(msg || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuccessPassword(newPassword);
      toast.success(`Password updated for ${userName}`);
    } catch (error: any) {
      console.error('Password update error:', error);
      const msg = await extractFunctionErrorMessage(error);
      toast.error(msg || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (successPassword) {
      await navigator.clipboard.writeText(successPassword);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailPassword = async () => {
    if (!successPassword) return;
    
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword: successPassword, emailNewPassword: true },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Password emailed to ${userEmail}`);
    } catch (error: any) {
      console.error('Email password error:', error);
      const msg = await extractFunctionErrorMessage(error);
      toast.error(msg || 'Failed to email password');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setActiveTab('email');
    setSuccessPassword(null);
    setCopied(false);
    setEmailPasswordToUser(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset password for <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              Send Reset Email
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Key className="w-4 h-4" />
              Set New Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will send a password reset link to the user's email address. 
                They will be able to choose their own new password.
              </p>
            </div>
            <Button 
              onClick={handleSendResetEmail} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Email
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            {successPassword ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Password updated successfully!
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Copy the password below to share with the user:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={successPassword}
                      className="font-mono bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyPassword}
                      className="flex-shrink-0"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Email password to user</p>
                  <p className="text-xs text-muted-foreground">
                    Send an email to <strong>{userEmail}</strong> with the new password included.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEmailPassword}
                    disabled={isSendingEmail}
                    className="w-full"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Email Password to User
                      </>
                    )}
                  </Button>
                </div>
                
                <DialogFooter>
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Make sure to securely communicate the new password to the user.
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-password">New Password</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="h-auto py-1 px-2 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Generate Strong
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-medium ${
                          passwordStrength.label === 'Weak' ? 'text-red-500' :
                          passwordStrength.label === 'Fair' ? 'text-orange-500' :
                          passwordStrength.label === 'Good' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <Progress value={passwordStrength.score} className="h-1.5" />
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || newPassword.length < 8 || newPassword !== confirmPassword}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Set Password
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
