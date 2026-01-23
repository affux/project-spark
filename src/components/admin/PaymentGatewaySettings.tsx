import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  CreditCard, 
  Loader2, 
  Save, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle
} from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schemas
const apiKeySchema = z.string().min(10, 'API key must be at least 10 characters');
const accountNumberSchema = z.string().regex(/^[0-9A-Za-z]{8,34}$/, 'Account number must be 8-34 alphanumeric characters');
const routingNumberSchema = z.string().regex(/^[A-Z0-9]{6,11}$/i, 'Routing/SWIFT must be 6-11 alphanumeric characters');
const ibanSchema = z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i, 'Invalid IBAN format').or(z.string().length(0));

interface ValidationErrors {
  [key: string]: string;
}

interface GatewayConfig {
  id: string;
  name: string;
  enabledKey: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    isSecret: boolean;
  }[];
}

const PAYMENT_GATEWAYS: GatewayConfig[] = [
  {
    id: 'paypal',
    name: 'PayPal',
    enabledKey: 'payment_gateway_paypal_enabled',
    fields: [
      { key: 'payment_gateway_paypal_client_id', label: 'Client ID', placeholder: 'AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX', isSecret: false },
      { key: 'payment_gateway_paypal_client_secret', label: 'Client Secret', placeholder: 'ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX', isSecret: true },
      { key: 'payment_gateway_paypal_mode', label: 'Mode (sandbox/live)', placeholder: 'live', isSecret: false },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    enabledKey: 'payment_gateway_stripe_enabled',
    fields: [
      { key: 'payment_gateway_stripe_publishable_key', label: 'Publishable Key', placeholder: 'pk_live_xxxxxxxxx', isSecret: false },
      { key: 'payment_gateway_stripe_secret_key', label: 'Secret Key', placeholder: 'sk_live_xxxxxxxxx', isSecret: true },
    ],
  },
  {
    id: 'wire',
    name: 'Wire Transfer',
    enabledKey: 'payment_gateway_wire_enabled',
    fields: [
      { key: 'payment_gateway_wire_bank_name', label: 'Bank Name', placeholder: 'Bank of America', isSecret: false },
      { key: 'payment_gateway_wire_account_name', label: 'Account Holder Name', placeholder: 'Company Name LLC', isSecret: false },
      { key: 'payment_gateway_wire_account_number', label: 'Account Number', placeholder: 'XXXXXXXXXXXX', isSecret: true },
      { key: 'payment_gateway_wire_routing_number', label: 'Routing Number / SWIFT', placeholder: 'XXXXXXXXX', isSecret: false },
      { key: 'payment_gateway_wire_iban', label: 'IBAN (International)', placeholder: 'XX00 XXXX XXXX XXXX XXXX XX', isSecret: false },
    ],
  },
];

export const PaymentGatewaySettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  
  const [gatewayValues, setGatewayValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [savingGateway, setSavingGateway] = useState<string | null>(null);
  const [savedGateways, setSavedGateways] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Validate a field based on its key
  const validateField = (key: string, value: string): string | null => {
    if (!value || value.trim() === '') return null; // Empty values are ok (optional)
    
    try {
      if (key.includes('client_id') || key.includes('client_secret') || key.includes('secret_key') || key.includes('publishable_key')) {
        apiKeySchema.parse(value);
      } else if (key.includes('account_number')) {
        accountNumberSchema.parse(value);
      } else if (key.includes('routing_number')) {
        routingNumberSchema.parse(value);
      } else if (key.includes('iban')) {
        ibanSchema.parse(value);
      }
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || 'Invalid format';
      }
      return 'Invalid format';
    }
  };

  // Initialize gateway values from settings
  useEffect(() => {
    const values: Record<string, string> = {};
    const saved: Record<string, boolean> = {};
    
    PAYMENT_GATEWAYS.forEach(gateway => {
      const enabledKey = gateway.enabledKey as keyof typeof settingsMap;
      const enabledValue = settingsMap[enabledKey];
      values[gateway.enabledKey] = String(enabledValue === true || enabledValue === 'true');
      
      gateway.fields.forEach(field => {
        const fieldKey = field.key as keyof typeof settingsMap;
        const fieldValue = settingsMap[fieldKey];
        values[field.key] = String(fieldValue || '');
      });

      // Check if gateway has been configured
      const hasValues = gateway.fields.some(field => {
        const fieldKey = field.key as keyof typeof settingsMap;
        const fieldValue = settingsMap[fieldKey];
        return fieldValue && String(fieldValue).length > 0;
      });
      saved[gateway.id] = hasValues;
    });
    
    setGatewayValues(values);
    setSavedGateways(saved);
  }, [settingsMap]);

  const handleValueChange = (key: string, value: string) => {
    setGatewayValues(prev => ({ ...prev, [key]: value }));
    
    // Validate on change
    const error = validateField(key, value);
    setValidationErrors(prev => {
      if (error) {
        return { ...prev, [key]: error };
      }
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleToggleEnabled = async (gateway: GatewayConfig, enabled: boolean) => {
    handleValueChange(gateway.enabledKey, String(enabled));
    try {
      await updateSetting({ key: gateway.enabledKey, value: String(enabled) });
    } catch (error) {
      console.error('Error updating gateway enabled status:', error);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveGateway = async (gateway: GatewayConfig) => {
    setSavingGateway(gateway.id);
    
    // Validate all fields before saving
    let hasErrors = false;
    const newErrors: ValidationErrors = {};
    
    gateway.fields.forEach(field => {
      const value = gatewayValues[field.key] || '';
      const error = validateField(field.key, value);
      if (error) {
        hasErrors = true;
        newErrors[field.key] = error;
      }
    });
    
    if (hasErrors) {
      setValidationErrors(prev => ({ ...prev, ...newErrors }));
      toast({
        title: 'Validation Error',
        description: 'Please fix the validation errors before saving.',
        variant: 'destructive',
      });
      setSavingGateway(null);
      return;
    }

    try {
      const updates = [
        updateSetting({ key: gateway.enabledKey, value: gatewayValues[gateway.enabledKey] }),
        ...gateway.fields.map(field => 
          updateSetting({ key: field.key, value: gatewayValues[field.key] || '' })
        ),
      ];
      
      await Promise.all(updates);
      
      setSavedGateways(prev => ({ ...prev, [gateway.id]: true }));
      toast({
        title: `${gateway.name} Settings Saved`,
        description: `Your ${gateway.name} payment gateway settings have been saved.`,
      });
    } catch (error) {
      console.error('Error saving gateway settings:', error);
      toast({
        title: 'Error',
        description: `Failed to save ${gateway.name} settings.`,
        variant: 'destructive',
      });
    } finally {
      setSavingGateway(null);
    }
  };

  const isGatewayEnabled = (gateway: GatewayConfig) => {
    return gatewayValues[gateway.enabledKey] === 'true';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle>Payment Gateways</CardTitle>
            <CardDescription>
              Configure payment gateway integrations. Add your API keys to enable payments.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {PAYMENT_GATEWAYS.map((gateway) => (
            <AccordionItem key={gateway.id} value={gateway.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{gateway.name}</span>
                    {savedGateways[gateway.id] && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Configured
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isGatewayEnabled(gateway)}
                      onCheckedChange={(checked) => handleToggleEnabled(gateway, checked)}
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {gateway.fields.map((field) => (
                    <div key={field.key} className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        {field.label}
                        {validationErrors[field.key] && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors[field.key]}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type={field.isSecret && !visibleSecrets[field.key] ? 'password' : 'text'}
                          value={gatewayValues[field.key] || ''}
                          onChange={(e) => handleValueChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={`${field.isSecret ? 'pr-10' : ''} ${validationErrors[field.key] ? 'border-destructive' : ''}`}
                        />
                        {field.isSecret && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => toggleSecretVisibility(field.key)}
                          >
                            {visibleSecrets[field.key] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => handleSaveGateway(gateway)}
                    disabled={savingGateway === gateway.id || isUpdating}
                    className="w-full mt-2"
                  >
                    {savingGateway === gateway.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save {gateway.name} Settings
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-4 bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">Notes:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>API keys are stored securely in the database</li>
            <li>Enable a gateway using the toggle, then add your credentials</li>
            <li>Make sure to use production/live keys for real transactions</li>
            <li>Test mode keys can be used for development</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
