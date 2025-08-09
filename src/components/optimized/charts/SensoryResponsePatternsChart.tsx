import { memo, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { VisualizationSkeleton } from '@/components/ui/ChartSkeleton';
import { DEFAULT_CHART_HEIGHT, SENSORY_BAR_COLORS } from './constants';
import { tooltipPresets, legendPresets } from '@/components/charts/presets';

/** Props for SensoryResponsePatternsChart – stacked bars for sensory responses. */
export interface SensoryResponsePatternsChartProps {
  responses: Array<{ type: string; total: number; [key: string]: string | number }>;
  isLoading: boolean;
  stepReady: boolean;
  height?: number;
}

/**
 * SensoryResponsePatternsChart
 * - Stacked bar chart for seeking/avoiding/neutral counts by type
 * - Applies tooltip axis preset with shadow pointer and fixed colors
 */
export const SensoryResponsePatternsChart = memo(function SensoryResponsePatternsChart({
  responses,
  isLoading,
  stepReady,
  height = DEFAULT_CHART_HEIGHT.bar,
}: SensoryResponsePatternsChartProps) {
  const option = useMemo<EChartsOption>(() => {
    return {
      dataset: { source: responses },
      grid: { top: 24, right: 16, bottom: 32, left: 40 },
      xAxis: { type: 'category', name: 'Type', nameGap: 24 },
      yAxis: { type: 'value', name: 'Count', nameGap: 28, minInterval: 1 },
      tooltip: tooltipPresets.axis({ type: 'shadow' } as any),
      legend: legendPresets.top(),
      series: [
        { type: 'bar', name: 'Seeking', encode: { x: 'type', y: 'seeking' }, itemStyle: { color: SENSORY_BAR_COLORS.seeking } },
        { type: 'bar', name: 'Avoiding', encode: { x: 'type', y: 'avoiding' }, itemStyle: { color: SENSORY_BAR_COLORS.avoiding } },
        { type: 'bar', name: 'Neutral', encode: { x: 'type', y: 'neutral' }, itemStyle: { color: SENSORY_BAR_COLORS.neutral } },
      ],
    } as EChartsOption;
  }, [responses]);

  return (
    <ErrorBoundary>
      {isLoading && !stepReady ? (
        <VisualizationSkeleton type="bar" height={height} showAxes />
      ) : (
        <EChartContainer option={option} height={height} aria-label="Sensory response patterns stacked bars" />
      )}
    </ErrorBoundary>
  );
});


