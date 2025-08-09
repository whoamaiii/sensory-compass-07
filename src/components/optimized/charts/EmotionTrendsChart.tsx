import { memo, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { buildEmotionTrendsOption, TrendRow } from '@/components/charts/ChartKit';
import { prepareEmotionTrendsData } from '@/lib/chartTransforms';
import type { EmotionEntry, SensoryEntry } from '@/types/student';
import { VisualizationSkeleton } from '@/components/ui/ChartSkeleton';
import { DEFAULT_CHART_HEIGHT, TREND_MOVING_AVERAGE_WINDOW, TREND_THRESHOLDS } from './constants';
import { tooltipPresets } from '@/components/charts/presets';

/**
 * Props for EmotionTrendsChart – renders the time-series trends for emotions and sensory inputs.
 */
export interface EmotionTrendsChartProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  isLoading: boolean;
  stepReady: boolean;
  height?: number;
}

/**
 * EmotionTrendsChart
 * - Computes rows with `prepareEmotionTrendsData`
 * - Builds an ECharts option via `buildEmotionTrendsOption`
 * - Applies shared tooltip preset for consistent behavior
 */
export const EmotionTrendsChart = memo(function EmotionTrendsChart({
  emotions,
  sensoryInputs,
  isLoading,
  stepReady,
  height = DEFAULT_CHART_HEIGHT.trends,
}: EmotionTrendsChartProps) {
  const { rows, option } = useMemo(() => {
    const r: TrendRow[] = prepareEmotionTrendsData(emotions, sensoryInputs);
    const base: EChartsOption = buildEmotionTrendsOption(r, {
      title: undefined,
      showMovingAverage: true,
      movingAverageWindow: TREND_MOVING_AVERAGE_WINDOW,
      useDualYAxis: true,
      thresholds: TREND_THRESHOLDS,
    });
    const opt: EChartsOption = {
      ...base,
      tooltip: tooltipPresets.axis((base.tooltip as any)?.axisPointer),
    };
    return { rows: r, option: opt };
  }, [emotions, sensoryInputs]);

  return (
    <ErrorBoundary>
      {isLoading && !stepReady ? (
        <VisualizationSkeleton type="line" height={height} showMessage message="Loading emotion trends..." />
      ) : (
        <EChartContainer option={option} height={height} aria-label="Emotion trends line chart" />
      )}
    </ErrorBoundary>
  );
});


