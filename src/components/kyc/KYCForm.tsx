import React, { useState } from 'react';
import { useKYC, type KYCFormData } from '@/hooks/useKYC';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Loader2,
  User,
  Calendar,
  CreditCard,
  Camera,
  Building,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { CameraCapture } from './CameraCapture';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const aadhaarRegex = /^\d{12}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const mobileRegex = /^[6-9]\d{9}$/;

const kycSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  mobile_number: z.string().regex(mobileRegex, 'Mobile number must be 10 digits starting with 6-9').optional().or(z.literal('')),
  aadhaar_number: z.string().regex(aadhaarRegex, 'Aadhaar must be 12 digits'),
  pan_number: z.string().regex(panRegex, 'Invalid PAN format (e.g., ABCDE1234F)'),
});

export const KYCForm: React.FC = () => {
  const { submitKYC, isSubmitting, kycSubmission, kycStatus } = useKYC();
  
  const [formData, setFormData] = useState<KYCFormData>({
    first_name: kycSubmission?.first_name || '',
    last_name: kycSubmission?.last_name || '',
    date_of_birth: kycSubmission?.date_of_birth || '',
    mobile_number: '',
    aadhaar_number: '',
    pan_number: '',
    aadhaar_front: null,
    aadhaar_back: null,
    pan_document: null,
    bank_statement: null,
    face_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState({
    aadhaar_front: '',
    aadhaar_back: '',
    pan_document: '',
    bank_statement: '',
    face_image: '',
  });
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({
    aadhaar_front: '',
    aadhaar_back: '',
    pan_document: '',
    bank_statement: '',
    face_image: '',
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof fileNames) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [field]: 'File size must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, [field]: file }));
      setFileNames(prev => ({ ...prev, [field]: file.name }));
      setErrors(prev => ({ ...prev, [field]: '' }));
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, clear preview (show PDF icon instead)
        setFilePreviews(prev => ({ ...prev, [field]: 'pdf' }));
      }
    }
  };

  const handleCameraCapture = (file: File) => {
    setFormData(prev => ({ ...prev, face_image: file }));
    setFileNames(prev => ({ ...prev, face_image: file.name }));
    setErrors(prev => ({ ...prev, face_image: '' }));
    
    // Generate preview for captured image
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreviews(prev => ({ ...prev, face_image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = kycSchema.safeParse({
      first_name: formData.first_name,
      last_name: formData.last_name,
      date_of_birth: formData.date_of_birth,
      mobile_number: formData.mobile_number,
      aadhaar_number: formData.aadhaar_number,
      pan_number: formData.pan_number.toUpperCase(),
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    // Validate files
    if (!formData.aadhaar_front) {
      setErrors(prev => ({ ...prev, aadhaar_front: 'Aadhaar front is required' }));
      return;
    }
    if (!formData.aadhaar_back) {
      setErrors(prev => ({ ...prev, aadhaar_back: 'Aadhaar back is required' }));
      return;
    }
    if (!formData.pan_document) {
      setErrors(prev => ({ ...prev, pan_document: 'PAN document is required' }));
      return;
    }
    if (!formData.bank_statement) {
      setErrors(prev => ({ ...prev, bank_statement: 'Bank statement is required' }));
      return;
    }
    if (!formData.face_image) {
      setErrors(prev => ({ ...prev, face_image: 'Face image is required' }));
      return;
    }

    submitKYC(formData);
  };

  const isApproved = kycStatus === 'approved';
  const isSubmitted = kycStatus === 'submitted';

  if (isApproved) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">KYC Verified</h3>
            <p className="text-muted-foreground">Your identity has been successfully verified.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubmitted) {
    return (
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Under Review</h3>
            <p className="text-muted-foreground">Your KYC documents are being reviewed. Please check back later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Enter your legal name as per government documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  className={errors.last_name ? 'border-red-500' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className={cn("pl-10 w-full min-w-0", errors.date_of_birth ? 'border-red-500' : '')}
                  />
                </div>
                {errors.date_of_birth && (
                  <p className="text-sm text-red-500">{errors.date_of_birth}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="mobile_number"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    className={cn("pl-10 w-full min-w-0", errors.mobile_number ? 'border-red-500' : '')}
                  />
                </div>
                {errors.mobile_number && (
                  <p className="text-sm text-red-500">{errors.mobile_number}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Identity Documents
            </CardTitle>
            <CardDescription>Enter your Aadhaar and PAN details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
              <Input
                id="aadhaar_number"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleInputChange}
                placeholder="Enter 12-digit Aadhaar"
                maxLength={12}
                className={errors.aadhaar_number ? 'border-red-500' : ''}
              />
              {errors.aadhaar_number && (
                <p className="text-sm text-red-500">{errors.aadhaar_number}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                placeholder="e.g., ABCDE1234F"
                maxLength={10}
                className={cn("uppercase", errors.pan_number ? 'border-red-500' : '')}
              />
              {errors.pan_number && (
                <p className="text-sm text-red-500">{errors.pan_number}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Uploads
            </CardTitle>
            <CardDescription>Upload clear images of your documents (max 5MB each)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Aadhaar Front */}
            <div className="space-y-2">
              <Label>Aadhaar Card (Front)</Label>
              <div className="flex gap-4 items-start">
                <label className={cn(
                  "flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  fileNames.aadhaar_front ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-primary hover:bg-accent/50',
                  errors.aadhaar_front && 'border-red-500'
                )}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {fileNames.aadhaar_front ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-sm text-foreground truncate max-w-[200px]">{fileNames.aadhaar_front}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload Aadhaar front</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'aadhaar_front')}
                  />
                </label>
                {filePreviews.aadhaar_front && (
                  <div className="w-24 h-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {filePreviews.aadhaar_front === 'pdf' ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">PDF</span>
                      </div>
                    ) : (
                      <img 
                        src={filePreviews.aadhaar_front} 
                        alt="Aadhaar Front Preview" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
              {errors.aadhaar_front && (
                <p className="text-sm text-red-500">{errors.aadhaar_front}</p>
              )}
            </div>

            {/* Aadhaar Back */}
            <div className="space-y-2">
              <Label>Aadhaar Card (Back)</Label>
              <div className="flex gap-4 items-start">
                <label className={cn(
                  "flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  fileNames.aadhaar_back ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-primary hover:bg-accent/50',
                  errors.aadhaar_back && 'border-red-500'
                )}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {fileNames.aadhaar_back ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-sm text-foreground truncate max-w-[200px]">{fileNames.aadhaar_back}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload Aadhaar back</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'aadhaar_back')}
                  />
                </label>
                {filePreviews.aadhaar_back && (
                  <div className="w-24 h-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {filePreviews.aadhaar_back === 'pdf' ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">PDF</span>
                      </div>
                    ) : (
                      <img 
                        src={filePreviews.aadhaar_back} 
                        alt="Aadhaar Back Preview" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
              {errors.aadhaar_back && (
                <p className="text-sm text-red-500">{errors.aadhaar_back}</p>
              )}
            </div>

            {/* PAN Document */}
            <div className="space-y-2">
              <Label>PAN Card</Label>
              <div className="flex gap-4 items-start">
                <label className={cn(
                  "flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  fileNames.pan_document ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-primary hover:bg-accent/50',
                  errors.pan_document && 'border-red-500'
                )}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {fileNames.pan_document ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-sm text-foreground truncate max-w-[200px]">{fileNames.pan_document}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload PAN card</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'pan_document')}
                  />
                </label>
                {filePreviews.pan_document && (
                  <div className="w-24 h-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {filePreviews.pan_document === 'pdf' ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">PDF</span>
                      </div>
                    ) : (
                      <img 
                        src={filePreviews.pan_document} 
                        alt="PAN Card Preview" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
              {errors.pan_document && (
                <p className="text-sm text-red-500">{errors.pan_document}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Bank Statement
            </CardTitle>
            <CardDescription>Upload your recent bank statement (max 5MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Bank Statement (PDF or Image)</Label>
              <div className="flex gap-4 items-start">
                <label className={cn(
                  "flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  fileNames.bank_statement ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-primary hover:bg-accent/50',
                  errors.bank_statement && 'border-red-500'
                )}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {fileNames.bank_statement ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-sm text-foreground truncate max-w-[200px]">{fileNames.bank_statement}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload bank statement</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'bank_statement')}
                  />
                </label>
                {filePreviews.bank_statement && (
                  <div className="w-24 h-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {filePreviews.bank_statement === 'pdf' ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">PDF</span>
                      </div>
                    ) : (
                      <img 
                        src={filePreviews.bank_statement} 
                        alt="Bank Statement Preview" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
              {errors.bank_statement && (
                <p className="text-sm text-red-500">{errors.bank_statement}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Face Image Capture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Face Verification
            </CardTitle>
            <CardDescription>Take a real-time photo or upload a clear image of your face</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-1 grid gap-4 sm:grid-cols-2">
                {/* Camera Capture Option */}
                <div className="space-y-2">
                  <Label>Capture with Camera</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full h-32 flex flex-col items-center justify-center gap-2",
                      fileNames.face_image && !fileNames.face_image.includes('upload') && 'border-emerald-500 bg-emerald-500/5'
                    )}
                    onClick={() => setIsCameraOpen(true)}
                  >
                    {fileNames.face_image && fileNames.face_image.startsWith('face_') ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                        <span className="text-sm">Photo captured</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Open Camera</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Upload Option */}
                <div className="space-y-2">
                  <Label>Or Upload Image</Label>
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    fileNames.face_image && fileNames.face_image.includes('upload') ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-primary hover:bg-accent/50',
                    errors.face_image && 'border-red-500'
                  )}>
                    <div className="flex flex-col items-center justify-center">
                      {fileNames.face_image && !fileNames.face_image.startsWith('face_') ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                          <p className="text-sm text-foreground truncate max-w-[150px]">{fileNames.face_image}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setErrors(prev => ({ ...prev, face_image: 'File size must be less than 5MB' }));
                            return;
                          }
                          const renamedFile = new File([file], `upload_${file.name}`, { type: file.type });
                          setFormData(prev => ({ ...prev, face_image: renamedFile }));
                          setFileNames(prev => ({ ...prev, face_image: file.name }));
                          setErrors(prev => ({ ...prev, face_image: '' }));
                          
                          // Generate preview
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFilePreviews(prev => ({ ...prev, face_image: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              {filePreviews.face_image && filePreviews.face_image !== 'pdf' && (
                <div className="w-24 h-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  <img 
                    src={filePreviews.face_image} 
                    alt="Face Image Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            {errors.face_image && (
              <p className="text-sm text-red-500">{errors.face_image}</p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Submit KYC
            </>
          )}
        </Button>
      </div>

      {/* Camera Dialog */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </form>
  );
};
