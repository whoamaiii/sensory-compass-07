import React, { lazy, ComponentType, Suspense } from 'react';
import { LazyLoadWrapper } from './LazyLoadWrapper';

export function createLazyComponent(
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function WrappedLazyComponent(props: any) {
    return (
      <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
        <Suspense fallback={fallback ?? null}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadWrapper>
    );
  };
}
