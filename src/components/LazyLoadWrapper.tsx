import React, { Suspense, lazy, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { ErrorWrapper } from './ErrorWrapper';
import { logger } from '@/lib/logger';

interface LazyLoadWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
}

const DefaultFallback = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-center space-y-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading component...</p>
        </div>
      </div>
      <div className="space-y-3 mt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CardContent>
  </Card>
);

const DefaultErrorFallback = () => (
  <Card className="border-destructive/20">
    <CardContent className="p-6">
      <div className="text-center">
        <p className="text-destructive font-medium">Failed to load component</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please refresh the page or try again later.
        </p>
      </div>
    </CardContent>
  </Card>
);

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  fallback = <DefaultFallback />,
  errorFallback = <DefaultErrorFallback />,
  children
}) => {
  return (
    <ErrorWrapper fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorWrapper>
  );
};

