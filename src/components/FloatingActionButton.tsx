import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const FloatingActionButton = ({ 
  onClick, 
  className,
  children 
}: FloatingActionButtonProps) => {
  return (
    <motion.div
      className={cn(
        "fixed bottom-8 right-8 z-50",
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay: 1,
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="h-14 w-14 rounded-full bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-glow transition-all duration-300 group"
      >
        <motion.div
          animate={{ rotate: [0, 0, 180, 180, 0] }}
          transition={{ 
            duration: 0.6,
            ease: "easeInOut"
          }}
          whileHover={{ 
            rotate: 90,
            transition: { duration: 0.2 }
          }}
        >
          {children || <Plus className="h-6 w-6 text-white" />}
        </motion.div>
        
        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </Button>
    </motion.div>
  );
};