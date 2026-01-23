import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Wallet, Save, Loader2, Check, Upload, X, Plus, Trash2, Eye, Pencil, 
  Image as ImageIcon, QrCode, GripVertical 
} from 'lucide-react';
import { usePlatformSettings, CryptoWallet } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import walletIconDefault from '@/assets/wallet-icon.png';

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BUCKET = 'branding';

const generateId = () => crypto.randomUUID();

// Sortable Wallet Item Component
interface SortableWalletItemProps {
  wallet: CryptoWallet;
  onPreview: (wallet: CryptoWallet) => void;
  onEdit: (wallet: CryptoWallet) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const SortableWalletItem: React.FC<SortableWalletItemProps> = ({
  wallet,
  onPreview,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-4 transition-all",
        wallet.enabled 
          ? "border-emerald-500/30 bg-emerald-500/5" 
          : "border-border bg-muted/30 opacity-60",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center overflow-hidden shrink-0">
          {wallet.iconUrl ? (
            <img src={wallet.iconUrl} alt={wallet.name} className="w-8 h-8 object-contain" />
          ) : (
            <img src={walletIconDefault} alt="Default" className="w-8 h-8 object-contain opacity-50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{wallet.name}</h4>
            <span className="text-xs px-2 py-0.5 rounded bg-muted">
              {wallet.symbol}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono truncate">
            {wallet.address}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPreview(wallet)}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(wallet)}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(wallet.id)}
            className="text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Switch
            checked={wallet.enabled}
            onCheckedChange={() => onToggle(wallet.id)}
          />
        </div>
      </div>
    </div>
  );
};

export const CryptoWalletsSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating } = usePlatformSettings();
  const { toast } = useToast();
  
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWallet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewWallet, setPreviewWallet] = useState<CryptoWallet | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Upload states
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (settingsMap.crypto_wallets && settingsMap.crypto_wallets.length > 0) {
      setWallets(settingsMap.crypto_wallets);
    } else if (settingsMap.usd_wallet_id) {
      // Migrate legacy wallet to new format
      const legacyWallet: CryptoWallet = {
        id: generateId(),
        name: settingsMap.usd_wallet_currency_name || 'USDT TRC20',
        symbol: settingsMap.usd_wallet_currency_symbol || '$',
        address: settingsMap.usd_wallet_id,
        iconUrl: settingsMap.usd_wallet_icon_url || '',
        qrUrl: settingsMap.usd_wallet_qr_url || '',
        enabled: settingsMap.usd_wallet_enabled,
      };
      setWallets([legacyWallet]);
    }
  }, [settingsMap]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWallets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast({
        title: 'Order Changed',
        description: 'Remember to save changes.',
      });
    }
  };

  const handleAddWallet = () => {
    setEditingWallet({
      id: generateId(),
      name: '',
      symbol: '$',
      address: '',
      iconUrl: '',
      qrUrl: '',
      enabled: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditWallet = (wallet: CryptoWallet) => {
    setEditingWallet({ ...wallet });
    setIsDialogOpen(true);
  };

  const handleDeleteWallet = (id: string) => {
    setWallets(prev => prev.filter(w => w.id !== id));
    toast({
      title: 'Wallet Removed',
      description: 'Remember to save changes.',
    });
  };

  const handleToggleWallet = (id: string) => {
    setWallets(prev => prev.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const handleUploadImage = async (
    file: File, 
    type: 'icon' | 'qr',
    setUploading: (v: boolean) => void
  ) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return null;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Max 2MB allowed.',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `crypto-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${type === 'icon' ? 'icons' : 'qr-codes'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${type}.`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingWallet) return;
    
    const url = await handleUploadImage(file, 'icon', setIsUploadingIcon);
    if (url) {
      setEditingWallet(prev => prev ? { ...prev, iconUrl: url } : null);
    }
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingWallet) return;
    
    const url = await handleUploadImage(file, 'qr', setIsUploadingQR);
    if (url) {
      setEditingWallet(prev => prev ? { ...prev, qrUrl: url } : null);
    }
    if (qrInputRef.current) qrInputRef.current.value = '';
  };

  const handleSaveWallet = () => {
    if (!editingWallet) return;
    
    if (!editingWallet.name.trim() || !editingWallet.address.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and address are required.',
        variant: 'destructive',
      });
      return;
    }

    setWallets(prev => {
      const exists = prev.find(w => w.id === editingWallet.id);
      if (exists) {
        return prev.map(w => w.id === editingWallet.id ? editingWallet : w);
      }
      return [...prev, editingWallet];
    });

    setIsDialogOpen(false);
    setEditingWallet(null);
    toast({
      title: 'Wallet Updated',
      description: 'Remember to save all changes.',
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await updateSettingAsync({
        key: 'crypto_wallets',
        value: JSON.stringify(wallets),
        oldValue: JSON.stringify(settingsMap.crypto_wallets || []),
      });
      
      // Also update legacy fields with first enabled wallet for backward compatibility
      const firstEnabled = wallets.find(w => w.enabled);
      if (firstEnabled) {
        await Promise.all([
          updateSettingAsync({ key: 'usd_wallet_id', value: firstEnabled.address }),
          updateSettingAsync({ key: 'usd_wallet_currency_name', value: firstEnabled.name }),
          updateSettingAsync({ key: 'usd_wallet_currency_symbol', value: firstEnabled.symbol }),
          updateSettingAsync({ key: 'usd_wallet_qr_url', value: firstEnabled.qrUrl }),
          updateSettingAsync({ key: 'usd_wallet_icon_url', value: firstEnabled.iconUrl }),
          updateSettingAsync({ key: 'usd_wallet_enabled', value: 'true' }),
        ]);
      }

      setSaved(true);
      toast({ title: 'Saved!', description: 'Crypto wallets have been saved.' });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (wallet: CryptoWallet) => {
    setPreviewWallet(wallet);
    setIsPreviewOpen(true);
  };

  const enabledCount = wallets.filter(w => w.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Crypto Wallet Settings</CardTitle>
              <CardDescription>
                Manage multiple USD wallet payment addresses. Drag to reorder.
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleAddWallet} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Wallet
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {wallets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No crypto wallets configured</p>
            <p className="text-sm">Add your first wallet to accept crypto payments</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={wallets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <SortableWalletItem
                    key={wallet.id}
                    wallet={wallet}
                    onPreview={handlePreview}
                    onEdit={handleEditWallet}
                    onDelete={handleDeleteWallet}
                    onToggle={handleToggleWallet}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {wallets.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {enabledCount} of {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} enabled
            </p>
            <Button
              onClick={handleSaveAll}
              disabled={saving || isUpdating}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? 'Saved!' : 'Save All Changes'}
            </Button>
          </div>
        )}

        {/* Edit/Add Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWallet?.address ? 'Edit Wallet' : 'Add New Wallet'}
              </DialogTitle>
            </DialogHeader>
            
            {editingWallet && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency Name *</Label>
                    <Input
                      value={editingWallet.name}
                      onChange={(e) => setEditingWallet(prev => prev ? { ...prev, name: e.target.value } : null)}
                      placeholder="e.g., USDT TRC20"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input
                      value={editingWallet.symbol}
                      onChange={(e) => setEditingWallet(prev => prev ? { ...prev, symbol: e.target.value } : null)}
                      placeholder="e.g., $"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Wallet Address *</Label>
                  <Input
                    value={editingWallet.address}
                    onChange={(e) => setEditingWallet(prev => prev ? { ...prev, address: e.target.value } : null)}
                    placeholder="Enter wallet address"
                    className="font-mono text-sm"
                    maxLength={200}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Icon Upload */}
                  <div className="space-y-2">
                    <Label>Wallet Icon</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                        {editingWallet.iconUrl ? (
                          <img src={editingWallet.iconUrl} alt="Icon" className="w-10 h-10 object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 opacity-30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <input
                          ref={iconInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => iconInputRef.current?.click()}
                          disabled={isUploadingIcon}
                          className="w-full"
                        >
                          {isUploadingIcon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          {isUploadingIcon ? '...' : 'Upload'}
                        </Button>
                        {editingWallet.iconUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingWallet(prev => prev ? { ...prev, iconUrl: '' } : null)}
                            className="w-full text-destructive text-xs h-7"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Upload */}
                  <div className="space-y-2">
                    <Label>QR Code</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                        {editingWallet.qrUrl ? (
                          <img src={editingWallet.qrUrl} alt="QR" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-5 h-5 opacity-30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <input
                          ref={qrInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleQRUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => qrInputRef.current?.click()}
                          disabled={isUploadingQR}
                          className="w-full"
                        >
                          {isUploadingQR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          {isUploadingQR ? '...' : 'Upload'}
                        </Button>
                        {editingWallet.qrUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingWallet(prev => prev ? { ...prev, qrUrl: '' } : null)}
                            className="w-full text-destructive text-xs h-7"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingWallet.enabled}
                      onCheckedChange={(checked) => setEditingWallet(prev => prev ? { ...prev, enabled: checked } : null)}
                    />
                    <Label>Enabled</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveWallet}>
                      Save Wallet
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                User View Preview
              </DialogTitle>
            </DialogHeader>
            
            {previewWallet && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-muted/50 to-transparent px-4 py-3 border-b">
                  <div className="flex items-center gap-2 font-medium">
                    {previewWallet.iconUrl ? (
                      <img src={previewWallet.iconUrl} alt="" className="w-5 h-5" />
                    ) : (
                      <img src={walletIconDefault} alt="" className="w-5 h-5 opacity-70" />
                    )}
                    {previewWallet.name} deposit address
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 font-mono text-sm break-all bg-muted/50 px-3 py-2 rounded-md border">
                      {previewWallet.address}
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </Button>
                    {previewWallet.qrUrl && (
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-primary/10 border-primary">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {previewWallet.qrUrl && (
                    <div className="flex justify-center py-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm border">
                        <img
                          src={previewWallet.qrUrl}
                          alt="QR Code"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Amount input preview */}
                  <div className="space-y-2">
                    <Label className="text-sm">Amount Sending</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="0.00" 
                        className="font-mono" 
                        disabled 
                      />
                      <span className="flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                        {previewWallet.symbol || '$'}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
                    I have paid
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
