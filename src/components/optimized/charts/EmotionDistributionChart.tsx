import { memo, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { VisualizationSkeleton } from '@/components/ui/ChartSkeleton';
import { DEFAULT_CHART_HEIGHT, EMOTION_COLORS } from './constants';
import { tooltipPresets, legendPresets } from '@/components/charts/presets';

/** Props for EmotionDistributionChart – donut pie of emotion distribution. */
export interface EmotionDistributionChartProps {
  distribution: Array<{ name: string; value: number }>;
  isLoading: boolean;
  stepReady: boolean;
  height?: number;
}

/**
 * EmotionDistributionChart
 * - Uses shared EMOTION_COLORS mapping for slices
 * - Applies tooltip and legend presets for consistency
 */
export const EmotionDistributionChart = memo(function EmotionDistributionChart({
  distribution,
  isLoading,
  stepReady,
  height = DEFAULT_CHART_HEIGHT.pie,
}: EmotionDistributionChartProps) {
  const option = useMemo<EChartsOption>(() => {
    type PieItemCallbackParam = { name?: string };
    return {
      dataset: { source: distribution.map((d) => ({ name: d.name, value: d.value })) },
      tooltip: tooltipPresets.item(),
      legend: legendPresets.scrollBottom(),
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          label: { formatter: '{b}: {@value} ({d}%)' },
          encode: { itemName: 'name', value: 'value' },
          itemStyle: {
            color: (params: PieItemCallbackParam) => {
              const key = (params?.name || '') as keyof typeof EMOTION_COLORS;
              return EMOTION_COLORS[key] || '#8884d8';
            },
          },
        },
      ],
    } as EChartsOption;
  }, [distribution]);

  return (
    <ErrorBoundary>
      {isLoading && !stepReady ? (
        <VisualizationSkeleton type="pie" height={height} showLegend />
      ) : (
        <EChartContainer option={option} height={height} aria-label="Emotion distribution donut chart" />
      )}
    </ErrorBoundary>
  );
});


