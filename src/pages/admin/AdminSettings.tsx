import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings,
  Percent,
  DollarSign,
  Wallet,
  Zap,
  Loader2,
  Save,
  Users,
  Globe,
  Mail,
  Eye,
  EyeOff,
  Check,
  Image,
  Type,
  Layout,
  LayoutGrid,
  LayoutList,
  Columns3,
  Columns2,
  Upload,
  X,
  ExternalLink,
  ArrowRight,
  Store,
  ShoppingCart,
  Shield,
  BarChart3,
  History,
  Clock,
  CreditCard,
  Palette,
  Bell,
  FileText,
  ChevronUp,
  ChevronDown,
  Keyboard,
  RotateCcw,
  Server,
  ImageIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useSettingsAuditLogs } from '@/hooks/useSettingsAuditLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { PaymentGatewaySettings } from '@/components/admin/PaymentGatewaySettings';
// USDWalletSettings merged into PaymentMethodSettings
import { PaymentMethodSettings } from '@/components/admin/PaymentMethodSettings';
import { CryptoWalletsSettings } from '@/components/admin/CryptoWalletsSettings';
import { LevelCommissionSettings } from '@/components/admin/LevelCommissionSettings';
import { TopDropshippersSettings } from '@/components/admin/TopDropshippersSettings';
import { AutoPayoutSettings } from '@/components/admin/AutoPayoutSettings';
import PayoutMethodSettings from '@/components/admin/PayoutMethodSettings';
import { CustomPaymentMethodsManager } from '@/components/admin/CustomPaymentMethodsManager';
import { FAQSettings } from '@/components/admin/FAQSettings';
import { VideoTutorialsSettings } from '@/components/admin/VideoTutorialsSettings';
import { VideoSettings } from '@/components/admin/VideoSettings';
import { StorefrontSettings } from '@/components/admin/StorefrontSettings';
import { PaymentIconSettings } from '@/components/admin/PaymentIconSettings';
import { MFASettings } from '@/components/mfa/MFASettings';
import { IndianNamesSettings } from '@/components/admin/IndianNamesSettings';
import { NotificationSoundSettings } from '@/components/admin/NotificationSoundSettings';
import { QuickReplySettings } from '@/components/admin/QuickReplySettings';
import { ChatReassignmentSettings } from '@/components/admin/ChatReassignmentSettings';
import { ChatSettings } from '@/components/admin/ChatSettings';
import DashboardMessageSettings from '@/components/admin/DashboardMessageSettings';
import { PopupMessageSettings } from '@/components/admin/PopupMessageSettings';
import { PendingPaymentBlockSettings } from '@/components/admin/PendingPaymentBlockSettings';
import DeploymentChecklist from '@/components/admin/DeploymentChecklist';
import ProjectExport from '@/components/admin/ProjectExport';
import AdminSetupWizard from '@/components/admin/AdminSetupWizard';
import { SystemHealthDashboard } from '@/components/admin/SystemHealthDashboard';
import { WorkTypeSettings } from '@/components/admin/WorkTypeSettings';
import { WorkTypeCategorySettings } from '@/components/admin/WorkTypeCategorySettings';
import { AdminPostpaidSettings } from '@/components/admin/AdminPostpaidSettings';
import { PostpaidAnalyticsDashboard } from '@/components/admin/PostpaidAnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, MessageSquare } from 'lucide-react';
import { SettingsSection } from '@/components/admin/SettingsSection';
import { ThemeSelectorCard } from '@/components/ThemeSelector';
import { CustomThemeBuilder } from '@/components/admin/CustomThemeBuilder';
import { AdminProfileCard } from '@/components/admin/AdminProfileCard';
import { SiteBrandingSettings } from '@/components/admin/SiteBrandingSettings';
import { AdminMediaLibrary } from '@/components/admin/AdminMediaLibrary';

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, isLoading, updateSettingAsync, isUpdating } = usePlatformSettings();
  const { logs: settingsLogs, isLoading: isLoadingLogs } = useSettingsAuditLogs(10);
  
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionRate, setCommissionRate] = useState('100');
  const [minPayoutAmount, setMinPayoutAmount] = useState('50');
  const [autoCreditOnComplete, setAutoCreditOnComplete] = useState(true);
  const [autoUserApproval, setAutoUserApproval] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [defaultMarkupPercentage, setDefaultMarkupPercentage] = useState('30');
  const [hasChanges, setHasChanges] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Payout settings
  const [payoutEnabled, setPayoutEnabled] = useState(true);
  const [payoutDisabledMessage, setPayoutDisabledMessage] = useState('');
  const [minimumWalletBalanceForPayment, setMinimumWalletBalanceForPayment] = useState('0');
  
  // Selling percentage settings
  const [sellingPercentageMin, setSellingPercentageMin] = useState('2');
  const [sellingPercentageMax, setSellingPercentageMax] = useState('5');
  
  // Branding settings
  const [siteName, setSiteName] = useState('Dropshipper Platform');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [userHubName, setUserHubName] = useState('Dropshipper Hub');
  const [adminPanelTitle, setAdminPanelTitle] = useState('Admin Panel');
  const [footerText, setFooterText] = useState('© {year} {site_name}. All rights reserved.');
  const [landingPageEnabled, setLandingPageEnabled] = useState(true);
  const [landingPageTitle, setLandingPageTitle] = useState('');
  const [landingPageSubtitle, setLandingPageSubtitle] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  
  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Email notification settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [senderEmail, setSenderEmail] = useState('onboarding@resend.dev');
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  
  // Contact information settings
  const [contactEmail, setContactEmail] = useState('support@dropship.com');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [contactAddress, setContactAddress] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [isSavingContactSettings, setIsSavingContactSettings] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grid layout state
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(3);
  
  // Section collapse state
  const [sectionStates, setSectionStates] = useState({
    general: true,
    commission: false,
    wallet: false,
    security: false,
    media: false,
  });
  
  const allExpanded = Object.values(sectionStates).every(v => v);
  const allCollapsed = Object.values(sectionStates).every(v => !v);
  
  const expandAll = () => {
    setSectionStates({ general: true, commission: true, wallet: true, security: true, media: true });
  };
  
  const collapseAll = () => {
    setSectionStates({ general: false, commission: false, wallet: false, security: false, media: false });
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl/Cmd + Shift + E = Expand all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'e') {
        e.preventDefault();
        expandAll();
      }
      
      // Ctrl/Cmd + Shift + C = Collapse all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        collapseAll();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Reset handlers for each section
  const handleResetGeneral = () => {
    setAutoUserApproval(false);
    setSiteName('Dropshipper Platform');
    setSiteLogoUrl('');
    setLandingPageEnabled(true);
    setLandingPageTitle('');
    setLandingPageSubtitle('');
    setDefaultCurrency('USD');
    toast({
      title: "General Settings Reset",
      description: "Values reset to defaults. Save to apply.",
    });
  };
  
  const handleResetCommission = () => {
    setCommissionType('percentage');
    setCommissionRate('100');
    setDefaultMarkupPercentage('30');
    setSellingPercentageMin('2');
    setSellingPercentageMax('5');
    toast({
      title: "Commission Settings Reset",
      description: "Values reset to defaults. Save to apply.",
    });
  };
  
  const handleResetWallet = () => {
    setMinPayoutAmount('50');
    setAutoCreditOnComplete(true);
    setPayoutEnabled(true);
    setPayoutDisabledMessage('');
    setMinimumWalletBalanceForPayment('0');
    toast({
      title: "Wallet Settings Reset",
      description: "Values reset to defaults. Save to apply.",
    });
  };
  
  const handleResetSecurity = () => {
    setEmailNotificationsEnabled(false);
    setAdminEmail('');
    toast({
      title: "Security Settings Reset",
      description: "Values reset to defaults. Save to apply.",
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setSiteLogoUrl(publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully. Save to apply.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setSiteLogoUrl('');
  };

  // Load settings once (prevents inputs/toggles from resetting while typing)
  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      setCommissionType(settingsMap.commission_type);
      setCommissionRate(settingsMap.commission_rate.toString());
      setMinPayoutAmount(settingsMap.min_payout_amount.toString());
      setAutoCreditOnComplete(settingsMap.auto_credit_on_complete);
      setAutoUserApproval(settingsMap.auto_user_approval);
      setDefaultCurrency(settingsMap.default_currency);
      setDefaultMarkupPercentage(settingsMap.default_markup_percentage.toString());
      // Load payout settings
      setPayoutEnabled(settingsMap.payout_enabled);
      setPayoutDisabledMessage(settingsMap.payout_disabled_message);
      // Load selling percentage settings
      setSellingPercentageMin(settingsMap.selling_percentage_min.toString());
      setSellingPercentageMax(settingsMap.selling_percentage_max.toString());
      // Load branding settings
      setSiteName(settingsMap.site_name);
      setSiteLogoUrl(settingsMap.site_logo_url);
      setUserHubName(settingsMap.user_hub_name || 'Dropshipper Hub');
      setAdminPanelTitle(settingsMap.admin_panel_title || 'Admin Panel');
      setFooterText(settingsMap.footer_text || '© {year} {site_name}. All rights reserved.');
      setLandingPageEnabled(settingsMap.landing_page_enabled);
      setLandingPageTitle(settingsMap.landing_page_title);
      setLandingPageSubtitle(settingsMap.landing_page_subtitle);
      // Load email settings from platform_settings
      setResendApiKey(settingsMap.resend_api_key || '');
      setEmailNotificationsEnabled(settingsMap.email_notifications_enabled);
      setAdminEmail(settingsMap.admin_email || '');
      setSenderEmail(settingsMap.sender_email || 'onboarding@resend.dev');
      if (settingsMap.resend_api_key) {
        setIsApiKeySaved(true);
      }
      // Load contact information settings
      setContactEmail(settingsMap.contact_email || 'support@dropship.com');
      setContactPhone(settingsMap.contact_phone || '+91 98765 43210');
      setContactAddress(settingsMap.contact_address || '');
      setContactWhatsapp(settingsMap.contact_whatsapp || '');
      // Load minimum wallet balance for payment
      setMinimumWalletBalanceForPayment(settingsMap.minimum_wallet_balance_for_payment.toString());
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized, settingsMap]);

  // Track changes per section
  const hasGeneralChanges = hasInitialized && (
    autoUserApproval !== settingsMap.auto_user_approval ||
    defaultCurrency !== settingsMap.default_currency
  );
  
  const hasCommissionChanges = hasInitialized && (
    commissionType !== settingsMap.commission_type ||
    commissionRate !== settingsMap.commission_rate.toString() ||
    defaultMarkupPercentage !== settingsMap.default_markup_percentage.toString() ||
    sellingPercentageMin !== settingsMap.selling_percentage_min.toString() ||
    sellingPercentageMax !== settingsMap.selling_percentage_max.toString()
  );
  
  const hasWalletChanges = hasInitialized && (
    minPayoutAmount !== settingsMap.min_payout_amount.toString() ||
    autoCreditOnComplete !== settingsMap.auto_credit_on_complete ||
    payoutEnabled !== settingsMap.payout_enabled ||
    payoutDisabledMessage !== settingsMap.payout_disabled_message ||
    minimumWalletBalanceForPayment !== settingsMap.minimum_wallet_balance_for_payment.toString()
  );
  
  // Track overall changes
  useEffect(() => {
    setHasChanges(hasGeneralChanges || hasCommissionChanges || hasWalletChanges);
  }, [hasGeneralChanges, hasCommissionChanges, hasWalletChanges]);

  // Section-specific saving state
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showSaveAllConfirm, setShowSaveAllConfirm] = useState(false);
  
  const handleSaveGeneral = async () => {
    setIsSavingGeneral(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'auto_user_approval', value: autoUserApproval.toString(), oldValue: settingsMap.auto_user_approval.toString() }),
        updateSettingAsync({ key: 'default_currency', value: defaultCurrency, oldValue: settingsMap.default_currency }),
      ]);
      toast({
        title: "General Settings Saved",
        description: "User approval and currency settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast({
        title: "Error",
        description: "Failed to save general settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };
  
  const handleSaveCommission = async () => {
    setIsSavingCommission(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'commission_type', value: commissionType, oldValue: settingsMap.commission_type }),
        updateSettingAsync({ key: 'commission_rate', value: commissionRate, oldValue: settingsMap.commission_rate.toString() }),
        updateSettingAsync({ key: 'default_markup_percentage', value: defaultMarkupPercentage, oldValue: settingsMap.default_markup_percentage.toString() }),
        updateSettingAsync({ key: 'selling_percentage_min', value: sellingPercentageMin, oldValue: settingsMap.selling_percentage_min.toString() }),
        updateSettingAsync({ key: 'selling_percentage_max', value: sellingPercentageMax, oldValue: settingsMap.selling_percentage_max.toString() }),
      ]);
      toast({
        title: "Commission Settings Saved",
        description: "Commission and pricing settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving commission settings:', error);
      toast({
        title: "Error",
        description: "Failed to save commission settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCommission(false);
    }
  };
  
  const handleSaveWallet = async () => {
    setIsSavingWallet(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'min_payout_amount', value: minPayoutAmount, oldValue: settingsMap.min_payout_amount.toString() }),
        updateSettingAsync({ key: 'auto_credit_on_complete', value: autoCreditOnComplete.toString(), oldValue: settingsMap.auto_credit_on_complete.toString() }),
        updateSettingAsync({ key: 'payout_enabled', value: payoutEnabled.toString(), oldValue: settingsMap.payout_enabled.toString() }),
        updateSettingAsync({ key: 'payout_disabled_message', value: payoutDisabledMessage, oldValue: settingsMap.payout_disabled_message }),
        updateSettingAsync({ key: 'minimum_wallet_balance_for_payment', value: minimumWalletBalanceForPayment, oldValue: settingsMap.minimum_wallet_balance_for_payment.toString() }),
      ]);
      toast({
        title: "Wallet Settings Saved",
        description: "Payout and wallet settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving wallet settings:', error);
      toast({
        title: "Error",
        description: "Failed to save wallet settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'commission_type', value: commissionType, oldValue: settingsMap.commission_type }),
        updateSettingAsync({ key: 'commission_rate', value: commissionRate, oldValue: settingsMap.commission_rate.toString() }),
        updateSettingAsync({ key: 'min_payout_amount', value: minPayoutAmount, oldValue: settingsMap.min_payout_amount.toString() }),
        updateSettingAsync({ key: 'auto_credit_on_complete', value: autoCreditOnComplete.toString(), oldValue: settingsMap.auto_credit_on_complete.toString() }),
        updateSettingAsync({ key: 'auto_user_approval', value: autoUserApproval.toString(), oldValue: settingsMap.auto_user_approval.toString() }),
        updateSettingAsync({ key: 'default_currency', value: defaultCurrency, oldValue: settingsMap.default_currency }),
        updateSettingAsync({ key: 'default_markup_percentage', value: defaultMarkupPercentage, oldValue: settingsMap.default_markup_percentage.toString() }),
        updateSettingAsync({ key: 'payout_enabled', value: payoutEnabled.toString(), oldValue: settingsMap.payout_enabled.toString() }),
        updateSettingAsync({ key: 'payout_disabled_message', value: payoutDisabledMessage, oldValue: settingsMap.payout_disabled_message }),
        updateSettingAsync({ key: 'selling_percentage_min', value: sellingPercentageMin, oldValue: settingsMap.selling_percentage_min.toString() }),
        updateSettingAsync({ key: 'selling_percentage_max', value: sellingPercentageMax, oldValue: settingsMap.selling_percentage_max.toString() }),
      ]);
      setHasChanges(false);
      toast({
        title: "All Settings Saved",
        description: "Your platform settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!resendApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a Resend API key.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingEmailSettings(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'resend_api_key', value: resendApiKey, oldValue: settingsMap.resend_api_key }),
        updateSettingAsync({ key: 'email_notifications_enabled', value: emailNotificationsEnabled.toString(), oldValue: settingsMap.email_notifications_enabled.toString() }),
        updateSettingAsync({ key: 'admin_email', value: adminEmail, oldValue: settingsMap.admin_email }),
        updateSettingAsync({ key: 'sender_email', value: senderEmail, oldValue: settingsMap.sender_email }),
      ]);
      setIsApiKeySaved(true);
      toast({
        title: "Email Settings Saved",
        description: "Your email notification settings have been saved.",
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Error",
        description: "Failed to save email settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSavingEmailSettings(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'resend_api_key', value: '', oldValue: settingsMap.resend_api_key }),
        updateSettingAsync({ key: 'email_notifications_enabled', value: 'false', oldValue: settingsMap.email_notifications_enabled.toString() }),
        updateSettingAsync({ key: 'admin_email', value: '', oldValue: settingsMap.admin_email }),
        updateSettingAsync({ key: 'sender_email', value: 'onboarding@resend.dev', oldValue: settingsMap.sender_email }),
      ]);
      setResendApiKey('');
      setIsApiKeySaved(false);
      setEmailNotificationsEnabled(false);
      setAdminEmail('');
      setSenderEmail('onboarding@resend.dev');
      toast({
        title: "Settings Cleared",
        description: "Email notification settings have been cleared.",
      });
    } catch (error) {
      console.error('Error clearing settings:', error);
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleSaveBrandingSettings = async () => {
    setIsSavingBranding(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'site_name', value: siteName, oldValue: settingsMap.site_name }),
        updateSettingAsync({ key: 'site_logo_url', value: siteLogoUrl, oldValue: settingsMap.site_logo_url }),
        updateSettingAsync({ key: 'user_hub_name', value: userHubName, oldValue: settingsMap.user_hub_name }),
        updateSettingAsync({ key: 'admin_panel_title', value: adminPanelTitle, oldValue: settingsMap.admin_panel_title }),
        updateSettingAsync({ key: 'footer_text', value: footerText, oldValue: settingsMap.footer_text }),
        updateSettingAsync({ key: 'landing_page_enabled', value: landingPageEnabled.toString(), oldValue: settingsMap.landing_page_enabled.toString() }),
        updateSettingAsync({ key: 'landing_page_title', value: landingPageTitle, oldValue: settingsMap.landing_page_title }),
        updateSettingAsync({ key: 'landing_page_subtitle', value: landingPageSubtitle, oldValue: settingsMap.landing_page_subtitle }),
      ]);
      toast({
        title: "Branding Settings Saved",
        description: "Your branding settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveContactSettings = async () => {
    setIsSavingContactSettings(true);
    try {
      await Promise.all([
        updateSettingAsync({ key: 'contact_email', value: contactEmail, oldValue: settingsMap.contact_email }),
        updateSettingAsync({ key: 'contact_phone', value: contactPhone, oldValue: settingsMap.contact_phone }),
        updateSettingAsync({ key: 'contact_address', value: contactAddress, oldValue: settingsMap.contact_address }),
        updateSettingAsync({ key: 'contact_whatsapp', value: contactWhatsapp, oldValue: settingsMap.contact_whatsapp }),
      ]);
      toast({
        title: "Contact Settings Saved",
        description: "Your contact information has been updated.",
      });
    } catch (error) {
      console.error('Error saving contact settings:', error);
      toast({
        title: "Error",
        description: "Failed to save contact settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingContactSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!adminEmail.trim()) {
      toast({
        title: "Admin Email Required",
        description: "Please enter an admin email address first.",
        variant: "destructive",
      });
      return;
    }

    if (!resendApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter and save a Resend API key first.",
        variant: "destructive",
      });
      return;
    }

    if (!emailNotificationsEnabled) {
      toast({
        title: "Notifications Disabled",
        description: "Please enable email notifications first.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'test_email',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Test Email Sent!",
          description: `Check ${adminEmail} for the test email.`,
        });
      } else {
        throw new Error(data?.error || data?.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Email Failed",
        description: error.message || "Failed to send test email. Check your settings.",
        variant: "destructive",
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-32" />
          <div className="grid gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure platform settings and business rules.
              </p>
            </div>
            {hasChanges && (
              <Button onClick={handleSaveAll} disabled={isUpdating} className="gap-2">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            )}
          </div>
          
          {/* Search Bar and Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Layout & Expand/Collapse Controls */}
            <div className="flex items-center gap-2">
              {/* Grid Layout Toggle */}
              <div className="flex items-center border border-border rounded-md overflow-hidden">
                <Button
                  variant={gridColumns === 1 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setGridColumns(1)}
                  className="rounded-none h-8 px-2"
                  title="Single column"
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
                <Button
                  variant={gridColumns === 2 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setGridColumns(2)}
                  className="rounded-none h-8 px-2 border-x border-border"
                  title="Two columns"
                >
                  <Columns2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={gridColumns === 3 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setGridColumns(3)}
                  className="rounded-none h-8 px-2"
                  title="Three columns"
                >
                  <Columns3 className="w-4 h-4" />
                </Button>
              </div>
              
              <AdminSetupWizard />
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                disabled={allExpanded}
                className="gap-1.5"
              >
                <ChevronDown className="w-4 h-4" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                disabled={allCollapsed}
                className="gap-1.5"
              >
                <ChevronUp className="w-4 h-4" />
                Collapse All
              </Button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1.5">
                <Keyboard className="w-3 h-3" />
                <span>⌘⇧E / ⌘⇧C</span>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings Section */}
        <SettingsSection
          title="General Settings"
          description="User approval, branding, and currency settings"
          icon={<Settings className="w-5 h-5 text-primary" />}
          isOpen={sectionStates.general}
          onOpenChange={(open) => setSectionStates(prev => ({ ...prev, general: open }))}
          searchQuery={searchQuery}
          sectionKeywords={['user', 'approval', 'branding', 'logo', 'landing page', 'currency', 'site name', 'theme', 'appearance', 'dark', 'light', 'blue']}
          showResetButton={true}
          onResetToDefaults={handleResetGeneral}
          hasChanges={hasGeneralChanges}
          onSave={handleSaveGeneral}
          isSaving={isSavingGeneral}
          gridColumns={gridColumns}
        >
          {/* Admin Profile Card */}
          <AdminProfileCard />

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Choose your preferred theme for the admin dashboard.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme Selection</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Hover over a theme to preview it before applying.
                </p>
                <ThemeSelectorCard />
              </div>
            </CardContent>
          </Card>

          {/* Custom Theme Builder - Admin Only */}
          <CustomThemeBuilder />

          {/* User Approval Settings */}
          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle>User Approval</CardTitle>
                <CardDescription>
                  Control how new users are onboarded to the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Approve New Users</Label>
                <p className="text-sm text-muted-foreground">
                  {autoUserApproval 
                    ? 'New users are automatically approved and can use all features immediately.'
                    : 'New users require manual approval before they can add products or receive orders.'}
                </p>
              </div>
              <Switch
                checked={autoUserApproval}
                onCheckedChange={setAutoUserApproval}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">When auto-approval is OFF, pending users cannot:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Add products to their storefront</li>
                <li>Activate their storefront</li>
                <li>Receive customer orders</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Site Branding - Title & Favicon */}
        <SiteBrandingSettings />

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Layout className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <CardTitle>Branding & Landing Page</CardTitle>
                <CardDescription>
                  Customize your platform's name, logo, and landing page.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Site Name
              </Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Your Platform Name"
                className="max-w-md"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> User Hub Name
              </Label>
              <Input
                value={userHubName}
                onChange={(e) => setUserHubName(e.target.value)}
                placeholder="e.g., Dropshipper Hub, Seller Hub"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                This name appears in the sidebar for users (e.g., "Dropshipper Hub", "Seller Hub").
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Admin Panel Title
              </Label>
              <Input
                value={adminPanelTitle}
                onChange={(e) => setAdminPanelTitle(e.target.value)}
                placeholder="e.g., Admin Panel, Control Center"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                This title appears in the sidebar for admins (e.g., "Admin Panel", "Control Center").
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Footer Text
              </Label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="© {year} {site_name}. All rights reserved."
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Footer text for landing page. Use {'{year}'} for current year and {'{site_name}'} for platform name.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Logo
              </Label>
              
              {/* Logo Preview */}
              {siteLogoUrl && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 max-w-md">
                  <img 
                    src={siteLogoUrl} 
                    alt="Logo preview" 
                    className="w-16 h-16 rounded-xl object-cover border border-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current Logo</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{siteLogoUrl}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="flex gap-2 max-w-md">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="gap-2"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Logo
                </Button>
                <span className="text-sm text-muted-foreground self-center">or</span>
                <Input
                  value={siteLogoUrl}
                  onChange={(e) => setSiteLogoUrl(e.target.value)}
                  placeholder="Enter logo URL"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Upload an image or enter a URL. Recommended size: 200x200px. Max 2MB.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Landing Page</Label>
                <p className="text-sm text-muted-foreground">
                  Show the public landing page at the root URL.
                </p>
              </div>
              <Switch
                checked={landingPageEnabled}
                onCheckedChange={setLandingPageEnabled}
              />
            </div>

            {landingPageEnabled && (
              <>
                <div className="grid gap-2">
                  <Label>Landing Page Title</Label>
                  <Input
                    value={landingPageTitle}
                    onChange={(e) => setLandingPageTitle(e.target.value)}
                    placeholder="Welcome to Our Platform"
                    className="max-w-md"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Landing Page Subtitle</Label>
                  <Input
                    value={landingPageSubtitle}
                    onChange={(e) => setLandingPageSubtitle(e.target.value)}
                    placeholder="Join our dropshipping network and start earning today"
                    className="max-w-md"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveBrandingSettings} 
                disabled={isSavingBranding}
                className="gap-2"
              >
                {isSavingBranding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Branding Settings
              </Button>
              {landingPageEnabled && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Landing Page
                </Button>
              )}
            </div>
          </CardContent>

          {/* Landing Page Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Landing Page Preview</DialogTitle>
              </DialogHeader>
              <div className="bg-background">
                {/* Preview Header */}
                <div className="bg-background/80 backdrop-blur-lg border-b border-border">
                  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {siteLogoUrl ? (
                        <img src={siteLogoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-lg">{siteName.charAt(0)}</span>
                        </div>
                      )}
                      <span className="font-bold text-xl text-foreground">{siteName}</span>
                    </div>
                    <Button size="sm">
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Preview Hero */}
                <div className="py-16 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-6">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="text-sm text-white/80">The Future of Dropshipping</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                      {landingPageTitle || 'Empower Your Dropshipping Network'}
                    </h1>
                    <p className="text-lg text-white/70 max-w-xl mx-auto mb-8">
                      {landingPageSubtitle || 'A private e-commerce platform where dropshippers run their own storefronts.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        View Demo Store
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Preview Features */}
                <div className="py-12 px-4">
                  <div className="container mx-auto">
                    <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Everything You Need</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { icon: Store, title: 'Private Main Store' },
                        { icon: Users, title: 'Dropshipper Storefronts' },
                        { icon: ShoppingCart, title: 'Smart Order Flow' },
                        { icon: Shield, title: 'Secure Payments' },
                        { icon: BarChart3, title: 'Real-time Analytics' },
                        { icon: Zap, title: 'Instant Setup' },
                      ].map((feature, index) => (
                        <div key={index} className="p-4 rounded-xl border border-border bg-card">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                            <feature.icon className="w-5 h-5 text-accent" />
                          </div>
                          <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Footer */}
                <div className="py-6 px-4 border-t border-border">
                  <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {siteLogoUrl ? (
                        <img src={siteLogoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-sm">{siteName.charAt(0)}</span>
                        </div>
                      )}
                      <span className="font-semibold text-foreground">{siteName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">© 2024 {siteName}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        {/* Contact Information Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Configure contact details shown on the landing page.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contact Email
              </Label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@yourplatform.com"
                className="max-w-md"
                type="email"
              />
              <p className="text-sm text-muted-foreground">
                Email address displayed on the landing page contact section.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4" /> Contact Phone
              </Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="max-w-md"
                type="tel"
              />
              <p className="text-sm text-muted-foreground">
                Phone number displayed on the landing page.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> WhatsApp Number (Optional)
              </Label>
              <Input
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="+91 98765 43210"
                className="max-w-md"
                type="tel"
              />
              <p className="text-sm text-muted-foreground">
                WhatsApp number for direct messaging. Leave empty to hide.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Store className="w-4 h-4" /> Business Address (Optional)
              </Label>
              <Input
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="123 Business Street, City, Country"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Physical address for your business. Leave empty to hide.
              </p>
            </div>

            <Button 
              onClick={handleSaveContactSettings} 
              disabled={isSavingContactSettings}
              className="gap-2"
            >
              {isSavingContactSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Contact Settings
            </Button>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>
                  Set the default currency for the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                    <SelectItem key={code} value={code}>
                      {symbol} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This currency will be used across all dashboards, orders, and wallet balances.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settingsMap.display_currencies.map(code => (
                <Badge key={code} variant="secondary">
                  {CURRENCY_SYMBOLS[code]} {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        </SettingsSection>

        {/* Commission & Pricing Section */}
        <SettingsSection
          title="Commission & Pricing"
          description="Configure commissions, markups, and selling percentages"
          icon={<Percent className="w-5 h-5 text-emerald-600" />}
          isOpen={sectionStates.commission}
          onOpenChange={(open) => setSectionStates(prev => ({ ...prev, commission: open }))}
          searchQuery={searchQuery}
          sectionKeywords={['commission', 'markup', 'percentage', 'pricing', 'rate', 'dropshipper']}
          showResetButton={true}
          onResetToDefaults={handleResetCommission}
          hasChanges={hasCommissionChanges}
          onSave={handleSaveCommission}
          isSaving={isSavingCommission}
          gridColumns={gridColumns}
        >
          {/* Commission Settings */}
          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Commission Settings</CardTitle>
                <CardDescription>
                  Configure default dropshipper commissions. Can be overridden per user.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Commission Type</Label>
              <Select 
                value={commissionType} 
                onValueChange={(value: 'percentage' | 'fixed') => setCommissionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage of Profit</SelectItem>
                  <SelectItem value="fixed">Fixed Amount per Unit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {commissionType === 'percentage' 
                  ? 'Dropshippers earn a percentage of their profit margin (selling price - base price).'
                  : 'Dropshippers earn a fixed amount for each unit sold.'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>
                {commissionType === 'percentage' ? 'Default Commission Rate (%)' : 'Commission per Unit'}
              </Label>
              <div className="relative max-w-xs">
                {commissionType === 'percentage' ? (
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="pl-10"
                  min="0"
                  max={commissionType === 'percentage' ? '100' : undefined}
                  step={commissionType === 'percentage' ? '1' : '0.01'}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {commissionType === 'percentage' 
                  ? `Dropshippers receive ${commissionRate}% of their profit margin by default.`
                  : `Dropshippers receive ${CURRENCY_SYMBOLS[defaultCurrency]}${(parseFloat(commissionRate) || 0).toFixed(2)} per unit sold.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Markup Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Product Markup Settings</CardTitle>
                <CardDescription>
                  Configure the default markup percentage applied to product base prices.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Markup Percentage (%)</Label>
              <div className="relative max-w-xs">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={defaultMarkupPercentage}
                  onChange={(e) => setDefaultMarkupPercentage(e.target.value)}
                  className="pl-10"
                  min="1"
                  max="500"
                  step="1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                When users add products to their storefront, the selling price will be automatically set to the base price + {defaultMarkupPercentage}% markup.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Example:</p>
              <p className="text-muted-foreground">
                If a product has a base price of $100 and the markup is {defaultMarkupPercentage}%, 
                the selling price will be ${(100 * (1 + parseFloat(defaultMarkupPercentage || '0') / 100)).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Selling Percentage Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <CardTitle>User Selling Percentage</CardTitle>
                <CardDescription>
                  Configure the minimum and maximum markup percentage users can apply to products.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Minimum Markup (%)</Label>
                <div className="relative max-w-xs">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={sellingPercentageMin}
                    onChange={(e) => setSellingPercentageMin(e.target.value)}
                    className="pl-10"
                    min="1"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Maximum Markup (%)</Label>
                <div className="relative max-w-xs">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={sellingPercentageMax}
                    onChange={(e) => setSellingPercentageMax(e.target.value)}
                    className="pl-10"
                    min="1"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">How it works:</p>
              <p className="text-muted-foreground">
                Users can set their product prices with a markup between {sellingPercentageMin}% and {sellingPercentageMax}% of the base price.
                For a $100 product, they can price it between ${(100 * (1 + parseFloat(sellingPercentageMin || '0') / 100)).toFixed(2)} and ${(100 * (1 + parseFloat(sellingPercentageMax || '0') / 100)).toFixed(2)}.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top Dropshippers Leaderboard Settings */}
        <TopDropshippersSettings />
        </SettingsSection>

        {/* Wallet & Payouts Section */}
        <SettingsSection
          title="Wallet & Payouts"
          description="Configure payout rules, automation, and methods"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
          isOpen={sectionStates.wallet}
          onOpenChange={(open) => setSectionStates(prev => ({ ...prev, wallet: open }))}
          searchQuery={searchQuery}
          sectionKeywords={['wallet', 'payout', 'payment', 'email', 'notification', 'gateway', 'crypto', 'usd', 'automation']}
          showResetButton={true}
          onResetToDefaults={handleResetWallet}
          hasChanges={hasWalletChanges}
          onSave={handleSaveWallet}
          isSaving={isSavingWallet}
          gridColumns={gridColumns}
        >
          {/* Payout Settings */}
          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>
                  Configure wallet and payout rules.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Payout Requests</Label>
                <p className="text-sm text-muted-foreground">
                  {payoutEnabled 
                    ? 'Dropshippers can request payouts from their wallet balance.'
                    : 'Payout requests are disabled. Users will see your custom message.'}
                </p>
              </div>
              <Switch
                checked={payoutEnabled}
                onCheckedChange={setPayoutEnabled}
              />
            </div>
            
            {!payoutEnabled && (
              <div className="grid gap-2">
                <Label>Disabled Message</Label>
                <Input
                  value={payoutDisabledMessage}
                  onChange={(e) => setPayoutDisabledMessage(e.target.value)}
                  placeholder="Enter a message to show users when payouts are disabled"
                />
                <p className="text-sm text-muted-foreground">
                  This message will be displayed to users when they try to request a payout.
                </p>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label>Minimum Payout Amount</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {CURRENCY_SYMBOLS[defaultCurrency]}
                </span>
                <Input
                  type="number"
                  value={minPayoutAmount}
                  onChange={(e) => setMinPayoutAmount(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Dropshippers must have at least {CURRENCY_SYMBOLS[defaultCurrency]}{minPayoutAmount} in their wallet to request a payout.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>Minimum Wallet Balance for Order Payment</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {CURRENCY_SYMBOLS[defaultCurrency]}
                </span>
                <Input
                  type="number"
                  value={minimumWalletBalanceForPayment}
                  onChange={(e) => setMinimumWalletBalanceForPayment(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Dropshippers must have at least {CURRENCY_SYMBOLS[defaultCurrency]}{minimumWalletBalanceForPayment} in their wallet to use wallet payment for orders. Set to 0 to allow any balance.
              </p>
            </div>
            
            <div className="pt-4 border-t">
              <Button onClick={handleSaveAll} disabled={isUpdating} className="gap-2">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Payout Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Automation</CardTitle>
                <CardDescription>
                  Configure automatic actions and workflows.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-credit on Order Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically credit dropshipper wallet when an order is marked as completed.
                </p>
              </div>
              <Switch
                checked={autoCreditOnComplete}
                onCheckedChange={setAutoCreditOnComplete}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Configure email notifications for chat messages using Resend.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications when users send chat messages.
                </p>
              </div>
              <Switch
                checked={emailNotificationsEnabled}
                onCheckedChange={(checked) => {
                  setEmailNotificationsEnabled(checked);
                  localStorage.setItem('email_notifications_enabled', checked.toString());
                }}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Admin Email (for notifications)</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Notifications will be sent to this email address.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Sender Email (verified domain)</Label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                The "from" address for outgoing emails. Must be a verified domain in Resend. 
                <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Verify domain</a>
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>Resend API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={resendApiKey}
                    onChange={(e) => {
                      setResendApiKey(e.target.value);
                      setIsApiKeySaved(false);
                    }}
                    placeholder="re_xxxxxxxxx..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button 
                  onClick={handleSaveEmailSettings} 
                  disabled={!resendApiKey.trim() || isSavingEmailSettings}
                  className="gap-2"
                >
                  {isSavingEmailSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Email Settings
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a>.
              </p>
            </div>

            {isApiKeySaved && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-emerald-600 mb-2">✓ Email Settings Configured</p>
                <p className="text-muted-foreground">
                  Email notifications are ready. Notifications will be sent for orders, payouts, chat messages, and more.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail}
                    className="gap-2"
                  >
                    {isSendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test Email
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearApiKey}
                    disabled={isSavingEmailSettings}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear Settings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Gateway Settings */}
        <PaymentGatewaySettings />

        {/* Payment Method Settings (includes full USD Wallet config) */}
        <PaymentMethodSettings />

        {/* Multi-Crypto Wallet Settings */}
        <CryptoWalletsSettings />

        {/* Level-Based Commission Settings */}
        <LevelCommissionSettings />

        {/* Auto-Payout Settings */}
        <AutoPayoutSettings />

        {/* Payout Method Settings */}
        <PayoutMethodSettings />

        {/* Postpaid Credit Management */}
        <AdminPostpaidSettings />

        {/* Postpaid Analytics */}
        <PostpaidAnalyticsDashboard />

        {/* Custom Payment Methods */}
        <CustomPaymentMethodsManager type="payment" />
        
        {/* Custom Payout Methods */}
        <CustomPaymentMethodsManager type="payout" />
        </SettingsSection>

        {/* Security & Notifications Section */}
        <SettingsSection
          title="Security & Notifications"
          description="MFA settings, history, and customization options"
          icon={<Shield className="w-5 h-5 text-red-600" />}
          isOpen={sectionStates.security}
          onOpenChange={(open) => setSectionStates(prev => ({ ...prev, security: open }))}
          searchQuery={searchQuery}
          sectionKeywords={['security', 'mfa', 'authentication', 'history', 'video', 'faq', 'storefront', 'sound', 'quick reply', 'names']}
          showResetButton={true}
          onResetToDefaults={handleResetSecurity}
          gridColumns={gridColumns}
        >
          {/* Security - MFA Settings */}
          <MFASettings />

          {/* Work Type Settings */}
          <WorkTypeSettings />

          {/* Work Type Category Settings */}
          <WorkTypeCategorySettings />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Chat Reassignment</CardTitle>
                  <CardDescription>
                    Configure automatic chat reassignment rules and notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChatReassignmentSettings />
            </CardContent>
          </Card>

          {/* Settings Change History */}
          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <History className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Settings Change History</CardTitle>
                <CardDescription>
                  Recent modifications to platform settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : settingsLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No settings changes recorded yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {settingsLogs.map((log) => {
                    const settingKey = log.new_value ? Object.keys(log.new_value)[0] : 'unknown';
                    const newValue = log.new_value ? Object.values(log.new_value)[0] : null;
                    const oldValue = log.old_value ? Object.values(log.old_value)[0] : null;
                    
                    // Format display values
                    const formatValue = (val: any) => {
                      if (val === null || val === undefined) return 'N/A';
                      if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
                      if (val === 'true') return 'Enabled';
                      if (val === 'false') return 'Disabled';
                      if (String(val).length > 30) return String(val).substring(0, 30) + '...';
                      return String(val);
                    };

                    // Format setting key for display
                    const formatSettingKey = (key: string) => {
                      return key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return (
                      <div 
                        key={log.id} 
                        className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono">
                                {formatSettingKey(settingKey)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-sm">
                              {oldValue !== null && (
                                <>
                                  <span className="text-muted-foreground line-through">
                                    {formatValue(oldValue)}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              )}
                              <span className="font-medium text-foreground">
                                {formatValue(newValue)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(log.created_at).toLocaleTimeString()}
                            </div>
                            {log.admin_email && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                                {log.admin_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Video Settings */}
        <VideoSettings />

        {/* FAQ Settings */}
        <FAQSettings />

        {/* Video Tutorials Settings */}
        <VideoTutorialsSettings />

        {/* Storefront Settings */}
        <StorefrontSettings />

        {/* Payment Icon Settings */}
        <PaymentIconSettings />

        {/* Commission Preview */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Commission Preview</CardTitle>
            <CardDescription>
              Example calculation based on current settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Example Order:</span>
                <span>1 unit @ {CURRENCY_SYMBOLS[defaultCurrency]}100 (base: {CURRENCY_SYMBOLS[defaultCurrency]}70)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span>{CURRENCY_SYMBOLS[defaultCurrency]}30.00</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Dropshipper Commission:</span>
                <span className="font-semibold text-emerald-600">
                  {commissionType === 'percentage' 
                    ? `${CURRENCY_SYMBOLS[defaultCurrency]}${((30 * parseFloat(commissionRate || '0')) / 100).toFixed(2)}`
                    : `${CURRENCY_SYMBOLS[defaultCurrency]}${(parseFloat(commissionRate || '0')).toFixed(2)}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Message Settings */}
        <DashboardMessageSettings />

        {/* Popup Message Settings */}
        <PopupMessageSettings />

        {/* Pending Payment Block Settings */}
        <PendingPaymentBlockSettings />

        {/* Notification Sound Settings */}
        <NotificationSoundSettings />

        {/* Quick Reply Templates */}
        <QuickReplySettings />

        {/* Chat Messages */}
        <ChatSettings />

        {/* Indian Names Pool */}
        <IndianNamesSettings />
        
        {/* System Health Dashboard */}
        <SystemHealthDashboard />
        
        {/* Deployment Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Deployment Verification
            </CardTitle>
            <CardDescription>
              Use this checklist after deploying to verify all features are working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeploymentChecklist />
          </CardContent>
        </Card>
        
        {/* Project Export */}
        <ProjectExport />
        
        {/* Self-Host Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Self-Host Setup
            </CardTitle>
            <CardDescription>
              Configure Supabase credentials for self-hosted deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the self-host setup wizard to easily configure your Supabase connection, 
                generate .env files, and get CLI commands for deployment.
              </p>
              <Button asChild>
                <a href="/self-host-setup" target="_blank" rel="noopener noreferrer">
                  <Server className="w-4 h-4 mr-2" />
                  Open Setup Wizard
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        </SettingsSection>

        {/* Media Library Section */}
        <SettingsSection
          title="Media Library"
          description="Upload and manage images, videos, and other media files"
          icon={<ImageIcon className="w-5 h-5 text-primary" />}
          isOpen={sectionStates.media}
          onOpenChange={(open) => setSectionStates(prev => ({ ...prev, media: open }))}
          searchQuery={searchQuery}
          sectionKeywords={['media', 'images', 'videos', 'upload', 'files', 'banners', 'products', 'announcements', 'assets']}
          gridColumns={1}
        >
          <AdminMediaLibrary />
        </SettingsSection>
        
        {/* No Results Message */}
        {searchQuery && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No settings found matching "{searchQuery}"</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear search
            </Button>
          </div>
        )}
        
      </div>
      
      {/* Floating Save All Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <Button
            onClick={() => setShowSaveAllConfirm(true)}
            disabled={isSavingAll}
            size="lg"
            className="shadow-lg gap-2 pr-5"
          >
            {isSavingAll ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save All Changes
            <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground">
              {[hasGeneralChanges, hasCommissionChanges, hasWalletChanges].filter(Boolean).length}
            </Badge>
          </Button>
        </div>
      )}

      {/* Save All Confirmation Dialog */}
      <AlertDialog open={showSaveAllConfirm} onOpenChange={setShowSaveAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save all changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save changes in {[hasGeneralChanges, hasCommissionChanges, hasWalletChanges].filter(Boolean).length} section(s):
              <ul className="mt-2 space-y-1 list-disc list-inside text-foreground">
                {hasGeneralChanges && <li>General Settings</li>}
                {hasCommissionChanges && <li>Commission & Pricing</li>}
                {hasWalletChanges && <li>Wallet & Payouts</li>}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAll}>
              Save All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminSettings;
