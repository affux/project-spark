import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wand2, 
  Settings, 
  Palette, 
  Mail, 
  Wallet, 
  Store,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
  Upload,
  Globe,
  Shield,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformSettings, CURRENCY_SYMBOLS } from "@/hooks/usePlatformSettings";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: WizardStep[] = [
  { id: "branding", title: "Branding", description: "Set your platform name and logo", icon: <Store className="h-5 w-5" /> },
  { id: "general", title: "General Settings", description: "Configure basic platform settings", icon: <Settings className="h-5 w-5" /> },
  { id: "commission", title: "Commission", description: "Set up dropshipper commission rates", icon: <Wallet className="h-5 w-5" /> },
  { id: "email", title: "Email Setup", description: "Configure email notifications", icon: <Mail className="h-5 w-5" /> },
  { id: "security", title: "Security", description: "Review security settings", icon: <Shield className="h-5 w-5" /> },
  { id: "complete", title: "Complete", description: "Review and finish setup", icon: <Check className="h-5 w-5" /> },
];

const AdminSetupWizard = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { settingsMap, updateSettingAsync } = usePlatformSettings();
  
  // Form state
  const [formData, setFormData] = useState({
    // Branding
    siteName: "DropShip",
    siteLogoUrl: "",
    userHubName: "Dropshipper Hub",
    footerText: "© {year} {site_name}. All rights reserved.",
    
    // General
    defaultCurrency: "INR",
    autoUserApproval: false,
    landingPageEnabled: true,
    
    // Commission
    commissionType: "percentage",
    commissionRate: "100",
    minPayoutAmount: "500",
    autoCreditOnComplete: true,
    
    // Email
    senderEmail: "noreply@yourdomain.com",
    adminEmail: "",
    emailNotificationsEnabled: false,
    
    // Security
    mfaEnabled: false,
  });

  // Load existing settings
  useEffect(() => {
    if (settingsMap) {
      setFormData(prev => ({
        ...prev,
        siteName: settingsMap.site_name || "DropShip",
        siteLogoUrl: settingsMap.site_logo_url || "",
        userHubName: settingsMap.user_hub_name || "Dropshipper Hub",
        footerText: settingsMap.footer_text || "© {year} {site_name}. All rights reserved.",
        defaultCurrency: settingsMap.default_currency || "INR",
        autoUserApproval: settingsMap.auto_user_approval || false,
        landingPageEnabled: settingsMap.landing_page_enabled !== false,
        commissionType: settingsMap.commission_type || "percentage",
        commissionRate: settingsMap.commission_rate?.toString() || "100",
        minPayoutAmount: settingsMap.min_payout_amount?.toString() || "500",
        autoCreditOnComplete: settingsMap.auto_credit_on_complete !== false,
        senderEmail: settingsMap.sender_email || "noreply@yourdomain.com",
        adminEmail: settingsMap.admin_email || "",
        emailNotificationsEnabled: settingsMap.email_notifications_enabled || false,
      }));
    }
  }, [settingsMap]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Save all settings
      const settingsToSave = [
        { key: "site_name", value: formData.siteName },
        { key: "site_logo_url", value: formData.siteLogoUrl },
        { key: "user_hub_name", value: formData.userHubName },
        { key: "footer_text", value: formData.footerText },
        { key: "default_currency", value: formData.defaultCurrency },
        { key: "auto_user_approval", value: formData.autoUserApproval.toString() },
        { key: "landing_page_enabled", value: formData.landingPageEnabled.toString() },
        { key: "commission_type", value: formData.commissionType },
        { key: "commission_rate", value: formData.commissionRate },
        { key: "min_payout_amount", value: formData.minPayoutAmount },
        { key: "auto_credit_on_complete", value: formData.autoCreditOnComplete.toString() },
        { key: "sender_email", value: formData.senderEmail },
        { key: "admin_email", value: formData.adminEmail },
        { key: "email_notifications_enabled", value: formData.emailNotificationsEnabled.toString() },
      ];

      for (const setting of settingsToSave) {
        await updateSettingAsync({ key: setting.key, value: setting.value });
      }

      // Mark setup as complete
      await updateSettingAsync({ key: "setup_completed", value: "true" });

      toast.success("Platform setup completed successfully!");
      setOpen(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be smaller than 2MB");
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("branding")
        .getPublicUrl(fileName);

      updateField("siteLogoUrl", publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    }
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    switch (step.id) {
      case "branding":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input
                value={formData.siteName}
                onChange={(e) => updateField("siteName", e.target.value)}
                placeholder="Enter your platform name"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {formData.siteLogoUrl ? (
                  <img 
                    src={formData.siteLogoUrl} 
                    alt="Logo" 
                    className="h-16 w-16 object-contain rounded-lg border bg-background"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <Store className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>User Hub Name</Label>
              <Input
                value={formData.userHubName}
                onChange={(e) => updateField("userHubName", e.target.value)}
                placeholder="e.g., Dropshipper Hub, Seller Center"
              />
              <p className="text-xs text-muted-foreground">Shown in the user dashboard header</p>
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea
                value={formData.footerText}
                onChange={(e) => updateField("footerText", e.target.value)}
                placeholder="© {year} {site_name}. All rights reserved."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Use {"{year}"} and {"{site_name}"} as placeholders</p>
            </div>
          </div>
        );

      case "general":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={formData.defaultCurrency}
                onValueChange={(value) => updateField("defaultCurrency", value)}
              >
                <SelectTrigger>
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
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Auto-Approve New Users</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve users upon registration
                </p>
              </div>
              <Switch
                checked={formData.autoUserApproval}
                onCheckedChange={(checked) => updateField("autoUserApproval", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Enable Landing Page</Label>
                <p className="text-sm text-muted-foreground">
                  Show public landing page at root URL
                </p>
              </div>
              <Switch
                checked={formData.landingPageEnabled}
                onCheckedChange={(checked) => updateField("landingPageEnabled", checked)}
              />
            </div>
          </div>
        );

      case "commission":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commission Type</Label>
              <Select
                value={formData.commissionType}
                onValueChange={(value) => updateField("commissionType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage of Profit</SelectItem>
                  <SelectItem value="fixed">Fixed Amount per Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Commission Rate {formData.commissionType === "percentage" ? "(%)" : `(${CURRENCY_SYMBOLS[formData.defaultCurrency]})`}
              </Label>
              <Input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => updateField("commissionRate", e.target.value)}
                min="0"
                max={formData.commissionType === "percentage" ? "100" : undefined}
              />
              {formData.commissionType === "percentage" && (
                <p className="text-xs text-muted-foreground">
                  100% means dropshippers keep all profit margin
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Minimum Payout Amount ({CURRENCY_SYMBOLS[formData.defaultCurrency]})</Label>
              <Input
                type="number"
                value={formData.minPayoutAmount}
                onChange={(e) => updateField("minPayoutAmount", e.target.value)}
                min="0"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Auto-Credit on Order Complete</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically credit wallet when orders complete
                </p>
              </div>
              <Switch
                checked={formData.autoCreditOnComplete}
                onCheckedChange={(checked) => updateField("autoCreditOnComplete", checked)}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Commission Preview</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Value:</span>
                  <span>{CURRENCY_SYMBOLS[formData.defaultCurrency]}100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Price:</span>
                  <span>{CURRENCY_SYMBOLS[formData.defaultCurrency]}70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <span>{CURRENCY_SYMBOLS[formData.defaultCurrency]}30</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1 mt-1">
                  <span>Dropshipper Earns:</span>
                  <span className="text-emerald-600">
                    {formData.commissionType === "percentage"
                      ? `${CURRENCY_SYMBOLS[formData.defaultCurrency]}${((30 * parseFloat(formData.commissionRate || "0")) / 100).toFixed(2)}`
                      : `${CURRENCY_SYMBOLS[formData.defaultCurrency]}${parseFloat(formData.commissionRate || "0").toFixed(2)}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> You need a Resend API key to send emails. 
                Configure it in Settings → Email after completing this wizard.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sender Email Address</Label>
              <Input
                type="email"
                value={formData.senderEmail}
                onChange={(e) => updateField("senderEmail", e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Must be from a verified domain in Resend
              </p>
            </div>

            <div className="space-y-2">
              <Label>Admin Notification Email</Label>
              <Input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => updateField("adminEmail", e.target.value)}
                placeholder="admin@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Receives important platform notifications
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send emails for orders, payouts, etc.
                </p>
              </div>
              <Switch
                checked={formData.emailNotificationsEnabled}
                onCheckedChange={(checked) => updateField("emailNotificationsEnabled", checked)}
              />
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Security Features Enabled
              </h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Row Level Security (RLS) on all tables
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Customer data masking for dropshippers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Protected profile fields (wallet, status)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  IP logging for login activity
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Secure file uploads with validation
                </li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Additional Security Options</h4>
              <p className="text-sm text-muted-foreground mb-3">
                These can be configured in Settings after setup:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Email MFA (Two-Factor Authentication)</li>
                <li>• Trusted Device Management</li>
                <li>• Force Logout capability</li>
                <li>• Chat reassignment settings</li>
              </ul>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Launch!</h3>
              <p className="text-muted-foreground">
                Review your settings below and click Complete to finish setup.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Platform Name:</span>
                <p className="font-medium">{formData.siteName}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Currency:</span>
                <p className="font-medium">{CURRENCY_SYMBOLS[formData.defaultCurrency]} {formData.defaultCurrency}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Commission:</span>
                <p className="font-medium">
                  {formData.commissionRate}{formData.commissionType === "percentage" ? "%" : ` ${formData.defaultCurrency}`}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Min Payout:</span>
                <p className="font-medium">{CURRENCY_SYMBOLS[formData.defaultCurrency]}{formData.minPayoutAmount}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Auto-Approve:</span>
                <p className="font-medium">{formData.autoUserApproval ? "Yes" : "No"}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Email Notifications:</span>
                <p className="font-medium">{formData.emailNotificationsEnabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Setup Wizard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Platform Setup Wizard
          </DialogTitle>
          <DialogDescription>
            Configure your platform step by step
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1 min-w-[60px] ${
                index === currentStep
                  ? "text-primary"
                  : index < currentStep
                  ? "text-green-500"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-muted"
                }`}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className="text-xs text-center hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {STEPS[currentStep].icon}
              {STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSetupWizard;
