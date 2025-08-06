import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface PremiumStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  index: number;
  isLoading?: boolean;
  loadingText?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const PremiumStatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  index, 
  isLoading = false,
  loadingText = "Loading...",
  trend 
}: PremiumStatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6,
        delay: index * 0.1,
        type: "spring",
        stiffness: 120,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-500 hover:scale-[1.02]">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ 
              scale: 1.1, 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
            className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"
          >
            <Icon className="h-4 w-4 text-primary" />
          </motion.div>
        </CardHeader>
        
        <CardContent>
          <div className="text-3xl font-bold text-primary mb-1">
            {isLoading ? (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm text-muted-foreground"
              >
                {loadingText}
              </motion.div>
            ) : (
              <AnimatedCounter value={value} />
            )}
          </div>
          
          {trend && !isLoading && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "text-xs flex items-center gap-1",
                trend.isPositive ? "text-positive" : "text-destructive"
              )}
            >
              <span className={cn(
                "inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-l-transparent border-r-transparent",
                trend.isPositive 
                  ? "border-b-[4px] border-b-positive" 
                  : "border-t-[4px] border-t-destructive"
              )} />
              {Math.abs(trend.value)}% fra forrige uke
            </motion.div>
          )}
          
          <p className="text-xs text-muted-foreground mt-1">
            {title}
          </p>
        </CardContent>
        
        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 blur-xl"
          animate={{ 
            x: [-100, 100],
            transition: { 
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse"
            }
          }}
        />
      </Card>
    </motion.div>
  );
};