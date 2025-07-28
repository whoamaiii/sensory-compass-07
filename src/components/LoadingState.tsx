import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface LoadingStateProps {
  type?: 'page' | 'card' | 'inline';
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  type = 'card', 
  message,
  rows = 3 
}) => {
  const { tCommon } = useTranslation();
  const defaultMessage = String(tCommon('status.loading'));

  if (type === 'page') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-dyslexia">
            {message || defaultMessage}...
          </p>
        </div>
      </div>
    );
  }

  if (type === 'inline') {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground font-dyslexia">
          {message || defaultMessage}...
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-dyslexia">
            {message || defaultMessage}...
          </span>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
};