import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollVisibility } from '@/hooks/useScrollAnimation';

export const FloatingCTA: React.FC = () => {
  const isVisible = useScrollVisibility(600);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      <Button
        asChild
        size="lg"
        className="rounded-full bg-gradient-to-r from-accent to-amber-500 hover:from-accent/90 hover:to-amber-500/90 text-accent-foreground shadow-2xl shadow-accent/30 transition-all hover:scale-105 hover:shadow-accent/40 px-8"
      >
        <Link to="/login">
          Get Started Free
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
};
