import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ErrorWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultErrorFallback = () => (
  <Card className="border-destructive/20">
    <CardContent className="p-6">
      <div className="flex items-center gap-3 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <span>Something went wrong loading this component</span>
      </div>
    </CardContent>
  </Card>
);

export const ErrorWrapper: React.FC<ErrorWrapperProps> = ({ 
  children, 
  fallback = <DefaultErrorFallback /> 
}) => {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};