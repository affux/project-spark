import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmitProof, uploadProofImages } from '@/hooks/useProofOfWork';
import { useActiveWorkTypes } from '@/hooks/useWorkTypes';
import { useActiveCategories } from '@/hooks/useWorkTypeCategories';
import { getIconComponent } from '@/components/admin/WorkTypeCategorySettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formSchema = z.object({
  work_title: z.string().min(1, 'Please select a work type'),
  link_url: z.string().url('Please enter a valid URL'),
  product_link: z.string().url('Please enter a valid product URL'),
  notes: z.string().optional(),
  confirmation: z.boolean().refine((val) => val === true, {
    message: 'You must confirm that the work is genuine',
  }),
});

type FormData = z.infer<typeof formSchema>;

export const SubmitProofForm: React.FC = () => {
  const { user } = useAuth();
  const submitProof = useSubmitProof();
  const { data: workTypes, isLoading: isLoadingWorkTypes } = useActiveWorkTypes();
  const { data: categories } = useActiveCategories();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Build category color map
  const categoryColorMap = new Map<string, { color: string; icon: string }>();
  categories?.forEach((cat) => {
    categoryColorMap.set(cat.name, { color: cat.color, icon: cat.icon || 'folder' });
  });

  // Find default work type
  const defaultWorkType = workTypes?.find(wt => wt.is_default);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_title: '',
      link_url: '',
      product_link: '',
      notes: '',
      confirmation: false,
    },
  });

  // Set default work type when data loads
  React.useEffect(() => {
    if (defaultWorkType && !form.getValues('work_title')) {
      form.setValue('work_title', defaultWorkType.name);
    }
  }, [defaultWorkType, form]);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of fileArray) {
      if (files.length + validFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} images allowed`);
        break;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WEBP allowed`);
        continue;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: File must be under ${MAX_SIZE_MB}MB`);
        continue;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [files.length]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    if (files.length === 0) {
      toast.error('Please upload at least one proof image');
      return;
    }

    if (!user?.id) return;

    try {
      setUploading(true);
      
      // Upload all images in parallel
      const imageUrls = await uploadProofImages(user.id, files);

      // Submit proof
      await submitProof.mutateAsync({
        work_title: data.work_title,
        link_url: data.link_url,
        product_link: data.product_link || undefined,
        proof_images: imageUrls,
        notes: data.notes,
      });

      // Reset form
      form.reset();
      setFiles([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = uploading || submitProof.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Proof of Work</CardTitle>
        <CardDescription>
          Share your completed work by providing a link and uploading proof screenshots
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="work_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Type / Task Name *</FormLabel>
                  {isLoadingWorkTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : workTypes && workTypes.length > 0 ? (
                    (() => {
                      // Group work types by category
                      const grouped = workTypes.reduce((acc, wt) => {
                        const cat = wt.category || 'General';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(wt);
                        return acc;
                      }, {} as Record<string, typeof workTypes>);
                      const catKeys = Object.keys(grouped).sort();

                      return (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a work type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {catKeys.map((category) => {
                              const catInfo = categoryColorMap.get(category);
                              const color = catInfo?.color || '#6366f1';
                              const IconComponent = getIconComponent(catInfo?.icon || null);
                              
                              return (
                                <div key={category}>
                                  <div 
                                    className="px-2 py-1.5 text-xs font-semibold flex items-center gap-2"
                                    style={{ backgroundColor: `${color}10` }}
                                  >
                                    <IconComponent className="w-3.5 h-3.5" style={{ color }} />
                                    <span style={{ color }}>{category}</span>
                                  </div>
                                  {grouped[category].map((type) => (
                                    <SelectItem key={type.id} value={type.name} className="pl-6">
                                      <span className="flex items-center gap-2">
                                        <span 
                                          className="w-2 h-2 rounded-full shrink-0" 
                                          style={{ backgroundColor: color }}
                                        />
                                        {type.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      );
                    })()
                  ) : (
                    <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
                      No work types available. Please contact admin.
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shared Video / Post Link *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste the URL of your shared video or post
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Link *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to the product you promoted
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Area */}
            <div className="space-y-3">
              <FormLabel>Proof Screenshots * ({files.length}/{MAX_FILES})</FormLabel>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  files.length >= MAX_FILES && "opacity-50 pointer-events-none"
                )}
              >
                <input
                  type="file"
                  id="proof-images"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  disabled={isSubmitting || files.length >= MAX_FILES}
                />
                <label
                  htmlFor="proof-images"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop images here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP • Max {MAX_SIZE_MB}MB each • Up to {MAX_FILES} images
                  </p>
                </label>
              </div>

              {/* Image Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isSubmitting}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about your work..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      I confirm that the work is completed by me and the proof provided is genuine *
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || files.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading Images...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Submit Proof of Work
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
