import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ErrorBoundaryFallbackProps {
  error: Error;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  onRetry,
  onReload,
  onGoHome
}) => {
  const { tCommon } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/20">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">
            {String(tCommon('error.title'))}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {String(tCommon('error.description'))}
          </p>
          
          {import.meta.env.DEV && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground mb-2">
                Technical Details
              </summary>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                {error.message}
                {error.stack && '\n\nStack trace:\n' + error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={onRetry} variant="default" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              {String(tCommon('buttons.tryAgain'))}
            </Button>
            
            <div className="flex gap-2">
              <Button onClick={onReload} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                {String(tCommon('buttons.reload'))}
              </Button>
              
              <Button onClick={onGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                {String(tCommon('buttons.home'))}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};