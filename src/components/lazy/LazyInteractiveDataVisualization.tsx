import { createLazyComponent } from './LazyLoadWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

const LoadingFallback = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Activity className="h-5 w-5 animate-pulse" />
        Loading Interactive Visualization...
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ErrorFallback = () => (
  <Card className="border-destructive/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        Failed to load Interactive Visualization
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        The interactive data visualization component could not be loaded. 
        This might be due to missing dependencies or a temporary loading issue.
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Please refresh the page or contact support if the issue persists.
      </p>
    </CardContent>
  </Card>
);

export const LazyInteractiveDataVisualization = createLazyComponent(
  () => {
    logger.debug('[LazyInteractiveDataVisualization] Starting to load component');

    // Helper: load the primary component with a timeout, then fall back.
    const loadPrimary = async () => {
      const mod = await import('@/components/InteractiveDataVisualization');
      if (!mod.InteractiveDataVisualization) {
        throw new Error('InteractiveDataVisualization export not found');
      }
      return { default: mod.InteractiveDataVisualization };
    };

    const loadMinimal = async () => {
      const mod = await import('@/components/InteractiveDataVisualization.minimal');
      return { default: mod.InteractiveDataVisualization };
    };

    const loadDebug = async () => {
      const mod = await import('@/components/InteractiveDataVisualization.debug');
      return { default: mod.InteractiveDataVisualization };
    };

    // Race primary import against a timeout to avoid indefinite Suspense
    return new Promise<{ default: React.ComponentType<any> }>((resolve, reject) => {
      let settled = false;
      const timeoutMs = 4000; // 4s safety timeout
      const timer = setTimeout(async () => {
        if (settled) return;
        logger.warn('[LazyInteractiveDataVisualization] Primary import timed out, attempting minimal fallback');
        try {
          const res = await loadMinimal();
          settled = true;
          resolve(res);
        } catch (e1) {
          logger.error('[LazyInteractiveDataVisualization] Minimal fallback failed, attempting debug', e1);
          try {
            const res = await loadDebug();
            settled = true;
            resolve(res);
          } catch (e2) {
            settled = true;
            reject(e2);
          }
        }
      }, timeoutMs);

      loadPrimary()
        .then(res => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          logger.debug('[LazyInteractiveDataVisualization] Component loaded successfully');
          resolve(res);
        })
        .catch(async (error) => {
          if (settled) return;
          logger.warn('[LazyInteractiveDataVisualization] Primary import failed, trying minimal', error);
          try {
            const res = await loadMinimal();
            settled = true;
            clearTimeout(timer);
            resolve(res);
          } catch (e1) {
            logger.error('[LazyInteractiveDataVisualization] Minimal version failed', e1);
            try {
              const res = await loadDebug();
              settled = true;
              clearTimeout(timer);
              resolve(res);
            } catch (e2) {
              settled = true;
              clearTimeout(timer);
              logger.error('[LazyInteractiveDataVisualization] All versions failed', e2);
              reject(error);
            }
          }
        });
    });
  },
  <LoadingFallback />,
  <ErrorFallback />
);
