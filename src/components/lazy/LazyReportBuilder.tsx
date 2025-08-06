import { createLazyComponent } from './LazyLoadWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const LoadingFallback = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5 animate-pulse" />
        Loading Report Builder...
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CardContent>
  </Card>
);

export const LazyReportBuilder = createLazyComponent(
  () => import('@/components/ReportBuilder').then(module => ({
    default: module.ReportBuilder
  })),
  <LoadingFallback />
);