import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

/**
 * Props for the ChartSkeleton component
 */
interface ChartSkeletonProps {
  /** Height of the skeleton (default: 400px) */
  height?: number | string;
  /** Width of the skeleton (default: 100%) */
  width?: number | string;
  /** Optional additional className */
  className?: string;
  /** Show title skeleton above chart (default: false) */
  showTitle?: boolean;
  /** Show legend skeleton below chart (default: false) */
  showLegend?: boolean;
  /** Variant style of the skeleton */
  variant?: 'default' | 'card' | 'bordered';
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
  /** Show axis labels skeleton (default: false) */
  showAxes?: boolean;
  /** Number of data point skeletons to show (for bar charts) */
  barCount?: number;
}

/**
 * ChartSkeleton Component
 * 
 * A reusable skeleton loader specifically designed for chart loading states.
 * Provides consistent loading UI across all chart components in the application.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ChartSkeleton height={400} />
 * 
 * // With title and legend
 * <ChartSkeleton height={300} showTitle showLegend />
 * 
 * // Bar chart skeleton
 * <ChartSkeleton height={350} variant="bordered" barCount={5} />
 * ```
 */
export const ChartSkeleton: React.FC<ChartSkeletonProps> = React.memo(({
  height = 400,
  width = '100%',
  className,
  showTitle = false,
  showLegend = false,
  variant = 'default',
  ariaLabel = 'Loading chart data',
  showAxes = false,
  barCount = 0,
}) => {
  // Convert height to string if number
  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  // Base classes for the main skeleton
  const baseClasses = cn(
    'w-full',
    variant === 'card' && 'rounded-xl p-4 bg-card',
    variant === 'bordered' && 'rounded-md border border-border/50',
    className
  );

  return (
    <div 
      className={baseClasses}
      style={{ width: widthStyle }}
      aria-label={ariaLabel}
      role="status"
      aria-busy="true"
    >
      {/* Title Skeleton */}
      {showTitle && (
        <div className="mb-4">
          <Skeleton className="h-6 w-48" />
        </div>
      )}

      {/* Main Chart Area */}
      <div className="relative" style={{ height: heightStyle }}>
        {/* Background skeleton */}
        <Skeleton 
          className={cn(
            "h-full w-full",
            variant === 'bordered' ? 'bg-muted/20' : 'bg-muted'
          )} 
        />

        {/* Bar chart data points */}
        {barCount > 0 && (
          <div className="absolute inset-0 flex items-end justify-around p-4">
            {Array.from({ length: barCount }).map((_, index) => (
              <Skeleton
                key={index}
                className="bg-muted/40"
                style={{
                  width: `${70 / barCount}%`,
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${index * 0.1}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Axes skeletons */}
        {showAxes && (
          <>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={`y-${i}`} className="h-3 w-8" />
              ))}
            </div>
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-12 right-0 flex justify-between px-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={`x-${i}`} className="h-3 w-12" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legend Skeleton */}
      {showLegend && (
        <div className="mt-4 flex items-center justify-center gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ChartSkeleton.displayName = 'ChartSkeleton';

/**
 * Props for the VisualizationSkeleton component
 */
interface VisualizationSkeletonProps extends Omit<ChartSkeletonProps, 'variant'> {
  /** Type of visualization being loaded */
  type?: 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter' | '3d' | 'timeline';
  /** Show loading message */
  showMessage?: boolean;
  /** Custom loading message */
  message?: string;
}

/**
 * VisualizationSkeleton Component
 * 
 * An enhanced skeleton loader that adapts to different visualization types.
 * 
 * @example
 * ```tsx
 * // Line chart skeleton
 * <VisualizationSkeleton type="line" height={300} showMessage />
 * 
 * // Heatmap skeleton
 * <VisualizationSkeleton type="heatmap" height={400} />
 * ```
 */
export const VisualizationSkeleton: React.FC<VisualizationSkeletonProps> = React.memo(({
  type = 'line',
  height = 400,
  width = '100%',
  className,
  showTitle = false,
  showLegend = false,
  showMessage = false,
  message,
  ariaLabel,
  ...props
}) => {
  // Determine the appropriate skeleton configuration based on type
  const getSkeletonConfig = () => {
    switch (type) {
      case 'bar':
        return { 
          barCount: 6, 
          showAxes: true,
          defaultMessage: 'Loading bar chart data...'
        };
      case 'line':
        return { 
          showAxes: true, 
          showLegend: true,
          defaultMessage: 'Loading trend data...'
        };
      case 'pie':
        return { 
          showLegend: true,
          defaultMessage: 'Loading distribution data...'
        };
      case 'heatmap':
        return { 
          variant: 'bordered' as const,
          defaultMessage: 'Loading correlation matrix...'
        };
      case 'scatter':
        return { 
          showAxes: true,
          defaultMessage: 'Loading scatter plot data...'
        };
      case '3d':
        return { 
          variant: 'bordered' as const,
          defaultMessage: 'Initializing 3D visualization...'
        };
      case 'timeline':
        return { 
          showAxes: true,
          defaultMessage: 'Loading timeline data...'
        };
      default:
        return { 
          defaultMessage: 'Loading visualization...'
        };
    }
  };

  const config = getSkeletonConfig();
  const displayMessage = message || config.defaultMessage;
  const label = ariaLabel || `Loading ${type} chart data`;

  return (
    <div className={cn("relative", className)}>
      <ChartSkeleton
        height={height}
        width={width}
        showTitle={showTitle}
        showLegend={showLegend || config.showLegend}
        variant={config.variant || 'default'}
        ariaLabel={label}
        showAxes={config.showAxes}
        barCount={config.barCount}
        {...props}
      />
      
      {showMessage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-sm text-muted-foreground animate-pulse">
              {displayMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

VisualizationSkeleton.displayName = 'VisualizationSkeleton';

/**
 * Props for the AnalyticsSkeleton component
 */
interface AnalyticsSkeletonProps {
  /** Show multiple chart skeletons in a grid */
  gridLayout?: boolean;
  /** Number of charts to show (for grid layout) */
  chartCount?: number;
  /** Height of each chart */
  chartHeight?: number | string;
  /** Additional className */
  className?: string;
}

/**
 * AnalyticsSkeleton Component
 * 
 * A composite skeleton loader for analytics dashboards with multiple charts.
 * 
 * @example
 * ```tsx
 * // Grid of chart skeletons
 * <AnalyticsSkeleton gridLayout chartCount={3} />
 * 
 * // Single column layout
 * <AnalyticsSkeleton chartHeight={300} />
 * ```
 */
export const AnalyticsSkeleton: React.FC<AnalyticsSkeletonProps> = React.memo(({
  gridLayout = false,
  chartCount = 3,
  chartHeight = 300,
  className
}) => {
  if (gridLayout) {
    return (
      <div className={cn(
        "grid gap-4",
        chartCount === 2 ? "grid-cols-1 md:grid-cols-2" :
        chartCount === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
        "grid-cols-1 md:grid-cols-2",
        className
      )}>
        {Array.from({ length: chartCount }).map((_, index) => (
          <VisualizationSkeleton
            key={index}
            type={index === 0 ? 'line' : index === 1 ? 'bar' : 'heatmap'}
            height={chartHeight}
            showTitle
            showMessage={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <VisualizationSkeleton type="line" height={chartHeight} showTitle />
      <VisualizationSkeleton type="bar" height={chartHeight} showTitle />
      <VisualizationSkeleton type="heatmap" height={chartHeight} showTitle />
    </div>
  );
});

AnalyticsSkeleton.displayName = 'AnalyticsSkeleton';

// Export all components
export default ChartSkeleton;
