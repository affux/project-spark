import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Package,
  Link as LinkIcon,
  Search,
  RefreshCw,
  X,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface ParsedProduct {
  name: string;
  sku: string;
  description: string;
  base_price: number;
  stock: number;
  category: string;
  image_url: string;
  image_urls: string[];
  video_urls: string[];
  isValid: boolean;
  errors: string[];
}

interface CJProduct {
  pid: string;
  productName: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
  productWeight: number;
  productSku: string;
  listedNum?: number;
  isVideo?: boolean;
  isFreeShipping?: boolean;
  inventory?: number;
  images?: string[];
  videos?: string[];
}

interface ColumnMapping {
  name: string;
  sku: string;
  description: string;
  base_price: string;
  stock: string;
  category: string;
  image_url: string;
  additional_images: string;
  video_urls: string;
}

interface ManualProduct {
  name: string;
  sku: string;
  description: string;
  base_price: string;
  stock: string;
  category: string;
  images: File[];
  videos: File[];
  imagePreviews: string[];
  videoPreviews: string[];
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  name: '',
  sku: '',
  description: '',
  base_price: '',
  stock: '',
  category: '',
  image_url: '',
  additional_images: '',
  video_urls: '',
};

const DEFAULT_MANUAL_PRODUCT: ManualProduct = {
  name: '',
  sku: '',
  description: '',
  base_price: '',
  stock: '0',
  category: '',
  images: [],
  videos: [],
  imagePreviews: [],
  videoPreviews: [],
};

export const BulkProductImport: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // CSV Import State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // Manual Upload State
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([{ ...DEFAULT_MANUAL_PRODUCT }]);
  const [isUploadingManual, setIsUploadingManual] = useState(false);
  const [manualUploadProgress, setManualUploadProgress] = useState(0);
  
  // CJ Dropshipping State
  const [cjSearchQuery, setCjSearchQuery] = useState('');
  const [cjProducts, setCjProducts] = useState<CJProduct[]>([]);
  const [selectedCjProducts, setSelectedCjProducts] = useState<Set<string>>(new Set());
  const [isFetchingCj, setIsFetchingCj] = useState(false);
  const [cjImporting, setCjImporting] = useState(false);

  // Parse CSV file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: 'Invalid File',
          description: 'CSV must have headers and at least one data row',
          variant: 'destructive',
        });
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map(line => parseCSVLine(line));
      
      setCsvHeaders(headers);
      setCsvData(data);
      
      // Auto-detect column mappings
      const autoMapping = { ...DEFAULT_COLUMN_MAPPING };
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim();
        if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
          if (!autoMapping.name) autoMapping.name = header;
        } else if (lowerHeader.includes('sku') || lowerHeader.includes('code') || lowerHeader.includes('id')) {
          if (!autoMapping.sku) autoMapping.sku = header;
        } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
          autoMapping.description = header;
        } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
          if (!autoMapping.base_price) autoMapping.base_price = header;
        } else if (lowerHeader.includes('stock') || lowerHeader.includes('quantity') || lowerHeader.includes('qty')) {
          autoMapping.stock = header;
        } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
          autoMapping.category = header;
        } else if (lowerHeader.includes('video')) {
          autoMapping.video_urls = header;
        } else if (lowerHeader.includes('additional') && lowerHeader.includes('image')) {
          autoMapping.additional_images = header;
        } else if (lowerHeader.includes('image') || lowerHeader.includes('photo') || lowerHeader.includes('url')) {
          if (!autoMapping.image_url) autoMapping.image_url = header;
        }
      });
      
      setColumnMapping(autoMapping);
      
      toast({
        title: 'File Loaded',
        description: `Found ${data.length} products. Please verify column mappings.`,
      });
    };
    
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseProducts = (): ParsedProduct[] => {
    return csvData.map((row) => {
      const getColumnValue = (key: keyof ColumnMapping): string => {
        const headerIndex = csvHeaders.indexOf(columnMapping[key]);
        return headerIndex >= 0 ? (row[headerIndex] || '') : '';
      };

      const name = getColumnValue('name');
      const sku = getColumnValue('sku') || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const description = getColumnValue('description');
      const priceStr = getColumnValue('base_price');
      const stockStr = getColumnValue('stock');
      const category = getColumnValue('category');
      const image_url = getColumnValue('image_url');
      const additionalImagesStr = getColumnValue('additional_images');
      const videoUrlsStr = getColumnValue('video_urls');

      // Parse multiple URLs (comma or semicolon separated)
      const parseUrls = (str: string): string[] => {
        if (!str) return [];
        return str.split(/[,;]/).map(u => u.trim()).filter(u => u.length > 0);
      };

      const image_urls = [image_url, ...parseUrls(additionalImagesStr)].filter(u => u.length > 0);
      const video_urls = parseUrls(videoUrlsStr);

      const errors: string[] = [];
      
      if (!name) errors.push('Name is required');
      
      const base_price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      if (base_price <= 0) errors.push('Invalid price');
      
      const stock = parseInt(stockStr.replace(/[^0-9]/g, '')) || 0;

      return {
        name,
        sku,
        description,
        base_price,
        stock,
        category,
        image_url,
        image_urls,
        video_urls,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  const handlePreview = () => {
    if (!columnMapping.name || !columnMapping.base_price) {
      toast({
        title: 'Missing Required Mappings',
        description: 'Please map at least Name and Price columns',
        variant: 'destructive',
      });
      return;
    }
    
    const products = parseProducts();
    setParsedProducts(products);
    setShowPreview(true);
  };

  const handleImportCSV = async () => {
    const validProducts = parsedProducts.filter(p => p.isValid);
    if (validProducts.length === 0) {
      toast({
        title: 'No Valid Products',
        description: 'Please fix validation errors before importing',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];
      
      try {
        // Insert the product first
        const { data: insertedProduct, error } = await supabase.from('products').insert({
          name: product.name,
          sku: product.sku,
          description: product.description || null,
          base_price: product.base_price,
          stock: product.stock,
          category: product.category || null,
          image_url: product.image_url || null,
          is_active: true,
        }).select('id').single();

        if (error) throw error;

        // Insert additional images into product_media
        if (insertedProduct && product.image_urls.length > 0) {
          const mediaItems = product.image_urls.map((url, index) => ({
            product_id: insertedProduct.id,
            url,
            media_type: 'image',
            sort_order: index,
            alt_text: `${product.name} image ${index + 1}`,
          }));

          await supabase.from('product_media').insert(mediaItems);
        }

        // Insert videos into product_media
        if (insertedProduct && product.video_urls.length > 0) {
          const videoItems = product.video_urls.map((url, index) => ({
            product_id: insertedProduct.id,
            url,
            media_type: 'video',
            sort_order: product.image_urls.length + index,
            alt_text: `${product.name} video ${index + 1}`,
          }));

          await supabase.from('product_media').insert(videoItems);
        }

        successCount++;
      } catch (error) {
        console.error('Error importing product:', error);
        errorCount++;
      }

      setImportProgress(((i + 1) / validProducts.length) * 100);
    }

    setIsImporting(false);
    setShowPreview(false);
    setCsvHeaders([]);
    setCsvData([]);
    setParsedProducts([]);
    setColumnMapping(DEFAULT_COLUMN_MAPPING);

    toast({
      title: 'Import Complete',
      description: `Successfully imported ${successCount} products. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });

    onSuccess?.();
  };

  // CJ Dropshipping Functions
  const searchCjProducts = async () => {
    if (!cjSearchQuery.trim()) {
      toast({
        title: 'Missing Search Query',
        description: 'Please enter a product name to search',
        variant: 'destructive',
      });
      return;
    }

    setIsFetchingCj(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cj-product-search', {
        body: {
          action: 'search',
          query: cjSearchQuery,
          pageSize: 50,
        },
      });

      if (error) throw error;
      
      if (data?.products) {
        setCjProducts(data.products);
        toast({
          title: 'Products Found',
          description: `Found ${data.products.length} products from CJ Dropshipping`,
        });
      }
    } catch (error) {
      console.error('CJ search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to fetch products. Please check your API key and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingCj(false);
    }
  };

  const toggleCjProductSelection = (pid: string) => {
    setSelectedCjProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pid)) {
        newSet.delete(pid);
      } else {
        newSet.add(pid);
      }
      return newSet;
    });
  };

  const importSelectedCjProducts = async () => {
    if (selectedCjProducts.size === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product to import',
        variant: 'destructive',
      });
      return;
    }

    setCjImporting(true);
    let successCount = 0;
    let errorCount = 0;

    const productsToImport = cjProducts.filter(p => selectedCjProducts.has(p.pid));

    for (const product of productsToImport) {
      try {
        // Insert the product first
        const { data: insertedProduct, error } = await supabase.from('products').insert({
          name: product.productName,
          sku: product.productSku || `CJ-${product.pid}`,
          description: `Category: ${product.categoryName}. Weight: ${product.productWeight}g`,
          base_price: product.sellPrice,
          stock: product.inventory || 100,
          category: product.categoryName,
          image_url: product.productImage,
          is_active: true,
        }).select('id').single();

        if (error) throw error;

        // Insert main image and any additional images to product_media
        if (insertedProduct) {
          const allImages = [product.productImage, ...(product.images || [])].filter(Boolean);
          const uniqueImages = [...new Set(allImages)];
          
          if (uniqueImages.length > 0) {
            const mediaItems = uniqueImages.map((url, index) => ({
              product_id: insertedProduct.id,
              url,
              media_type: 'image',
              sort_order: index,
              alt_text: `${product.productName} image ${index + 1}`,
            }));

            await supabase.from('product_media').insert(mediaItems);
          }

          // Insert videos if any
          if (product.videos && product.videos.length > 0) {
            const videoItems = product.videos.map((url, index) => ({
              product_id: insertedProduct.id,
              url,
              media_type: 'video',
              sort_order: uniqueImages.length + index,
              alt_text: `${product.productName} video ${index + 1}`,
            }));

            await supabase.from('product_media').insert(videoItems);
          }
        }

        successCount++;
      } catch (error) {
        console.error('Error importing CJ product:', error);
        errorCount++;
      }
    }

    setCjImporting(false);
    setSelectedCjProducts(new Set());

    toast({
      title: 'Import Complete',
      description: `Successfully imported ${successCount} products from CJ Dropshipping. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });

    onSuccess?.();
  };

  const downloadTemplate = () => {
    const template = 'name,sku,description,base_price,stock,category,image_url,additional_images,video_urls\n"Product Name","SKU-001","Product description",19.99,100,"Electronics","https://example.com/image1.jpg","https://example.com/image2.jpg;https://example.com/image3.jpg","https://example.com/video.mp4"';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Manual Upload Functions
  const handleAddManualProduct = () => {
    setManualProducts(prev => [...prev, { ...DEFAULT_MANUAL_PRODUCT }]);
  };

  const handleRemoveManualProduct = (index: number) => {
    setManualProducts(prev => {
      const updated = [...prev];
      // Clean up preview URLs
      updated[index].imagePreviews.forEach(url => URL.revokeObjectURL(url));
      updated[index].videoPreviews.forEach(url => URL.revokeObjectURL(url));
      updated.splice(index, 1);
      return updated.length === 0 ? [{ ...DEFAULT_MANUAL_PRODUCT }] : updated;
    });
  };

  const handleManualProductChange = (index: number, field: keyof ManualProduct, value: string) => {
    setManualProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleManualImageUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    
    setManualProducts(prev => {
      const updated = [...prev];
      const newImages = Array.from(files);
      const newPreviews = newImages.map(f => URL.createObjectURL(f));
      updated[index] = {
        ...updated[index],
        images: [...updated[index].images, ...newImages],
        imagePreviews: [...updated[index].imagePreviews, ...newPreviews],
      };
      return updated;
    });
  };

  const handleManualVideoUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    
    setManualProducts(prev => {
      const updated = [...prev];
      const newVideos = Array.from(files);
      const newPreviews = newVideos.map(f => URL.createObjectURL(f));
      updated[index] = {
        ...updated[index],
        videos: [...updated[index].videos, ...newVideos],
        videoPreviews: [...updated[index].videoPreviews, ...newPreviews],
      };
      return updated;
    });
  };

  const handleRemoveManualImage = (productIndex: number, imageIndex: number) => {
    setManualProducts(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[productIndex].imagePreviews[imageIndex]);
      updated[productIndex].images.splice(imageIndex, 1);
      updated[productIndex].imagePreviews.splice(imageIndex, 1);
      return [...updated];
    });
  };

  const handleRemoveManualVideo = (productIndex: number, videoIndex: number) => {
    setManualProducts(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[productIndex].videoPreviews[videoIndex]);
      updated[productIndex].videos.splice(videoIndex, 1);
      updated[productIndex].videoPreviews.splice(videoIndex, 1);
      return [...updated];
    });
  };

  const uploadFileToStorage = async (file: File, productId: string, mediaType: 'image' | 'video'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImportManualProducts = async () => {
    const validProducts = manualProducts.filter(p => 
      p.name.trim() && parseFloat(p.base_price) > 0
    );

    if (validProducts.length === 0) {
      toast({
        title: 'No Valid Products',
        description: 'Please fill in at least the name and price for each product',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingManual(true);
    setManualUploadProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];
      
      try {
        const sku = product.sku.trim() || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        // Insert the product first
        const { data: insertedProduct, error } = await supabase.from('products').insert({
          name: product.name.trim(),
          sku,
          description: product.description.trim() || null,
          base_price: parseFloat(product.base_price) || 0,
          stock: parseInt(product.stock) || 0,
          category: product.category.trim() || null,
          image_url: null,
          is_active: true,
        }).select('id').single();

        if (error) throw error;

        // Upload images and save to product_media
        if (insertedProduct && product.images.length > 0) {
          for (let imgIdx = 0; imgIdx < product.images.length; imgIdx++) {
            const file = product.images[imgIdx];
            const url = await uploadFileToStorage(file, insertedProduct.id, 'image');
            
            await supabase.from('product_media').insert({
              product_id: insertedProduct.id,
              url,
              media_type: 'image',
              sort_order: imgIdx,
              alt_text: `${product.name} image ${imgIdx + 1}`,
            });

            // Update main image_url if first image
            if (imgIdx === 0) {
              await supabase.from('products').update({ image_url: url }).eq('id', insertedProduct.id);
            }
          }
        }

        // Upload videos and save to product_media
        if (insertedProduct && product.videos.length > 0) {
          for (let vidIdx = 0; vidIdx < product.videos.length; vidIdx++) {
            const file = product.videos[vidIdx];
            const url = await uploadFileToStorage(file, insertedProduct.id, 'video');
            
            await supabase.from('product_media').insert({
              product_id: insertedProduct.id,
              url,
              media_type: 'video',
              sort_order: product.images.length + vidIdx,
              alt_text: `${product.name} video ${vidIdx + 1}`,
            });
          }
        }

        successCount++;
      } catch (error) {
        console.error('Error importing manual product:', error);
        errorCount++;
      }

      setManualUploadProgress(((i + 1) / validProducts.length) * 100);
    }

    setIsUploadingManual(false);
    
    // Clean up previews
    manualProducts.forEach(p => {
      p.imagePreviews.forEach(url => URL.revokeObjectURL(url));
      p.videoPreviews.forEach(url => URL.revokeObjectURL(url));
    });
    
    setManualProducts([{ ...DEFAULT_MANUAL_PRODUCT }]);

    toast({
      title: 'Import Complete',
      description: `Successfully imported ${successCount} products. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });

    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Bulk Product Import
        </CardTitle>
        <CardDescription>
          Import products with file uploads, CSV, or from CJ Dropshipping
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <Upload className="w-4 h-4" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="cj" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              CJ Dropshipping
            </TabsTrigger>
          </TabsList>

          {/* Manual File Upload Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Add Products with File Uploads</h3>
                <p className="text-sm text-muted-foreground">
                  Upload images and videos directly for each product
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddManualProduct}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-6">
                {manualProducts.map((product, productIndex) => (
                  <Card key={productIndex} className="relative">
                    <CardContent className="pt-6">
                      {manualProducts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveManualProduct(productIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Product Name *</Label>
                          <Input
                            placeholder="Enter product name"
                            value={product.name}
                            onChange={(e) => handleManualProductChange(productIndex, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>SKU</Label>
                          <Input
                            placeholder="Auto-generated if empty"
                            value={product.sku}
                            onChange={(e) => handleManualProductChange(productIndex, 'sku', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Price *</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={product.base_price}
                            onChange={(e) => handleManualProductChange(productIndex, 'base_price', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={product.stock}
                            onChange={(e) => handleManualProductChange(productIndex, 'stock', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Input
                            placeholder="Optional"
                            value={product.category}
                            onChange={(e) => handleManualProductChange(productIndex, 'category', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Product description (optional)"
                          value={product.description}
                          onChange={(e) => handleManualProductChange(productIndex, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>

                      {/* Images Upload */}
                      <div className="mb-4">
                        <Label className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4" />
                          Images
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {product.imagePreviews.map((preview, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${imgIdx + 1}`}
                                className="w-20 h-20 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveManualImage(productIndex, imgIdx)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleManualImageUpload(productIndex, e.target.files)}
                            />
                            <Plus className="w-6 h-6 text-muted-foreground" />
                          </label>
                        </div>
                      </div>

                      {/* Videos Upload */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Video className="w-4 h-4" />
                          Videos
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {product.videoPreviews.map((preview, vidIdx) => (
                            <div key={vidIdx} className="relative group">
                              <video
                                src={preview}
                                className="w-32 h-20 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveManualVideo(productIndex, vidIdx)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <label className="w-32 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              accept="video/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleManualVideoUpload(productIndex, e.target.files)}
                            />
                            <div className="text-center">
                              <Plus className="w-6 h-6 text-muted-foreground mx-auto" />
                              <span className="text-xs text-muted-foreground">Add Video</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {isUploadingManual ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Uploading products...</p>
                </div>
                <Progress value={manualUploadProgress} />
                <p className="text-center text-sm text-muted-foreground">
                  {Math.round(manualUploadProgress)}% complete
                </p>
              </div>
            ) : (
              <Button 
                onClick={handleImportManualProducts} 
                className="w-full"
                disabled={!manualProducts.some(p => p.name.trim() && p.base_price)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {manualProducts.filter(p => p.name.trim() && parseFloat(p.base_price) > 0).length} Products
              </Button>
            )}
          </TabsContent>

          {/* CSV Import Tab */}
          <TabsContent value="csv" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Upload Product CSV</h3>
                <p className="text-sm text-muted-foreground">
                  Supports exports from Alibaba, AliExpress, or any spreadsheet
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">CSV, XLSX, or XLS files</p>
            </div>

            {csvHeaders.length > 0 && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Found {csvData.length} rows with {csvHeaders.length} columns. Map columns below.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Product Name *</Label>
                    <Select 
                      value={columnMapping.name} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, name: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Select 
                      value={columnMapping.sku} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, sku: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-generate" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price *</Label>
                    <Select 
                      value={columnMapping.base_price} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, base_price: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Select 
                      value={columnMapping.stock} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, stock: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default: 0" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Select 
                      value={columnMapping.description} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, description: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={columnMapping.category} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Main Image URL</Label>
                    <Select 
                      value={columnMapping.image_url} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, image_url: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional Images</Label>
                    <Select 
                      value={columnMapping.additional_images} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, additional_images: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Comma-separated URLs" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Video URLs</Label>
                    <Select 
                      value={columnMapping.video_urls} 
                      onValueChange={(v) => setColumnMapping(m => ({ ...m, video_urls: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Comma-separated URLs" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Tip: For multiple images/videos, use comma (,) or semicolon (;) separated URLs in your CSV.
                </p>

                <Button onClick={handlePreview} className="w-full">
                  Preview & Import
                </Button>
              </div>
            )}
          </TabsContent>

          {/* CJ Dropshipping Tab */}
          <TabsContent value="cj" className="space-y-6 mt-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                CJ Dropshipping is connected and ready to use. Search for products below.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Search Products</Label>
                <Input
                  placeholder="Search for products (e.g., wireless earbuds, phone case)"
                  value={cjSearchQuery}
                  onChange={(e) => setCjSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCjProducts()}
                />
              </div>
              <Button 
                className="mt-6"
                onClick={searchCjProducts}
                disabled={isFetchingCj}
              >
                {isFetchingCj ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {cjProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedCjProducts.size} of {cjProducts.length} selected
                  </p>
                  <Button
                    onClick={importSelectedCjProducts}
                    disabled={cjImporting || selectedCjProducts.size === 0}
                  >
                    {cjImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Selected
                      </>
                    )}
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cjProducts.map((product) => (
                        <TableRow 
                          key={product.pid}
                          className="cursor-pointer"
                          onClick={() => toggleCjProductSelection(product.pid)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedCjProducts.has(product.pid)}
                              onChange={() => {}}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <img 
                              src={product.productImage} 
                              alt={product.productName}
                              className="w-16 h-16 object-cover rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {product.productName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.categoryName}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${product.sellPrice.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {cjProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a search query to find products from CJ Dropshipping</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview Import</DialogTitle>
              <DialogDescription>
                Review products before importing. {parsedProducts.filter(p => p.isValid).length} of {parsedProducts.length} products are valid.
              </DialogDescription>
            </DialogHeader>

            {isImporting ? (
              <div className="py-8 space-y-4">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Importing products...</p>
                </div>
                <Progress value={importProgress} />
                <p className="text-center text-sm text-muted-foreground">
                  {Math.round(importProgress)}% complete
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedProducts.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {product.isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name || <span className="text-muted-foreground italic">Missing</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>${product.base_price.toFixed(2)}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            {product.category ? (
                              <Badge variant="secondary">{product.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImportCSV}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {parsedProducts.filter(p => p.isValid).length} Products
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
