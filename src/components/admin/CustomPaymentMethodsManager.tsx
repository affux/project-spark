import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Wallet, Edit, Trash2, Loader2, Upload, X, Image as ImageIcon, CreditCard } from 'lucide-react';
import { useCustomPaymentMethods, CustomPaymentMethod, CreatePaymentMethodInput } from '@/hooks/useCustomPaymentMethods';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomPaymentMethodsManagerProps {
  type: 'payment' | 'payout';
  className?: string;
}

export const CustomPaymentMethodsManager: React.FC<CustomPaymentMethodsManagerProps> = ({ type, className }) => {
  const { toast } = useToast();
  const { methods, isLoading, createMethod, updateMethod, deleteMethod, toggleMethod, isCreating, isUpdating } = useCustomPaymentMethods(type);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<CustomPaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_url: '',
    custom_message: '',
    method_type: type as 'payment' | 'payout',
    is_enabled: true,
  });
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon_url: '',
      custom_message: '',
      method_type: type,
      is_enabled: true,
    });
    setEditingMethod(null);
  };

  const handleOpenDialog = (method?: CustomPaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        description: method.description || '',
        icon_url: method.icon_url || '',
        custom_message: method.custom_message || '',
        method_type: type,
        is_enabled: method.is_enabled,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingIcon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-method-${Date.now()}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, icon_url: publicUrl }));
      toast({ title: 'Icon Uploaded' });
    } catch (error) {
      console.error('Icon upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload icon.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the payment method.',
        variant: 'destructive',
      });
      return;
    }

    if (editingMethod) {
      updateMethod({
        id: editingMethod.id,
        name: formData.name,
        description: formData.description,
        icon_url: formData.icon_url,
        custom_message: formData.custom_message,
        is_enabled: formData.is_enabled,
      });
    } else {
      createMethod({
        name: formData.name,
        description: formData.description,
        icon_url: formData.icon_url,
        custom_message: formData.custom_message,
        method_type: formData.method_type,
        is_enabled: formData.is_enabled,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteMethod(id);
  };

  const title = type === 'payment' ? 'Custom Payment Methods' : 'Custom Payout Methods';
  const description = type === 'payment' 
    ? 'Add and manage custom payment methods for users'
    : 'Add and manage custom payout methods for users';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
                </DialogTitle>
                <DialogDescription>
                  {editingMethod 
                    ? 'Update the payment method details below.'
                    : 'Create a new payment method for your platform.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Method Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., PayPal, Stripe, Bitcoin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this payment method"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                      {formData.icon_url ? (
                        <img
                          src={formData.icon_url}
                          alt="Method Icon"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Wallet className="w-6 h-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingIcon}
                        size="sm"
                        className="w-full"
                      >
                        {isUploadingIcon ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
                      </Button>
                      {formData.icon_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, icon_url: '' }))}
                          className="w-full text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_message">Custom Message</Label>
                  <Textarea
                    id="custom_message"
                    value={formData.custom_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_message: e.target.value }))}
                    placeholder="Instructions shown when this method is selected"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_enabled">Enabled</Label>
                  <Switch
                    id="is_enabled"
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isCreating || isUpdating}
                  className="gap-2"
                >
                  {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMethod ? 'Update Method' : 'Add Method'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : methods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No custom {type} methods added yet.</p>
            <p className="text-sm">Click "Add Method" to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center overflow-hidden">
                    {method.icon_url ? (
                      <img
                        src={method.icon_url}
                        alt={method.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{method.name}</p>
                      <Badge variant={method.is_enabled ? 'default' : 'secondary'} className="text-xs">
                        {method.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    {method.description && (
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={method.is_enabled}
                    onCheckedChange={(checked) => toggleMethod({ id: method.id, is_enabled: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(method)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment Method?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{method.name}" from your platform.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(method.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
