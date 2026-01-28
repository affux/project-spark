import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}

/**
 * AnimatedSection component with forwardRef support.
 * Prevents "Function components cannot be given refs" React warnings
 * when used inside layouts that may pass refs.
 */
export const AnimatedSection = React.forwardRef<HTMLDivElement, AnimatedSectionProps>(
  ({ children, className = '', delay = 0, direction = 'up' }, forwardedRef) => {
    const { ref: localRef, isVisible } = useScrollAnimation<HTMLDivElement>(0.1);

    const setRefs = (node: HTMLDivElement | null) => {
      // keep our internal ref for IntersectionObserver
      (localRef as React.MutableRefObject<HTMLDivElement | null>).current = node;

      // forward ref to parents if they provide one
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    const getTransform = () => {
      if (isVisible) return 'translate(0, 0) scale(1)';
      switch (direction) {
        case 'up':
          return 'translateY(40px)';
        case 'left':
          return 'translateX(-40px)';
        case 'right':
          return 'translateX(40px)';
        case 'scale':
          return 'scale(0.95)';
        default:
          return 'translateY(40px)';
      }
    };

    return (
      <div
        ref={setRefs}
        className={className}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: getTransform(),
          transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
        }}
      >
        {children}
      </div>
    );
  }
);

AnimatedSection.displayName = 'AnimatedSection';

// Alias for backwards compatibility
export const AnimatedSectionWithRef = AnimatedSection;
