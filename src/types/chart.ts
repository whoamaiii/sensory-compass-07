// Shared chart types
import type { EChartsOption } from 'echarts';

export interface ChartState {
  id: string;
  option: EChartsOption | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface ChartStoreState {
  charts: Record<string, ChartState>;
  // actions
  initChart: (id: string, initial?: Partial<Omit<ChartState, 'id'>>) => void;
  setLoading: (id: string, loading: boolean) => void;
  setOption: (id: string, option: EChartsOption) => void;
  setError: (id: string, error: string | null) => void;
  clearChart: (id: string) => void;
  reset: () => void;
}
