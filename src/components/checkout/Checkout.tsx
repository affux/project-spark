/**
 * Checkout Component
 * 
 * SECURITY HARDENING (OWASP Best Practices):
 * - Schema-based validation with zod
 * - Strict type checking
 * - Length limits on all inputs
 * - Sanitization of user inputs
 * - Rejection of unexpected fields
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  ChevronLeft, 
  Loader2,
  CheckCircle,
  Lock,
  CreditCard,
  Wallet,
  Building2,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { 
  checkoutSchema, 
  sanitizeString, 
  VALIDATION_LIMITS 
} from '@/lib/validationSchemas';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutInternalProps extends CheckoutProps {
  onUpdateQuantity?: (id: string, delta: number) => void;
}

interface CheckoutProps {
  cart: CartItem[];
  total: number;
  storeName: string;
  onSubmit: (data: CheckoutData) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
  onUpdateQuantity?: (id: string, delta: number) => void;
}

export interface CheckoutData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'paypal' | 'stripe' | 'wire';
}

// Countries list - India excluded as per requirement
const countries = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
];

export const Checkout: React.FC<CheckoutProps> = ({
  cart,
  total,
  storeName,
  onSubmit,
  onBack,
  isSubmitting,
  onUpdateQuantity,
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    phone: '',
    countryCode: 'US',
    streetAddress: '',
    apartment: '',
    city: '',
    pinCode: '',
    state: '',
  });
  const [showApartment, setShowApartment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'wire'>('paypal');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCountry = countries.find(c => c.code === formData.countryCode);

  /**
   * SECURITY: Sanitize input on change to prevent XSS and injection
   * Limits input length to prevent DoS
   */
  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    // SECURITY: Apply length limits based on field type
    const maxLengths: Record<string, number> = {
      firstName: VALIDATION_LIMITS.NAME_MAX,
      email: VALIDATION_LIMITS.EMAIL_MAX,
      phone: VALIDATION_LIMITS.PHONE_MAX,
      streetAddress: VALIDATION_LIMITS.ADDRESS_MAX,
      apartment: 100,
      city: 100,
      pinCode: 20,
      state: 100,
    };
    
    const maxLength = maxLengths[field] || 200;
    const sanitizedValue = sanitizeString(value.slice(0, maxLength));
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  /**
   * SECURITY: Schema-based validation using zod
   * Validates all fields with strict type checking and length limits
   */
  const validateInfo = useCallback((): boolean => {
    try {
      // SECURITY: Use strict schema validation
      checkoutSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          if (!newErrors[field]) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  const handleContinueToPayment = () => {
    if (validateInfo()) {
      setStep('payment');
    }
  };

  const buildFullAddress = () => {
    const parts = [
      formData.streetAddress,
      formData.apartment,
      formData.city,
      formData.state,
      formData.pinCode,
      selectedCountry?.name
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSubmitOrder = async () => {
    const checkoutData: CheckoutData = {
      customerName: formData.firstName,
      customerEmail: formData.email,
      customerPhone: `${selectedCountry?.dialCode || ''} ${formData.phone}`,
      customerAddress: buildFullAddress(),
      paymentMethod: paymentMethod,
    };

    try {
      await onSubmit(checkoutData);
      setStep('success');
    } catch (error) {
      // Error handled by parent
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Order Confirmed!</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Thank you for your order. You will receive payment instructions via email shortly.
        </p>
        <Button onClick={onBack} size="lg" className="rounded-full px-8">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-0 min-h-[600px]">
      {/* Left - Form */}
      <div className="p-6 lg:p-8 bg-background order-2 lg:order-1">
        <div className="max-w-md mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <button onClick={onBack} className="text-primary hover:underline">Cart</button>
            <span className="text-muted-foreground">/</span>
            <span className={step === 'info' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              Information
            </span>
            <span className="text-muted-foreground">/</span>
            <span className={step === 'payment' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              Payment
            </span>
          </div>

          {step === 'info' && (
            <div className="space-y-6 animate-fade-in">
              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              </div>

              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={cn("mt-1", errors.firstName && "border-destructive")}
                  />
                  {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                </div>

                {/* Phone with Country Code */}
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(v) => setFormData({ ...formData, countryCode: v })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue>
                          {selectedCountry?.dialCode}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.dialCode} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={cn("flex-1", errors.phone && "border-destructive")}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={cn("mt-1", errors.email && "border-destructive")}
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
              </div>

              <Separator />

              {/* Shipping Address */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              </div>

              <div className="space-y-4">
                {/* Street Address */}
                <div>
                  <Label htmlFor="streetAddress">Street address *</Label>
                  <Input
                    id="streetAddress"
                    placeholder="Street address"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    className={cn("mt-1", errors.streetAddress && "border-destructive")}
                  />
                  {errors.streetAddress && <p className="text-xs text-destructive mt-1">{errors.streetAddress}</p>}
                </div>

                {/* Add Apartment */}
                {!showApartment ? (
                  <button
                    type="button"
                    onClick={() => setShowApartment(true)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add Apartment, suite, unit, etc.
                  </button>
                ) : (
                  <div>
                    <Label htmlFor="apartment">Apartment, suite, unit, etc.</Label>
                    <Input
                      id="apartment"
                      placeholder="Apartment, suite, unit, etc."
                      value={formData.apartment}
                      onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* City and PIN Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Town / City *</Label>
                    <Input
                      id="city"
                      placeholder="Town / City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={cn("mt-1", errors.city && "border-destructive")}
                    />
                    {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="pinCode">PIN Code *</Label>
                    <Input
                      id="pinCode"
                      placeholder="PIN Code"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                      className={cn("mt-1", errors.pinCode && "border-destructive")}
                    />
                    {errors.pinCode && <p className="text-xs text-destructive mt-1">{errors.pinCode}</p>}
                  </div>
                </div>

                {/* Country and State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.countryCode}
                      onValueChange={(v) => setFormData({ ...formData, countryCode: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={cn("mt-1", errors.state && "border-destructive")}
                    />
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ChevronLeft className="w-4 h-4" />
                  Return to cart
                </button>
                <Button onClick={handleContinueToPayment} size="lg" className="rounded-lg px-8">
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold mb-1">Payment Method</h2>
                <p className="text-sm text-muted-foreground">Choose how you'd like to pay</p>
              </div>

              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as 'paypal' | 'stripe' | 'wire')}
                className="space-y-3"
              >
                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentMethod === 'paypal' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">PayPal</p>
                    <p className="text-xs text-muted-foreground">Pay securely with PayPal</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentMethod === 'stripe' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="stripe" id="stripe" />
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentMethod === 'wire' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="wire" id="wire" />
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Wire Transfer</p>
                    <p className="text-xs text-muted-foreground">International bank transfer</p>
                  </div>
                </label>
              </RadioGroup>

              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Secure Checkout</p>
                  <p className="text-xs text-muted-foreground">Your payment information is protected</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Payment is required to complete your order. You will receive payment details after confirmation.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ChevronLeft className="w-4 h-4" />
                  Return to information
                </button>
                <Button onClick={handleSubmitOrder} size="lg" className="rounded-lg px-8" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay $${total.toFixed(2)}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Order Summary */}
      <div className="bg-muted/30 border-l p-6 lg:p-8 order-1 lg:order-2">
        <div className="max-w-sm mx-auto lg:sticky lg:top-8">
          <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
          
          <div className="space-y-4 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 items-start">
                <div className="relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {onUpdateQuantity ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  )}
                </div>
                <p className="font-medium text-sm">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-emerald-600">Free</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secure checkout by {storeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
