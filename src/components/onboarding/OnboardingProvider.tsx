import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';
import { OnboardingTour } from './OnboardingTour';
import { OnboardingSidebar } from './OnboardingSidebar';
import { OnboardingFAB } from './OnboardingFAB';

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <OnboardingWizard />
      <OnboardingTour />
      <OnboardingSidebar />
      <OnboardingFAB />
    </>
  );
};
