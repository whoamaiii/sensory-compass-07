import React, { memo, useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Optimized AnimatedCounter with React.memo and performance improvements
 * Uses requestAnimationFrame for smoother animations
 */
export const OptimizedAnimatedCounter = memo(({ value, duration = 0.8, className }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Easing function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValueRef.current + (value - startValueRef.current) * easeOutQuart;
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end at the exact value
        setDisplayValue(value);
        startValueRef.current = value;
      }
    };

    // Start animation
    startTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}, (prevProps, nextProps) => {
  // Only re-render if value, duration, or className changes
  return (
    prevProps.value === nextProps.value &&
    prevProps.duration === nextProps.duration &&
    prevProps.className === nextProps.className
  );
});

OptimizedAnimatedCounter.displayName = 'OptimizedAnimatedCounter';