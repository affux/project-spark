import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  DollarSign,
  Package,
  Check,
  RefreshCw,
  ImageIcon,
  Minus,
  Plus,
  Layers
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminProducts } from '@/hooks/useAdminProducts';

interface GeneratedProduct {
  name: string;
  description: string;
  features: string[];
  brand: string;
  category: string;
  price: number;
  sku: string;
  imageBase64: string | null;
  galleryImages?: string[];
}

const BRANDS = [
  { value: 'nike', label: 'Nike', icon: '👟' },
  { value: 'apple', label: 'Apple', icon: '🍎' },
  { value: 'samsung', label: 'Samsung', icon: '📱' },
  { value: 'adidas', label: 'Adidas', icon: '⚡' },
  { value: 'sony', label: 'Sony', icon: '🎮' },
  { value: 'microsoft', label: 'Microsoft', icon: '💻' },
  { value: 'lg', label: 'LG', icon: '📺' },
  { value: 'puma', label: 'Puma', icon: '🐆' },
  { value: 'under-armour', label: 'Under Armour', icon: '💪' },
  { value: 'bose', label: 'Bose', icon: '🎧' },
  { value: 'jbl', label: 'JBL', icon: '🔊' },
  { value: 'canon', label: 'Canon', icon: '📷' },
];

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'audio', label: 'Audio' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'photography', label: 'Photography' },
  { value: 'wearables', label: 'Wearables' },
  { value: 'home', label: 'Home & Living' },
];

interface SmartProductGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated?: () => void;
}

export const SmartProductGenerator: React.FC<SmartProductGeneratorProps> = ({
  open,
  onOpenChange,
  onProductCreated,
}) => {
  const { toast } = useToast();
  const { addProduct, isAddingProduct } = useAdminProducts();
  
  const [step, setStep] = useState<'configure' | 'preview'>('configure');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<GeneratedProduct | null>(null);
  
  const [config, setConfig] = useState({
    brand: '',
    category: '',
    minPrice: '29.99',
    maxPrice: '299.99',
    quantity: 1,
    galleryCount: 1,
  });
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(0);

  const handleGenerate = async () => {
    if (!config.brand || !config.category) {
      toast({
        title: 'Missing Information',
        description: 'Please select a brand and category.',
        variant: 'destructive',
      });
      return;
    }

    const minPrice = parseFloat(config.minPrice);
    const maxPrice = parseFloat(config.maxPrice);

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
      toast({
        title: 'Invalid Price Range',
        description: 'Please enter a valid price range.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-product', {
        body: {
          brand: config.brand,
          category: config.category,
          minPrice,
          maxPrice,
          galleryCount: config.galleryCount,
        },
      });

      if (error) throw error;

      setGeneratedProduct(data);
      setSelectedGalleryImage(0);
      setStep('preview');

      toast({
        title: '✨ Product Generated!',
        description: `Created: ${data.name}`,
      });
    } catch (error) {
      console.error('Error generating product:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!generatedProduct) return;

    try {
      // Upload all gallery images
      const uploadedUrls: string[] = [];
      const galleryImages = generatedProduct.galleryImages || [];
      
      for (let i = 0; i < galleryImages.length; i++) {
        const imageBase64 = galleryImages[i];
        if (!imageBase64) continue;
        
        try {
          const base64Data = imageBase64.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/png' });

          const fileName = `generated-${Date.now()}-${i}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, {
              contentType: 'image/png',
              upsert: false,
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(uploadData.path);
            uploadedUrls.push(urlData.publicUrl);
          }
        } catch (imgError) {
          console.error('Error uploading image', i, imgError);
        }
      }

      const mainImageUrl = uploadedUrls[0] || null;

      await addProduct({
        name: generatedProduct.name,
        description: generatedProduct.description,
        sku: generatedProduct.sku,
        category: generatedProduct.category,
        base_price: generatedProduct.price,
        stock: Math.floor(Math.random() * 100) + 10,
        image_url: mainImageUrl,
      });
      
      // TODO: Add additional gallery images to product_media table if needed

      toast({
        title: '🎉 Product Saved!',
        description: `${generatedProduct.name} has been added to your catalog.`,
      });

      // Reset and close
      setStep('configure');
      setGeneratedProduct(null);
      setSelectedGalleryImage(0);
      setConfig({
        brand: '',
        category: '',
        minPrice: '29.99',
        maxPrice: '299.99',
        quantity: 1,
        galleryCount: 1,
      });
      onOpenChange(false);
      onProductCreated?.();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = () => {
    setStep('configure');
    setGeneratedProduct(null);
    setSelectedGalleryImage(0);
  };

  const handleClose = () => {
    setStep('configure');
    setGeneratedProduct(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        {step === 'configure' ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Smart Product Generator</DialogTitle>
                  <DialogDescription>
                    Generate realistic, brand-inspired products with AI
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Brand Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Brand</Label>
                <div className="grid grid-cols-4 gap-2">
                  {BRANDS.map((brand) => (
                    <button
                      key={brand.value}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, brand: brand.value }))}
                      className={`p-3 rounded-xl border-2 transition-all text-center hover:border-primary/50 ${
                        config.brand === brand.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="text-2xl mb-1">{brand.icon}</div>
                      <div className="text-xs font-medium">{brand.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Category</Label>
                <Select
                  value={config.category}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Price Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.minPrice}
                      onChange={(e) => setConfig(prev => ({ ...prev, minPrice: e.target.value }))}
                      placeholder="Min Price"
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.maxPrice}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxPrice: e.target.value }))}
                      placeholder="Max Price"
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The system will generate a realistic price within this range
                </p>
              </div>

              {/* Quantity Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Number of Products
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setConfig(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      disabled={config.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">{config.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setConfig(prev => ({ ...prev, quantity: Math.min(10, prev.quantity + 1) }))}
                      disabled={config.quantity >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={config.quantity === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig(prev => ({ ...prev, quantity: num }))}
                        className="h-8 px-3"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate up to 10 unique products at once
                </p>
              </div>

              {/* Gallery Images Count */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Gallery Images per Product
                </Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={config.galleryCount === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig(prev => ({ ...prev, galleryCount: num }))}
                      className="h-9 w-12"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  More images = longer generation time but richer product gallery
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">AI-Powered Generation</p>
                    <p className="text-muted-foreground mt-1">
                      Creates unique product names, SEO descriptions, and professional images inspired by real brands.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !config.brand || !config.category}
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate {config.quantity > 1 ? `${config.quantity} Products` : 'Product'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Product Preview</DialogTitle>
                  <DialogDescription>
                    Review and edit before saving to catalog
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {generatedProduct && (
                <div className="space-y-6 py-4">
                  {/* Main Image Preview */}
                  <div className="space-y-3">
                    <div className="aspect-video rounded-xl overflow-hidden bg-muted/50 border">
                      {generatedProduct.galleryImages && generatedProduct.galleryImages[selectedGalleryImage] ? (
                        <img
                          src={generatedProduct.galleryImages[selectedGalleryImage]}
                          alt={`${generatedProduct.name} - Image ${selectedGalleryImage + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : generatedProduct.imageBase64 ? (
                        <img
                          src={generatedProduct.imageBase64}
                          alt={generatedProduct.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="w-12 h-12" />
                          <span className="text-sm">Image generation in progress...</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Gallery Thumbnails */}
                    {generatedProduct.galleryImages && generatedProduct.galleryImages.length > 1 && (
                      <div className="flex gap-2 justify-center">
                        {generatedProduct.galleryImages.map((img, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedGalleryImage(index)}
                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                              selectedGalleryImage === index 
                                ? 'border-primary ring-2 ring-primary/20' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {generatedProduct.galleryImages && generatedProduct.galleryImages.length > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        {generatedProduct.galleryImages.length} gallery image{generatedProduct.galleryImages.length > 1 ? 's' : ''} generated
                      </p>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {generatedProduct.brand}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {generatedProduct.category}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-bold">{generatedProduct.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${generatedProduct.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {generatedProduct.sku}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
                        {generatedProduct.description}
                      </div>
                    </div>

                    {generatedProduct.features?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Key Features</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {generatedProduct.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30"
                            >
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
              <Button
                onClick={handleSaveProduct}
                disabled={isAddingProduct}
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {isAddingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save to Catalog
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
