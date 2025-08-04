import React, { lazy, ComponentType, Suspense } from 'react';
import { LazyLoadWrapper } from './LazyLoadWrapper';

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadWrapper>
    );
  };
}
