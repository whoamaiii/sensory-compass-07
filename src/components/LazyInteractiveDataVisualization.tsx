import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const InteractiveDataVisualization = lazy(() => import('./InteractiveDataVisualization').then(module => ({ default: module.InteractiveDataVisualization }))
);

export const LazyInteractiveDataVisualization = (props: React.ComponentProps<typeof InteractiveDataVisualization>) => (
  <Suspense fallback={<LoadingSpinner />}>
    <InteractiveDataVisualization {...props} />
  </Suspense>
);
