import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EChartsOption } from 'echarts';
import { logger } from '@/lib/logger';
import type { ChartStoreState } from '@/types/chart';

export const useChartStore = create<ChartStoreState>()(
  persist(
    (set, get) => ({
      charts: {},
      initChart: (id, initial) => {
        set((state) => {
          if (state.charts[id]) return state; // already exists
          return {
            charts: {
              ...state.charts,
              [id]: {
                id,
                option: initial?.option ?? null,
                loading: initial?.loading ?? true,
                error: initial?.error ?? null,
                lastUpdated: initial?.lastUpdated ?? null,
              },
            },
          };
        }, false, { type: 'chart/initChart', id });
      },
      setLoading: (id, loading) => {
        set((state) => {
          const chart = state.charts[id];
          if (!chart) return state;
          return {
            charts: {
              ...state.charts,
              [id]: { ...chart, loading },
            },
          };
        }, false, { type: 'chart/setLoading', id, loading });
      },
      setOption: (id, option: EChartsOption) => {
        try {
          set((state) => {
            const prev = state.charts[id] ?? { id, option: null, loading: false, error: null, lastUpdated: null };
            return {
              charts: {
                ...state.charts,
                [id]: { ...prev, option, loading: false, error: null, lastUpdated: Date.now() },
              },
            };
          }, false, { type: 'chart/setOption', id });
        } catch (e) {
          logger.error('setOption failed', e);
        }
      },
      setError: (id, error) => {
        set((state) => {
          const chart = state.charts[id];
          if (!chart) return state;
          return {
            charts: {
              ...state.charts,
              [id]: { ...chart, error, loading: false },
            },
          };
        }, false, { type: 'chart/setError', id, error });
      },
      clearChart: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.charts;
          return { charts: rest };
        }, false, { type: 'chart/clearChart', id });
      },
      reset: () => set({ charts: {} }, false, { type: 'chart/reset' }),
    }),
    {
      name: 'chart-store',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (state) => ({ charts: state.charts }),
    },
  ),
);
