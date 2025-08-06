import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, BookOpen, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumEmptyStateProps {
  title: string;
  description: string;
  buttonText: string;
  onAddStudent: () => void;
}

export const PremiumEmptyState = ({ 
  title, 
  description, 
  buttonText, 
  onAddStudent 
}: PremiumEmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <Card className="bg-gradient-card border-0 shadow-soft overflow-hidden relative">
        {/* Decorative background elements */}
        <motion.div
          className="absolute top-4 right-4 text-primary/10"
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <BookOpen className="h-32 w-32" />
        </motion.div>
        
        <motion.div
          className="absolute bottom-4 left-4 text-secondary/10"
          animate={{ 
            rotate: [360, 0],
            scale: [1.1, 1, 1.1]
          }}
          transition={{ 
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Target className="h-24 w-24" />
        </motion.div>

        <CardContent className="flex flex-col items-center justify-center py-20 px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative mb-6"
          >
            <motion.div
              className="p-6 rounded-full bg-gradient-primary shadow-elegant"
              whileHover={{ scale: 1.05 }}
              animate={{
                boxShadow: [
                  "0 10px 30px -10px rgba(var(--primary), 0.3)",
                  "0 20px 40px -10px rgba(var(--primary), 0.4)",
                  "0 10px 30px -10px rgba(var(--primary), 0.3)"
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Users className="h-12 w-12 text-white" />
            </motion.div>
            
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ 
                  x: 0, 
                  y: 0,
                  opacity: 0
                }}
                animate={{ 
                  x: Math.cos(i * 60 * Math.PI / 180) * 60,
                  y: Math.sin(i * 60 * Math.PI / 180) * 60,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
          
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-2xl font-semibold text-foreground mb-3 text-center"
          >
            {title}
          </motion.h3>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed"
          >
            {description}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={onAddStudent}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 font-dyslexia px-8 py-3 text-lg shadow-elegant hover:shadow-glow transition-all duration-300"
            >
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-5 w-5" />
                {buttonText}
              </motion.div>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};