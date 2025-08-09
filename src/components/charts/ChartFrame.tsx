import React, { useEffect, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { useChartStore } from '@/hooks/useChartStore';
import { logger } from '@/lib/logger';

export interface ChartFrameProps {
  id: string;
  // Build an option from arbitrary inputs. Must be pure and fast; memoize upstream if needed.
  option: EChartsOption | null | undefined;
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function ChartFrame({ id, option, height = 400, width = '100%', className }: ChartFrameProps) {
  const { charts, initChart, setOption, setLoading } = useChartStore((s) => ({
    charts: s.charts,
    initChart: s.initChart,
    setOption: s.setOption,
    setLoading: s.setLoading,
  }));

  // Ensure chart exists in store on mount
  useEffect(() => {
    initChart(id, { loading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Memoize a safe option to avoid re-renders
  const safeOption = useMemo(() => {
    try {
      if (!option || typeof option !== 'object') {
        return { series: [] } as EChartsOption;
      }
      // enforce series field for immediate render
      const s = (option as any).series;
      return s == null ? { ...(option as any), series: [] } as EChartsOption : (option as EChartsOption);
    } catch (e) {
      logger.error('ChartFrame.safeOption failed', e);
      return { series: [] } as EChartsOption;
    }
  }, [option]);

  // Push option into store immediately when it changes
  useEffect(() => {
    try {
      setOption(id, safeOption);
      setLoading(id, false);
    } catch (e) {
      logger.error('ChartFrame.setOption failed', e);
    }
  }, [id, safeOption, setOption, setLoading]);

  const current = charts[id];
  const currentOption = current?.option ?? safeOption;

  return (
    <EChartContainer option={currentOption} height={height} width={width} className={className} />
  );
}
