import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  action?: string;
  isCompleted: boolean;
  category: 'profile' | 'kyc' | 'storefront' | 'orders' | 'workspace' | 'payments';
  priority: number;
}

export interface OnboardingCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: OnboardingStep[];
  progress: number;
}

interface OnboardingContextType {
  allSteps: OnboardingStep[];
  categories: OnboardingCategory[];
  completedSteps: string[];
  overallProgress: number;
  markStepCompleted: (stepId: string) => void;
  resetProgress: () => void;
  // Wizard
  isWizardOpen: boolean;
  startWizard: () => void;
  closeWizard: () => void;
  // Tour
  isTourActive: boolean;
  currentTourStep: number;
  startTour: () => void;
  stopTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  // Cards
  showOnboardingCards: boolean;
  hideOnboardingCards: () => void;
  // Helpers
  getNextStep: () => OnboardingStep | undefined;
  getPendingStepsByCategory: (categoryId: string) => OnboardingStep[];
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = 'user_onboarding_progress';

export const OnboardingContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOnboardingCards, setShowOnboardingCards] = useState(true);

  // Load completed steps from localStorage
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        try {
          setCompletedSteps(JSON.parse(stored));
        } catch {
          setCompletedSteps([]);
        }
      }
    }
  }, [user?.id]);

  // Check if cards should be hidden
  useEffect(() => {
    if (user?.id) {
      const hidden = localStorage.getItem(`${STORAGE_KEY}_cards_hidden_${user.id}`);
      if (hidden === 'true') {
        setShowOnboardingCards(false);
      }
    }
  }, [user?.id]);

  // Define all onboarding steps
  const allSteps: OnboardingStep[] = [
    // Profile Setup
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add your name and profile picture to personalize your account',
      route: '/dashboard/profile',
      action: 'Go to Profile',
      isCompleted: completedSteps.includes('complete_profile'),
      category: 'profile',
      priority: 1,
    },
    {
      id: 'set_password',
      title: 'Set a Strong Password',
      description: 'Secure your account with a strong password',
      route: '/dashboard/profile',
      action: 'Update Password',
      isCompleted: completedSteps.includes('set_password'),
      category: 'profile',
      priority: 2,
    },
    {
      id: 'enable_2fa',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      route: '/dashboard/profile',
      action: 'Enable 2FA',
      isCompleted: completedSteps.includes('enable_2fa'),
      category: 'profile',
      priority: 3,
    },

    // KYC Verification
    {
      id: 'start_kyc',
      title: 'Start KYC Verification',
      description: 'Begin your identity verification process',
      route: '/dashboard/kyc',
      action: 'Start KYC',
      isCompleted: completedSteps.includes('start_kyc'),
      category: 'kyc',
      priority: 1,
    },
    {
      id: 'upload_aadhaar',
      title: 'Upload Aadhaar Card',
      description: 'Upload front and back of your Aadhaar card',
      route: '/dashboard/kyc',
      action: 'Upload Documents',
      isCompleted: completedSteps.includes('upload_aadhaar'),
      category: 'kyc',
      priority: 2,
    },
    {
      id: 'upload_pan',
      title: 'Upload PAN Card',
      description: 'Upload your PAN card for verification',
      route: '/dashboard/kyc',
      action: 'Upload PAN',
      isCompleted: completedSteps.includes('upload_pan'),
      category: 'kyc',
      priority: 3,
    },
    {
      id: 'capture_selfie',
      title: 'Take a Selfie',
      description: 'Capture a clear photo of yourself for verification',
      route: '/dashboard/kyc',
      action: 'Take Selfie',
      isCompleted: completedSteps.includes('capture_selfie'),
      category: 'kyc',
      priority: 4,
    },
    {
      id: 'submit_kyc',
      title: 'Submit KYC for Review',
      description: 'Submit all documents for admin review',
      route: '/dashboard/kyc',
      action: 'Submit KYC',
      isCompleted: completedSteps.includes('submit_kyc'),
      category: 'kyc',
      priority: 5,
    },

    // Storefront Setup
    {
      id: 'setup_storefront',
      title: 'Set Up Your Storefront',
      description: 'Create your unique store name and URL',
      route: '/dashboard/storefront',
      action: 'Setup Store',
      isCompleted: completedSteps.includes('setup_storefront'),
      category: 'storefront',
      priority: 1,
    },
    {
      id: 'add_first_product',
      title: 'Add Your First Product',
      description: 'Select and add products to your store',
      route: '/dashboard/products',
      action: 'Add Products',
      isCompleted: completedSteps.includes('add_first_product'),
      category: 'storefront',
      priority: 2,
    },
    {
      id: 'customize_prices',
      title: 'Set Your Prices',
      description: 'Customize selling prices for your products',
      route: '/dashboard/products',
      action: 'Set Prices',
      isCompleted: completedSteps.includes('customize_prices'),
      category: 'storefront',
      priority: 3,
    },
    {
      id: 'share_store',
      title: 'Share Your Store',
      description: 'Share your store link with customers',
      route: '/dashboard/storefront',
      action: 'Share Store',
      isCompleted: completedSteps.includes('share_store'),
      category: 'storefront',
      priority: 4,
    },

    // Orders Management
    {
      id: 'receive_first_order',
      title: 'Receive Your First Order',
      description: 'Wait for a customer to place an order',
      route: '/dashboard/orders',
      action: 'View Orders',
      isCompleted: completedSteps.includes('receive_first_order'),
      category: 'orders',
      priority: 1,
    },
    {
      id: 'pay_for_order',
      title: 'Pay for an Order',
      description: 'Make payment to fulfill customer orders',
      route: '/dashboard/orders',
      action: 'Pay Now',
      isCompleted: completedSteps.includes('pay_for_order'),
      category: 'orders',
      priority: 2,
    },
    {
      id: 'track_order',
      title: 'Track Order Status',
      description: 'Monitor your order from payment to delivery',
      route: '/dashboard/orders',
      action: 'Track Orders',
      isCompleted: completedSteps.includes('track_order'),
      category: 'orders',
      priority: 3,
    },
    {
      id: 'complete_order',
      title: 'Complete Your First Order',
      description: 'Successfully complete an order cycle',
      route: '/dashboard/orders',
      action: 'View Completed',
      isCompleted: completedSteps.includes('complete_order'),
      category: 'orders',
      priority: 4,
    },

    // Workspace & Proofs
    {
      id: 'view_workspace',
      title: 'Explore Workspace',
      description: 'Learn about proof of work submission',
      route: '/dashboard/workspace',
      action: 'Go to Workspace',
      isCompleted: completedSteps.includes('view_workspace'),
      category: 'workspace',
      priority: 1,
    },
    {
      id: 'submit_first_proof',
      title: 'Submit Your First Proof',
      description: 'Submit proof of your promotional work',
      route: '/dashboard/workspace',
      action: 'Submit Proof',
      isCompleted: completedSteps.includes('submit_first_proof'),
      category: 'workspace',
      priority: 2,
    },
    {
      id: 'check_proof_status',
      title: 'Check Proof Status',
      description: 'Monitor your submitted proofs',
      route: '/dashboard/workspace',
      action: 'View Status',
      isCompleted: completedSteps.includes('check_proof_status'),
      category: 'workspace',
      priority: 3,
    },

    // Payments
    {
      id: 'add_payment_method',
      title: 'Add Payment Method',
      description: 'Set up your preferred payment method',
      route: '/dashboard/payments',
      action: 'Add Payment',
      isCompleted: completedSteps.includes('add_payment_method'),
      category: 'payments',
      priority: 1,
    },
    {
      id: 'add_wallet_funds',
      title: 'Add Funds to Wallet',
      description: 'Top up your wallet for quick payments',
      route: '/dashboard/payments',
      action: 'Add Funds',
      isCompleted: completedSteps.includes('add_wallet_funds'),
      category: 'payments',
      priority: 2,
    },
    {
      id: 'request_payout',
      title: 'Request Your First Payout',
      description: 'Withdraw your earnings to your bank',
      route: '/dashboard/payments',
      action: 'Request Payout',
      isCompleted: completedSteps.includes('request_payout'),
      category: 'payments',
      priority: 3,
    },
  ];

  // Group steps by category
  const categories: OnboardingCategory[] = [
    {
      id: 'profile',
      title: 'Profile Setup',
      description: 'Complete your profile and secure your account',
      icon: 'User',
      steps: allSteps.filter(s => s.category === 'profile'),
      progress: 0,
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      description: 'Verify your identity to unlock all features',
      icon: 'Shield',
      steps: allSteps.filter(s => s.category === 'kyc'),
      progress: 0,
    },
    {
      id: 'storefront',
      title: 'Storefront Setup',
      description: 'Set up your store and start selling',
      icon: 'Store',
      steps: allSteps.filter(s => s.category === 'storefront'),
      progress: 0,
    },
    {
      id: 'orders',
      title: 'Order Management',
      description: 'Learn to manage and fulfill orders',
      icon: 'ShoppingCart',
      steps: allSteps.filter(s => s.category === 'orders'),
      progress: 0,
    },
    {
      id: 'workspace',
      title: 'Workspace & Proofs',
      description: 'Submit and track your work proofs',
      icon: 'Briefcase',
      steps: allSteps.filter(s => s.category === 'workspace'),
      progress: 0,
    },
    {
      id: 'payments',
      title: 'Payments & Payouts',
      description: 'Manage payments and withdraw earnings',
      icon: 'Wallet',
      steps: allSteps.filter(s => s.category === 'payments'),
      progress: 0,
    },
  ].map(cat => ({
    ...cat,
    progress: cat.steps.length > 0 
      ? Math.round((cat.steps.filter(s => s.isCompleted).length / cat.steps.length) * 100)
      : 0,
  }));

  const overallProgress = allSteps.length > 0
    ? Math.round((completedSteps.length / allSteps.length) * 100)
    : 0;

  const markStepCompleted = useCallback((stepId: string) => {
    if (!user?.id) return;
    
    setCompletedSteps(prev => {
      if (prev.includes(stepId)) return prev;
      const updated = [...prev, stepId];
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user?.id]);

  const resetProgress = useCallback(() => {
    if (!user?.id) return;
    setCompletedSteps([]);
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
  }, [user?.id]);

  const startWizard = useCallback(() => {
    setIsWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    setIsWizardOpen(false);
  }, []);

  const startTour = useCallback(() => {
    setIsTourActive(true);
    setCurrentTourStep(0);
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentTourStep(0);
  }, []);

  const nextTourStep = useCallback(() => {
    const incompleteSteps = allSteps.filter(s => !s.isCompleted);
    if (currentTourStep < incompleteSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      stopTour();
    }
  }, [currentTourStep, allSteps, stopTour]);

  const prevTourStep = useCallback(() => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1);
    }
  }, [currentTourStep]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const hideOnboardingCards = useCallback(() => {
    setShowOnboardingCards(false);
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_cards_hidden_${user.id}`, 'true');
    }
  }, [user?.id]);

  const getNextStep = useCallback(() => {
    return allSteps.find(s => !s.isCompleted);
  }, [allSteps]);

  const getPendingStepsByCategory = useCallback((categoryId: string) => {
    return allSteps.filter(s => s.category === categoryId && !s.isCompleted);
  }, [allSteps]);

  const value: OnboardingContextType = {
    allSteps,
    categories,
    completedSteps,
    overallProgress,
    markStepCompleted,
    resetProgress,
    isWizardOpen,
    startWizard,
    closeWizard,
    isTourActive,
    currentTourStep,
    startTour,
    stopTour,
    nextTourStep,
    prevTourStep,
    isSidebarOpen,
    toggleSidebar,
    showOnboardingCards,
    hideOnboardingCards,
    getNextStep,
    getPendingStepsByCategory,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingContextProvider');
  }
  return context;
};
