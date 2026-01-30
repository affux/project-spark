import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { OnboardingContextProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'test-user-123', role: 'user', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <OnboardingContextProvider>
        {children}
      </OnboardingContextProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('OnboardingContext', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide initial state with all steps incomplete', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.allSteps).toBeDefined();
    expect(result.current.allSteps.length).toBeGreaterThan(0);
    expect(result.current.overallProgress).toBe(0);
    expect(result.current.completedSteps).toEqual([]);
  });

  it('should have correct number of categories', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.categories).toHaveLength(6);
    expect(result.current.categories.map(c => c.id)).toEqual([
      'profile',
      'kyc',
      'storefront',
      'orders',
      'workspace',
      'payments',
    ]);
  });

  it('should mark step as completed', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.markStepCompleted('complete_profile');
    });

    expect(result.current.completedSteps).toContain('complete_profile');
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('should not duplicate completed steps', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.markStepCompleted('complete_profile');
      result.current.markStepCompleted('complete_profile');
    });

    expect(result.current.completedSteps.filter(s => s === 'complete_profile')).toHaveLength(1);
  });

  it('should calculate progress correctly', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    const totalSteps = result.current.allSteps.length;

    act(() => {
      result.current.markStepCompleted('complete_profile');
    });

    expect(result.current.overallProgress).toBe(Math.round((1 / totalSteps) * 100));
  });

  it('should open and close wizard', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isWizardOpen).toBe(false);

    act(() => {
      result.current.startWizard();
    });

    expect(result.current.isWizardOpen).toBe(true);

    act(() => {
      result.current.closeWizard();
    });

    expect(result.current.isWizardOpen).toBe(false);
  });

  it('should start and stop tour', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isTourActive).toBe(false);

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isTourActive).toBe(true);
    expect(result.current.currentTourStep).toBe(0);

    act(() => {
      result.current.stopTour();
    });

    expect(result.current.isTourActive).toBe(false);
    expect(result.current.currentTourStep).toBe(0);
  });

  it('should navigate tour steps', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.currentTourStep).toBe(0);

    act(() => {
      result.current.nextTourStep();
    });

    expect(result.current.currentTourStep).toBe(1);

    act(() => {
      result.current.prevTourStep();
    });

    expect(result.current.currentTourStep).toBe(0);
  });

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isSidebarOpen).toBe(false);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.isSidebarOpen).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('should reset progress', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.markStepCompleted('complete_profile');
      result.current.markStepCompleted('start_kyc');
    });

    expect(result.current.completedSteps.length).toBe(2);

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.completedSteps).toEqual([]);
    expect(mockLocalStorage.removeItem).toHaveBeenCalled();
  });

  it('should get next incomplete step', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    const nextStep = result.current.getNextStep();
    expect(nextStep).toBeDefined();
    expect(nextStep?.isCompleted).toBe(false);
  });

  it('should get pending steps by category', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    const pendingProfileSteps = result.current.getPendingStepsByCategory('profile');
    expect(pendingProfileSteps.length).toBeGreaterThan(0);
    expect(pendingProfileSteps.every(s => s.category === 'profile')).toBe(true);
  });

  it('should hide onboarding cards', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.showOnboardingCards).toBe(true);

    act(() => {
      result.current.hideOnboardingCards();
    });

    expect(result.current.showOnboardingCards).toBe(false);
  });
});
