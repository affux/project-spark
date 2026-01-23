import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, StorefrontProduct } from '@/hooks/useProducts';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Settings, 
  Trash2, 
  Edit,
  MoreVertical,
  Eye,
  EyeOff,
  Loader2,
  Save,
  X,
  Share2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const storefrontSchema = z.object({
  storefrontName: z.string().trim().min(3, 'Storefront name must be at least 3 characters').max(50, 'Storefront name must be less than 50 characters'),
  storefrontSlug: z.string().trim().min(3, 'Slug must be at least 3 characters').max(30, 'Slug must be less than 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

const UserStorefront: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { storefrontProducts, updateStorefrontProduct, removeFromStorefront, isLoading } = useProducts();
  const { settingsMap, isLoading: isLoadingSettings } = usePlatformSettings();
  
  const minMarkup = settingsMap.selling_percentage_min;
  const maxMarkup = settingsMap.selling_percentage_max;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storefrontName, setStorefrontName] = useState(user?.storefrontName || '');
  const [storefrontSlug, setStorefrontSlug] = useState(user?.storefrontSlug || '');
  const [storefrontBanner, setStorefrontBanner] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Edit pricing state
  const [isEditPricingOpen, setIsEditPricingOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StorefrontProduct | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCustomDescription, setEditCustomDescription] = useState('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  useEffect(() => {
    setStorefrontName(user?.storefrontName || '');
    setStorefrontSlug(user?.storefrontSlug || '');
    // Fetch banner from profile
    const fetchBanner = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('storefront_banner')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.storefront_banner) {
          setStorefrontBanner(data.storefront_banner);
        }
      }
    };
    fetchBanner();
  }, [user?.storefrontName, user?.storefrontSlug, user?.id]);

  const filteredProducts = storefrontProducts.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sp.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const storefrontUrl = user?.storefrontSlug ? `/store/${user.storefrontSlug}` : null;

  const handleCopyUrl = () => {
    if (storefrontUrl) {
      navigator.clipboard.writeText(window.location.origin + storefrontUrl);
      toast({
        title: 'URL Copied',
        description: 'Storefront URL has been copied to clipboard.',
      });
    }
  };

  const getProductShareUrl = (product: StorefrontProduct) => {
    return `${window.location.origin}/store/${user?.storefrontSlug}?product=${product.product_id}`;
  };

  const handleCopyProductLink = (product: StorefrontProduct) => {
    navigator.clipboard.writeText(getProductShareUrl(product));
    toast({
      title: 'Link Copied',
      description: 'Product link has been copied to clipboard.',
    });
  };

  const handleShareWhatsApp = (product: StorefrontProduct) => {
    const url = getProductShareUrl(product);
    const text = encodeURIComponent(`Check out ${product.product.name} - $${product.selling_price.toFixed(2)}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareFacebook = (product: StorefrontProduct) => {
    const url = encodeURIComponent(getProductShareUrl(product));
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleShareTwitter = (product: StorefrontProduct) => {
    const url = encodeURIComponent(getProductShareUrl(product));
    const text = encodeURIComponent(`Check out ${product.product.name} - $${product.selling_price.toFixed(2)}`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  };

  const handleShareLinkedIn = (product: StorefrontProduct) => {
    const url = encodeURIComponent(getProductShareUrl(product));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const handleToggleProduct = async (product: StorefrontProduct) => {
    try {
      await updateStorefrontProduct({
        id: product.id,
        isActive: !product.is_active,
      });
      toast({
        title: product.is_active ? 'Product Hidden' : 'Product Visible',
        description: `Product has been ${product.is_active ? 'hidden from' : 'shown on'} your storefront.`,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveProduct = async (product: StorefrontProduct) => {
    try {
      await removeFromStorefront(product.id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleOpenEditPricing = (product: StorefrontProduct) => {
    setEditingProduct(product);
    setEditSellingPrice(product.selling_price.toString());
    setEditCustomDescription(product.custom_description || '');
    setIsEditPricingOpen(true);
  };

  const handleSaveEditPricing = async () => {
    if (!editingProduct) return;
    
    const price = parseFloat(editSellingPrice);
    const basePrice = editingProduct.product.base_price;
    const minPrice = basePrice * (1 + minMarkup / 100);
    const maxPrice = basePrice * (1 + maxMarkup / 100);
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid price greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    // Validate price is within allowed margin range
    if (price < minPrice) {
      toast({
        title: 'Price Too Low',
        description: `Minimum markup is ${minMarkup}%. Price must be at least $${minPrice.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    if (price > maxPrice) {
      toast({
        title: 'Price Too High',
        description: `Maximum markup is ${maxMarkup}%. Price cannot exceed $${maxPrice.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPrice(true);
    try {
      await updateStorefrontProduct({
        id: editingProduct.id,
        sellingPrice: price,
        customDescription: editCustomDescription || undefined,
      });
      toast({
        title: 'Pricing Updated',
        description: 'Product pricing has been updated successfully.',
      });
      setIsEditPricingOpen(false);
      setEditingProduct(null);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleSaveSettings = async () => {
    setErrors({});
    
    try {
      const validated = storefrontSchema.parse({ storefrontName, storefrontSlug });
      setIsSaving(true);

      // Check if slug is already taken
      const { data: existingSlug } = await supabase
        .from('profiles')
        .select('id')
        .eq('storefront_slug', validated.storefrontSlug)
        .neq('user_id', user?.id || '')
        .maybeSingle();

      if (existingSlug) {
        setErrors({ storefrontSlug: 'This URL is already taken. Please choose another.' });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          storefront_name: validated.storefrontName,
          storefront_slug: validated.storefrontSlug,
          storefront_banner: storefrontBanner || DEFAULT_BANNER,
        })
        .eq('user_id', user?.id || '');

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Your storefront settings have been updated.',
      });
      setIsSettingsOpen(false);
      
      // Refresh the page to update user context
      window.location.reload();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Error saving settings:', error);
        toast({
          title: 'Error',
          description: 'Could not save settings. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);
  };

  if (isLoading || isLoadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Storefront</h1>
            <p className="text-muted-foreground mt-1">
              Manage products listed on your public storefront.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/products">Add More Products</Link>
          </Button>
        </div>

        {/* Storefront URL Card */}
        <div className="dashboard-card trading-glow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {user?.storefrontName || 'Set up your storefront'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {storefrontUrl ? 'Share this link with your customers' : 'Configure your storefront to start selling'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {storefrontUrl ? (
                <>
                  <div className="flex-1 lg:flex-none">
                    <Input
                      readOnly
                      value={window.location.origin + storefrontUrl}
                      className="w-full lg:w-80 bg-muted/50 font-mono text-sm"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link to={storefrontUrl} target="_blank">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No storefront URL configured</p>
              )}
              <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dashboard-card trading-glow text-center">
            <p className="text-3xl font-bold text-foreground">{storefrontProducts.length}</p>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </div>
          <div className="dashboard-card trading-glow text-center">
            <p className="text-3xl font-bold text-emerald-500">
              {storefrontProducts.filter(p => p.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Products</p>
          </div>
          <div className="dashboard-card trading-glow text-center">
            <p className="text-3xl font-bold text-muted-foreground">
              {storefrontProducts.filter(p => !p.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Hidden Products</p>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        {/* Products List */}
        <div className="space-y-4">
          {filteredProducts.map((sp, index) => (
            <div 
              key={sp.id}
              className="dashboard-card trading-glow flex flex-col sm:flex-row sm:items-center gap-4 opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              {sp.product.image_url ? (
                <img 
                  src={sp.product.image_url} 
                  alt={sp.product.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{sp.product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {sp.custom_description || sp.product.description || 'No description'}
                    </p>
                  </div>
                  <Badge variant={sp.is_active ? 'active' : 'inactive'}>
                    {sp.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Price</p>
                    <p className="font-bold text-lg text-foreground">${sp.selling_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Base Cost</p>
                    <p className="font-medium text-muted-foreground">${sp.product.base_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Profit</p>
                    <p className="font-semibold text-green-600">
                      ${(sp.selling_price - sp.product.base_price).toFixed(2)}
                    </p>
                  </div>
                  {sp.product.category && (
                    <Badge variant="secondary">{sp.product.category}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:flex-shrink-0">
                {/* Share Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Share product">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground px-2 py-1">Share Product</p>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm"
                        onClick={() => handleCopyProductLink(sp)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm text-green-600 hover:text-green-700"
                        onClick={() => handleShareWhatsApp(sp)}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm text-blue-600 hover:text-blue-700"
                        onClick={() => handleShareFacebook(sp)}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm"
                        onClick={() => handleShareTwitter(sp)}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X (Twitter)
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm text-blue-700 hover:text-blue-800"
                        onClick={() => handleShareLinkedIn(sp)}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditPricing(sp)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Pricing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleProduct(sp)}>
                      {sp.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide from Store
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show on Store
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleRemoveProduct(sp)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {storefrontProducts.length === 0 
                ? "You haven't added any products to your storefront yet."
                : "No products found matching your search."}
            </p>
            {storefrontProducts.length === 0 && (
              <Button asChild>
                <Link to="/dashboard/products">Browse Products</Link>
              </Button>
            )}
          </div>
        )}

        {/* Storefront Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Storefront Settings</DialogTitle>
              <DialogDescription>
                Configure your storefront name and URL. This is how customers will find your store.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="storefront-name">Storefront Name</Label>
                <Input
                  id="storefront-name"
                  placeholder="My Awesome Store"
                  value={storefrontName}
                  onChange={(e) => {
                    setStorefrontName(e.target.value);
                    if (!storefrontSlug || storefrontSlug === generateSlug(user?.storefrontName || '')) {
                      setStorefrontSlug(generateSlug(e.target.value));
                    }
                  }}
                  className={errors.storefrontName ? 'border-destructive' : ''}
                />
                {errors.storefrontName && (
                  <p className="text-sm text-destructive">{errors.storefrontName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storefront-slug">Storefront URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{window.location.origin}/store/</span>
                  <Input
                    id="storefront-slug"
                    placeholder="my-store"
                    value={storefrontSlug}
                    onChange={(e) => setStorefrontSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className={`flex-1 ${errors.storefrontSlug ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.storefrontSlug && (
                  <p className="text-sm text-destructive">{errors.storefrontSlug}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens. This will be your public store URL.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storefront-banner">Banner Image URL</Label>
                <Input
                  id="storefront-banner"
                  placeholder="https://example.com/banner.jpg"
                  value={storefrontBanner}
                  onChange={(e) => setStorefrontBanner(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL for your store's hero banner image. Leave empty to use the default banner.
                </p>
                {storefrontBanner && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                    <img 
                      src={storefrontBanner} 
                      alt="Banner preview" 
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BANNER;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    <p className="absolute bottom-2 left-2 text-xs text-muted-foreground">Preview</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Pricing Dialog */}
        <Dialog open={isEditPricingOpen} onOpenChange={setIsEditPricingOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Pricing</DialogTitle>
              <DialogDescription>
                Update the selling price for {editingProduct?.product.name}.
              </DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {editingProduct.product.image_url ? (
                    <img 
                      src={editingProduct.product.image_url} 
                      alt={editingProduct.product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No img</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{editingProduct.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Base Cost: ${editingProduct.product.base_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-selling-price">Selling Price ($)</Label>
                  <Input
                    id="edit-selling-price"
                    type="number"
                    step="0.01"
                    min={(editingProduct.product.base_price * (1 + minMarkup / 100)).toFixed(2)}
                    max={(editingProduct.product.base_price * (1 + maxMarkup / 100)).toFixed(2)}
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    placeholder="Enter selling price"
                  />
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: maxMarkup - minMarkup + 1 }, (_, i) => minMarkup + i).map(percent => (
                      <Button
                        key={percent}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditSellingPrice((editingProduct.product.base_price * (1 + percent / 100)).toFixed(2))}
                        className={parseFloat(editSellingPrice) === parseFloat((editingProduct.product.base_price * (1 + percent / 100)).toFixed(2)) ? 'border-primary bg-primary/10' : ''}
                      >
                        +{percent}%
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set your markup between {minMarkup}% to {maxMarkup}% (${(editingProduct.product.base_price * (1 + minMarkup / 100)).toFixed(2)} - ${(editingProduct.product.base_price * (1 + maxMarkup / 100)).toFixed(2)})
                  </p>
                  {parseFloat(editSellingPrice) > editingProduct.product.base_price && 
                   parseFloat(editSellingPrice) >= editingProduct.product.base_price * (1 + minMarkup / 100) &&
                   parseFloat(editSellingPrice) <= editingProduct.product.base_price * (1 + maxMarkup / 100) && (
                    <p className="text-sm text-green-600">
                      Your Profit: ${(parseFloat(editSellingPrice) - editingProduct.product.base_price).toFixed(2)} ({((parseFloat(editSellingPrice) / editingProduct.product.base_price - 1) * 100).toFixed(0)}% markup)
                    </p>
                  )}
                  {parseFloat(editSellingPrice) > 0 && parseFloat(editSellingPrice) < editingProduct.product.base_price * (1 + minMarkup / 100) && (
                    <p className="text-sm text-destructive">
                      Minimum markup is {minMarkup}% (${(editingProduct.product.base_price * (1 + minMarkup / 100)).toFixed(2)})
                    </p>
                  )}
                  {parseFloat(editSellingPrice) > editingProduct.product.base_price * (1 + maxMarkup / 100) && (
                    <p className="text-sm text-destructive">
                      Maximum markup is {maxMarkup}% (${(editingProduct.product.base_price * (1 + maxMarkup / 100)).toFixed(2)})
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-custom-description">Custom Description (Optional)</Label>
                  <Input
                    id="edit-custom-description"
                    value={editCustomDescription}
                    onChange={(e) => setEditCustomDescription(e.target.value)}
                    placeholder="Add a custom description for your storefront"
                  />
                  <p className="text-xs text-muted-foreground">
                    This description will be shown on your storefront instead of the default product description.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditPricingOpen(false)}
                disabled={isUpdatingPrice}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEditPricing} disabled={isUpdatingPrice}>
                {isUpdatingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserStorefront;
