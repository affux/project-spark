import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}) => {
  const { ref: localRef, isVisible } = useScrollAnimation<HTMLDivElement>(0.1);

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
      ref={localRef}
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
};

// ForwardRef wrapper to avoid "Function components cannot be given refs" warnings
// when this component is used as a child of Radix/shadcn `asChild` components.
export const AnimatedSectionWithRef = React.forwardRef<HTMLDivElement, AnimatedSectionProps>(
  (props, forwardedRef) => {
    const { ref: localRef, isVisible } = useScrollAnimation<HTMLDivElement>(0.1);

    const setRefs = (node: HTMLDivElement | null) => {
      // keep our internal ref for IntersectionObserver
      (localRef as React.MutableRefObject<HTMLDivElement | null>).current = node;

      // forward ref to parents if they provide one
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const { children, className = '', delay = 0, direction = 'up' } = props;

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
  },
);
AnimatedSectionWithRef.displayName = 'AnimatedSection';
