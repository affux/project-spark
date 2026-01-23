import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileJson, 
  Database, 
  Users, 
  Settings, 
  ShoppingCart,
  FileText,
  Loader2,
  CheckCircle2,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  table?: string;
}

const ProjectExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [options, setOptions] = useState<ExportOption[]>([
    { id: "platform_settings", label: "Platform Settings", description: "All configuration settings", icon: <Settings className="h-4 w-4" />, enabled: true, table: "platform_settings" },
    { id: "products", label: "Products", description: "Product catalog data", icon: <Package className="h-4 w-4" />, enabled: true, table: "products" },
    { id: "users", label: "User Profiles", description: "User account information (masked)", icon: <Users className="h-4 w-4" />, enabled: true, table: "profiles" },
    { id: "orders", label: "Orders", description: "Order history (masked customer data)", icon: <ShoppingCart className="h-4 w-4" />, enabled: true, table: "orders" },
    { id: "indian_names", label: "Name Pool", description: "Chat anonymization names", icon: <FileText className="h-4 w-4" />, enabled: true, table: "indian_names" },
    { id: "work_types", label: "Work Types", description: "Proof of work categories", icon: <FileText className="h-4 w-4" />, enabled: true, table: "work_types" },
    { id: "quick_replies", label: "Quick Replies", description: "Chat quick reply templates", icon: <FileText className="h-4 w-4" />, enabled: true, table: "order_chat_quick_replies" },
    { id: "custom_payments", label: "Payment Methods", description: "Custom payment methods", icon: <FileJson className="h-4 w-4" />, enabled: true, table: "custom_payment_methods" },
  ]);

  const toggleOption = (id: string) => {
    setOptions(prev => prev.map(opt => 
      opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
    ));
  };

  const selectAll = () => {
    setOptions(prev => prev.map(opt => ({ ...opt, enabled: true })));
  };

  const deselectAll = () => {
    setOptions(prev => prev.map(opt => ({ ...opt, enabled: false })));
  };

  const maskEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (!domain) return "***@***.***";
    return `${local.slice(0, 2)}***@${domain}`;
  };

  const maskPhone = (phone: string | null): string => {
    if (!phone) return "";
    return `***-***-${phone.slice(-4)}`;
  };

  const handleExport = async () => {
    const enabledOptions = options.filter(opt => opt.enabled);
    if (enabledOptions.length === 0) {
      toast.error("Please select at least one item to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const dataFolder = zip.folder("data");
      const totalSteps = enabledOptions.length;
      let completedSteps = 0;

      // Add README
      const readme = `# Project Data Export
Generated: ${new Date().toISOString()}

## Contents
${enabledOptions.map(opt => `- ${opt.label}: ${opt.description}`).join("\n")}

## Import Instructions
1. Go to Supabase SQL Editor
2. Use the INSERT statements in each .sql file
3. Or import JSON files programmatically

## Notes
- User emails and phone numbers are masked for privacy
- Customer data in orders is masked
- Adjust IDs if importing to a fresh database
`;
      zip.file("README.md", readme);

      for (const option of enabledOptions) {
        setCurrentStep(`Exporting ${option.label}...`);

        try {
          const { data, error } = await supabase
            .from(option.table as any)
            .select("*");

          if (error) {
            console.error(`Error exporting ${option.table}:`, error);
            continue;
          }

          let exportData = data || [];

          // Mask sensitive data
          if (option.id === "users" && exportData.length > 0) {
            exportData = exportData.map((user: any) => ({
              ...user,
              email: maskEmail(user.email || ""),
              name: `User_${user.id?.slice(0, 8) || "unknown"}`,
              last_ip_address: null,
            }));
          }

          if (option.id === "orders" && exportData.length > 0) {
            exportData = exportData.map((order: any) => ({
              ...order,
              customer_name: "Customer ***",
              customer_email: maskEmail(order.customer_email || ""),
              customer_phone: maskPhone(order.customer_phone),
              customer_address: "[Address Redacted]",
            }));
          }

          // Save as JSON
          dataFolder?.file(`${option.id}.json`, JSON.stringify(exportData, null, 2));

          // Generate SQL INSERT statements
          if (exportData.length > 0) {
            const columns = Object.keys(exportData[0]);
            const sqlStatements = exportData.map((row: any) => {
              const values = columns.map(col => {
                const val = row[col];
                if (val === null) return "NULL";
                if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
                if (typeof val === "number") return val;
                if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return `'${String(val).replace(/'/g, "''")}'`;
              });
              return `INSERT INTO ${option.table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`;
            });

            dataFolder?.file(`${option.id}.sql`, sqlStatements.join("\n\n"));
          }

        } catch (err) {
          console.error(`Failed to export ${option.id}:`, err);
        }

        completedSteps++;
        setExportProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Add schema reference
      zip.file("schema_reference.md", `# Database Schema Reference

Refer to DATABASE_SCHEMA.sql in the project root for the complete schema.

## Quick Reference

### Core Tables
- profiles: User account data
- user_roles: Role assignments
- products: Product catalog
- storefront_products: User product listings
- orders: Customer orders

### Settings
- platform_settings: Configuration
- custom_payment_methods: Payment options
- work_types: Work categories
- indian_names: Anonymization pool

### Communication
- chat_messages: Support chat
- order_chat_messages: Order-specific chat
- order_chat_quick_replies: Quick reply templates
- user_notifications: In-app notifications
`);

      setCurrentStep("Generating ZIP file...");
      const blob = await zip.generateAsync({ type: "blob" });
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentStep("");
    }
  };

  const enabledCount = options.filter(opt => opt.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Project Data Export
            </CardTitle>
            <CardDescription>
              Export platform data as JSON and SQL files for backup or migration
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {enabledCount} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option) => (
            <div
              key={option.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                option.enabled ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-accent/50"
              }`}
              onClick={() => toggleOption(option.id)}
            >
              <Checkbox
                checked={option.enabled}
                onCheckedChange={() => toggleOption(option.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${option.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {option.icon}
                  </div>
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {isExporting && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentStep}</span>
              <span className="font-medium">{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}

        <Button 
          onClick={handleExport} 
          disabled={isExporting || enabledCount === 0}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Selected Data
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Exports include both JSON (for programmatic use) and SQL (for database import) formats.
          Sensitive data like emails and addresses are automatically masked.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProjectExport;
