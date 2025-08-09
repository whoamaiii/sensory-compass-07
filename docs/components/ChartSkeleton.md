# ChartSkeleton Component Documentation

## Overview

The `ChartSkeleton` component family provides reusable, consistent loading states for charts and data visualizations throughout the Sensory Compass application. This eliminates code duplication and ensures a uniform loading experience across all chart components.

## Problem Solved

Previously, loading states for charts were duplicated across multiple components with inline styles like:
```tsx
// OLD - Duplicated pattern
<div aria-label="Loading chart data" className="h-[400px] w-full">
  <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
</div>
```

This approach had several issues:
- **Code duplication** - The same loading pattern was repeated in many places
- **Inconsistency** - Different components had slightly different loading styles
- **Maintenance burden** - Changes to loading animations required updates in multiple files
- **No semantic meaning** - Generic divs didn't convey what type of chart was loading

## Solution

The `ChartSkeleton` component family provides three levels of abstraction:

### 1. Base Component: `ChartSkeleton`

The foundational skeleton loader for any chart type.

```tsx
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';

// Basic usage
<ChartSkeleton height={400} />

// With title and legend
<ChartSkeleton 
  height={300} 
  showTitle 
  showLegend 
/>

// Bar chart with animated bars
<ChartSkeleton 
  height={350} 
  variant="bordered" 
  barCount={5} 
/>

// With axes for line/scatter charts
<ChartSkeleton 
  height={400} 
  showAxes 
  showLegend 
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number \| string` | `400` | Height of the skeleton |
| `width` | `number \| string` | `'100%'` | Width of the skeleton |
| `className` | `string` | - | Additional CSS classes |
| `showTitle` | `boolean` | `false` | Show title skeleton above chart |
| `showLegend` | `boolean` | `false` | Show legend skeleton below chart |
| `variant` | `'default' \| 'card' \| 'bordered'` | `'default'` | Visual style variant |
| `ariaLabel` | `string` | `'Loading chart data'` | Accessibility label |
| `showAxes` | `boolean` | `false` | Show axis labels skeleton |
| `barCount` | `number` | `0` | Number of animated bar skeletons |

### 2. Smart Component: `VisualizationSkeleton`

An intelligent skeleton that adapts to different visualization types.

```tsx
import { VisualizationSkeleton } from '@/components/ui/ChartSkeleton';

// Line chart with loading message
<VisualizationSkeleton 
  type="line" 
  height={300} 
  showMessage 
/>

// Heatmap with custom message
<VisualizationSkeleton 
  type="heatmap" 
  height={400}
  showMessage
  message="Analyzing correlations..."
/>

// 3D visualization
<VisualizationSkeleton 
  type="3d" 
  height={500}
/>
```

#### Props

Extends `ChartSkeletonProps` with:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'line' \| 'bar' \| 'pie' \| 'heatmap' \| 'scatter' \| '3d' \| 'timeline'` | `'line'` | Visualization type |
| `showMessage` | `boolean` | `false` | Show loading message overlay |
| `message` | `string` | Type-specific | Custom loading message |

#### Type-Specific Behaviors

- **`line`**: Shows axes and legend, message: "Loading trend data..."
- **`bar`**: Shows 6 animated bars with axes, message: "Loading bar chart data..."
- **`pie`**: Shows legend, message: "Loading distribution data..."
- **`heatmap`**: Uses bordered variant, message: "Loading correlation matrix..."
- **`scatter`**: Shows axes, message: "Loading scatter plot data..."
- **`3d`**: Uses bordered variant, message: "Initializing 3D visualization..."
- **`timeline`**: Shows axes, message: "Loading timeline data..."

### 3. Composite Component: `AnalyticsSkeleton`

For loading entire analytics dashboards with multiple charts.

```tsx
import { AnalyticsSkeleton } from '@/components/ui/ChartSkeleton';

// Grid layout with 3 charts
<AnalyticsSkeleton 
  gridLayout 
  chartCount={3} 
/>

// Single column layout
<AnalyticsSkeleton 
  chartHeight={300} 
/>

// Two-column grid
<AnalyticsSkeleton 
  gridLayout 
  chartCount={2}
  chartHeight={250} 
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridLayout` | `boolean` | `false` | Use grid layout vs stacked |
| `chartCount` | `number` | `3` | Number of chart skeletons |
| `chartHeight` | `number \| string` | `300` | Height of each chart |
| `className` | `string` | - | Additional CSS classes |

## Migration Guide

### Before (Duplicated Pattern)
```tsx
const renderPatternAnalysis = () => {
  if (isAnalyzing) {
    return (
      <div aria-label="Loading chart data" className="h-[400px] w-full">
        <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
      </div>
    );
  }
  // ... rest of component
};
```

### After (Using ChartSkeleton)
```tsx
import { VisualizationSkeleton } from '@/components/ui/ChartSkeleton';

const renderPatternAnalysis = () => {
  if (isAnalyzing) {
    return (
      <VisualizationSkeleton 
        type="heatmap"
        height={400}
        showMessage
        message="Analyzing patterns..."
      />
    );
  }
  // ... rest of component
};
```

## Usage Examples

### Example 1: Loading State for Emotion Trends Chart
```tsx
{isLoading ? (
  <VisualizationSkeleton 
    type="line" 
    height={300} 
    showMessage 
    message="Loading emotion trends..."
  />
) : (
  <EChartContainer option={emotionTrendsOption} height={300} />
)}
```

### Example 2: Loading State for Correlation Heatmap
```tsx
{!correlationMatrix ? (
  <VisualizationSkeleton 
    type="heatmap"
    height={420}
    showMessage
    message="Calculating correlations..."
  />
) : (
  <EChartContainer option={correlationOption} height={420} />
)}
```

### Example 3: Dashboard Loading State
```tsx
{isInitializing ? (
  <AnalyticsSkeleton 
    gridLayout 
    chartCount={3}
    chartHeight={350}
  />
) : (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Actual charts */}
  </div>
)}
```

### Example 4: Custom Loading State
```tsx
<ChartSkeleton 
  height={400}
  variant="card"
  showTitle
  showLegend
  showAxes
  className="shadow-lg"
  ariaLabel="Loading student performance data"
/>
```

## Best Practices

1. **Choose the right component level**:
   - Use `ChartSkeleton` for custom/unique loading states
   - Use `VisualizationSkeleton` for standard chart types
   - Use `AnalyticsSkeleton` for dashboard/multi-chart layouts

2. **Always provide meaningful aria-labels**:
   ```tsx
   <ChartSkeleton ariaLabel="Loading student emotion data for last 30 days" />
   ```

3. **Match skeleton height to actual chart**:
   ```tsx
   const CHART_HEIGHT = 400;
   
   {isLoading ? (
     <VisualizationSkeleton height={CHART_HEIGHT} type="line" />
   ) : (
     <EChartContainer height={CHART_HEIGHT} option={option} />
   )}
   ```

4. **Use appropriate variants**:
   - `default` - For inline charts
   - `card` - For charts already in Card components
   - `bordered` - For charts that need visual separation

5. **Show relevant skeleton features**:
   ```tsx
   // For a chart with title and legend
   <ChartSkeleton showTitle showLegend height={300} />
   
   // For a bar chart
   <ChartSkeleton barCount={5} showAxes height={350} />
   ```

## Accessibility

All skeleton components include:
- Proper ARIA labels and roles
- `aria-busy="true"` to indicate loading state
- Semantic HTML structure
- Screen reader friendly messages

## Performance

The components are optimized with:
- `React.memo` to prevent unnecessary re-renders
- CSS animations that don't trigger layout reflows
- Minimal DOM elements
- Efficient animation delays for staggered effects

## Styling

The skeletons automatically adapt to your theme using:
- `bg-muted` for default backgrounds
- `bg-muted/20` for bordered variants
- `border-border/50` for subtle borders
- `animate-pulse` for the loading animation

Custom styling can be applied via the `className` prop:
```tsx
<ChartSkeleton 
  className="shadow-xl rounded-2xl" 
  height={400} 
/>
```

## Future Enhancements

Potential improvements for future versions:
1. Support for real-time data streaming indicators
2. Progress bars for long-running analyses
3. Skeleton templates for specific chart libraries
4. Customizable animation speeds
5. Dark mode optimizations
