import { useEffect, useState, memo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = memo(({ value, duration = 0.8, className }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (latest) => Math.round(latest));

  useEffect(() => {
    let mounted = true;
    
    const animate = async () => {
      if (mounted) {
        spring.set(value);
      }
    };

    animate();

    const unsubscribe = display.on('change', (latest) => {
      if (mounted) {
        setDisplayValue(latest);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [value, spring, display]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {displayValue}
    </motion.span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';
