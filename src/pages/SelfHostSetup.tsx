import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2, 
  Database, 
  Check, 
  Copy, 
  AlertCircle, 
  ExternalLink,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  XCircle,
  Clipboard,
  Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface ConnectionStatus {
  tested: boolean;
  success: boolean;
  message: string;
}

const SelfHostSetup = () => {
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [quickImportText, setQuickImportText] = useState("");
  const [showOptionalKeys, setShowOptionalKeys] = useState(false);
  
  const [config, setConfig] = useState({
    projectUrl: "",
    anonKey: "",
    serviceRoleKey: "",
    projectId: "",
    // Optional
    resendApiKey: "",
    openaiApiKey: "",
    stripeSecretKey: "",
    stripePublishableKey: ""
  });

  const extractProjectId = (url: string) => {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : "";
  };

  const handleQuickImport = () => {
    try {
      // Try to parse as JSON first
      let parsed: any;
      const text = quickImportText.trim();
      
      // Check if it's JSON
      if (text.startsWith('{')) {
        parsed = JSON.parse(text);
      } else {
        // Try to extract from key-value format or plain text
        const urlMatch = text.match(/https:\/\/[^\s"']+\.supabase\.co/);
        const anonMatch = text.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
        
        if (urlMatch) {
          parsed = { project_url: urlMatch[0] };
          if (anonMatch && anonMatch.length >= 1) {
            parsed.anon_key = anonMatch[0];
          }
          if (anonMatch && anonMatch.length >= 2) {
            parsed.service_role_key = anonMatch[1];
          }
        } else {
          throw new Error("Could not parse input");
        }
      }
      
      const projectUrl = parsed.project_url || parsed.SUPABASE_URL || parsed.url || "";
      const anonKey = parsed.anon_key || parsed.SUPABASE_ANON_KEY || parsed.anonKey || "";
      const serviceRoleKey = parsed.service_role_key || parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.serviceRoleKey || "";
      
      setConfig(prev => ({
        ...prev,
        projectUrl,
        anonKey,
        serviceRoleKey,
        projectId: extractProjectId(projectUrl)
      }));
      
      setQuickImportText("");
      toast.success("Configuration imported successfully!");
    } catch (error) {
      toast.error("Failed to parse. Please check the format.");
    }
  };

  const handleUrlChange = (url: string) => {
    setConfig(prev => ({
      ...prev,
      projectUrl: url,
      projectId: extractProjectId(url)
    }));
  };

  const testConnection = async () => {
    if (!config.projectUrl || !config.anonKey) {
      toast.error("Please enter Supabase URL and Anon Key first");
      return;
    }

    setTesting(true);
    setConnectionStatus(null);

    try {
      const response = await fetch(`${config.projectUrl}/rest/v1/`, {
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`
        }
      });

      if (response.ok || response.status === 200) {
        setConnectionStatus({
          tested: true,
          success: true,
          message: "Connected!"
        });
        toast.success("Connection verified!");
      } else {
        setConnectionStatus({
          tested: true,
          success: false,
          message: "Failed"
        });
        toast.error("Connection failed");
      }
    } catch (error: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: "Error"
      });
      toast.error("Connection error");
    } finally {
      setTesting(false);
    }
  };

  const generateEnvFile = () => {
    return `# Supabase Configuration
VITE_SUPABASE_URL="${config.projectUrl}"
VITE_SUPABASE_PUBLISHABLE_KEY="${config.anonKey}"
VITE_SUPABASE_PROJECT_ID="${config.projectId}"

# Backend Secrets (for Edge Functions)
SUPABASE_URL="${config.projectUrl}"
SUPABASE_ANON_KEY="${config.anonKey}"
SUPABASE_SERVICE_ROLE_KEY="${config.serviceRoleKey}"
${config.resendApiKey ? `\nRESEND_API_KEY="${config.resendApiKey}"` : ''}${config.openaiApiKey ? `\nOPENAI_API_KEY="${config.openaiApiKey}"` : ''}${config.stripeSecretKey ? `\nSTRIPE_SECRET_KEY="${config.stripeSecretKey}"` : ''}${config.stripePublishableKey ? `\nVITE_STRIPE_PUBLISHABLE_KEY="${config.stripePublishableKey}"` : ''}
`;
  };

  const downloadEnvFile = () => {
    const blob = new Blob([generateEnvFile()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(".env file downloaded!");
  };

  const generateAllCommands = () => {
    const commands = [
      `# Link your project`,
      `supabase link --project-ref ${config.projectId}`,
      ``,
      `# Set secrets`,
      `supabase secrets set SUPABASE_URL="${config.projectUrl}" SUPABASE_ANON_KEY="${config.anonKey}" SUPABASE_SERVICE_ROLE_KEY="${config.serviceRoleKey}"${config.resendApiKey ? ` RESEND_API_KEY="${config.resendApiKey}"` : ''}${config.openaiApiKey ? ` OPENAI_API_KEY="${config.openaiApiKey}"` : ''}${config.stripeSecretKey ? ` STRIPE_SECRET_KEY="${config.stripeSecretKey}"` : ''}`,
      ``,
      `# Deploy functions`,
      `supabase functions deploy`
    ];
    return commands.join('\n');
  };

  const copyAllCommands = () => {
    navigator.clipboard.writeText(generateAllCommands());
    toast.success("Commands copied!");
  };

  const isConfigured = config.projectUrl && config.anonKey && config.serviceRoleKey;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Database className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Self-Host Setup</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Supabase connection in seconds
          </p>
        </div>

        {/* Quick Import */}
        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Import
            </CardTitle>
            <CardDescription className="text-xs">
              Paste your Supabase project settings JSON or API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={`Paste from Supabase Dashboard → Settings → API:

{
  "project_url": "https://xxx.supabase.co",
  "anon_key": "eyJ...",
  "service_role_key": "eyJ..."
}`}
              value={quickImportText}
              onChange={(e) => setQuickImportText(e.target.value)}
              className="min-h-[100px] text-xs font-mono"
            />
            <Button 
              onClick={handleQuickImport} 
              disabled={!quickImportText.trim()}
              className="w-full"
              size="sm"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Import Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Supabase Credentials</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Dashboard
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project URL */}
            <div className="space-y-1.5">
              <Label className="text-xs">Project URL</Label>
              <Input
                type="url"
                placeholder="https://your-project.supabase.co"
                value={config.projectUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="h-9 text-sm"
              />
              {config.projectId && (
                <p className="text-xs text-muted-foreground">
                  ID: <code className="bg-muted px-1 rounded">{config.projectId}</code>
                </p>
              )}
            </div>

            {/* Anon Key */}
            <div className="space-y-1.5">
              <Label className="text-xs">Anon Key</Label>
              <Input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={config.anonKey}
                onChange={(e) => setConfig(prev => ({ ...prev, anonKey: e.target.value }))}
                className="h-9 text-sm font-mono"
              />
            </div>

            {/* Service Role Key */}
            <div className="space-y-1.5">
              <Label className="text-xs">Service Role Key</Label>
              <div className="relative">
                <Input
                  type={showServiceKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={config.serviceRoleKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, serviceRoleKey: e.target.value }))}
                  className="h-9 text-sm font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowServiceKey(!showServiceKey)}
                >
                  {showServiceKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                Keep secret - only for edge functions
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testing || !config.projectUrl || !config.anonKey}
              >
                {testing ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Database className="w-3 h-3 mr-1.5" />
                )}
                Test
              </Button>

              {connectionStatus && (
                <span className={`text-xs flex items-center gap-1 ${connectionStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {connectionStatus.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional API Keys */}
        <Collapsible open={showOptionalKeys} onOpenChange={setShowOptionalKeys}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Optional API Keys</CardTitle>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalKeys ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Resend API Key</Label>
                    <Input
                      type="password"
                      placeholder="re_..."
                      value={config.resendApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, resendApiKey: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">OpenAI API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={config.openaiApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stripe Publishable</Label>
                    <Input
                      type="text"
                      placeholder="pk_..."
                      value={config.stripePublishableKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, stripePublishableKey: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stripe Secret</Label>
                    <Input
                      type="password"
                      placeholder="sk_..."
                      value={config.stripeSecretKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, stripeSecretKey: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Output */}
        {isConfigured && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Ready to Deploy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadEnvFile} size="sm">
                  <Download className="w-3 h-3 mr-1.5" />
                  Download .env
                </Button>
                <Button onClick={copyAllCommands} variant="outline" size="sm">
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy CLI Commands
                </Button>
              </div>

              {/* Commands Preview */}
              <div className="bg-background rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {generateAllCommands()}
                </pre>
              </div>

              {/* Next Steps */}
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                <li>Download .env → place in project root</li>
                <li>Import DATABASE_SCHEMA.sql into Supabase</li>
                <li>Run the CLI commands above</li>
                <li>Build: <code className="bg-muted px-1 rounded">npm run build</code></li>
                <li>Visit /setup to create admin</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SelfHostSetup;
