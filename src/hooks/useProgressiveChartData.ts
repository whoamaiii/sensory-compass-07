import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { AnalyticsResults } from '@/types/analytics';
import { ProgressiveChartData, ProgressiveChartDataState } from '@/types/charts';
import { logger } from '@/lib/logger';

interface UseProgressiveChartDataParams {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  entries: TrackingEntry[];
  analyticsResults?: AnalyticsResults | null;
}

interface UseProgressiveChartDataReturn {
  data: ProgressiveChartData;
  state: ProgressiveChartDataState;
  reset: () => void;
}

const requestIdle: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number =
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as any), 0));

const cancelIdle: (id: number) => void =
  typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : clearTimeout;

export function useProgressiveChartData(params: UseProgressiveChartDataParams): UseProgressiveChartDataReturn {
  const { emotions, sensoryInputs, entries, analyticsResults } = params;

  const [data, setData] = useState<ProgressiveChartData>({
    emotionTrends: [],
    emotionDistribution: [],
    sensoryResponses: [],
  });

  const [state, setState] = useState<ProgressiveChartDataState>({
    isLoading: true,
    steps: {
      emotionDistribution: false,
      sensoryResponses: false,
      emotionTrends: false,
    },
    error: null,
  });

  const idleIdsRef = useRef<number[]>([]);
  const timeoutsRef = useRef<number[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      idleIdsRef.current.forEach(id => {
        try { cancelIdle(id); } catch {}
      });
      timeoutsRef.current.forEach(id => clearTimeout(id));
      idleIdsRef.current = [];
      timeoutsRef.current = [];
    };
  }, []);

  const reset = useCallback(() => {
    setData({ emotionTrends: [], emotionDistribution: [], sensoryResponses: [] });
    setState({
      isLoading: true,
      steps: { emotionDistribution: false, sensoryResponses: false, emotionTrends: false },
      error: null,
    });
  }, []);

  // Small helpers to safely update
  const safeSetData = useCallback((updater: (prev: ProgressiveChartData) => ProgressiveChartData) => {
    if (!isMountedRef.current) return;
    setData(prev => updater(prev));
  }, []);

  const markStepDone = useCallback((step: keyof ProgressiveChartDataState['steps']) => {
    if (!isMountedRef.current) return;
    setState(prev => ({
      ...prev,
      steps: { ...prev.steps, [step]: true },
      isLoading: !(prev.steps.emotionDistribution && prev.steps.sensoryResponses && (step === 'emotionTrends' || prev.steps.emotionTrends)),
    }));
  }, []);

  // Progressive pipeline: quick -> medium -> heavy computations
  useEffect(() => {
    // Start fresh on every input change
    reset();

    // Step 1: Emotion distribution (fast)
    const id1 = requestIdle(() => {
      try {
        const distribution = new Map<string, number>();
        emotions.forEach(e => {
          distribution.set(e.emotion, (distribution.get(e.emotion) || 0) + 1);
        });
        const pieData = Array.from(distribution.entries()).map(([name, value]) => ({ name, value }));
        safeSetData(prev => ({ ...prev, emotionDistribution: pieData }));
        markStepDone('emotionDistribution');
      } catch (error) {
        logger.error('[useProgressiveChartData] Failed computing emotion distribution', error);
        setState(prev => ({ ...prev, error: error instanceof Error ? error : new Error('Unknown error') }));
      }
    }, { timeout: 100 });
    idleIdsRef.current.push(id1);

    // Step 2: Sensory responses (medium)
    const t2 = window.setTimeout(() => {
      const id2 = requestIdle(() => {
        try {
          type SensoryRow = { type: string; total: number; [key: string]: string | number };
          const map = new Map<string, SensoryRow>();
          sensoryInputs.forEach(s => {
            const row = map.get(s.sensoryType) || { type: s.sensoryType, total: 0 };
            row[s.response] = ((typeof row[s.response] === 'number' ? (row[s.response] as number) : 0) + 1);
            row.total = (row.total || 0) + 1;
            map.set(s.sensoryType, row);
          });
          const sensoryData = Array.from(map.values());
          safeSetData(prev => ({ ...prev, sensoryResponses: sensoryData }));
          markStepDone('sensoryResponses');
        } catch (error) {
          logger.error('[useProgressiveChartData] Failed computing sensory responses', error);
          setState(prev => ({ ...prev, error: error instanceof Error ? error : new Error('Unknown error') }));
        }
      }, { timeout: 200 });
      idleIdsRef.current.push(id2);
    }, 50);
    timeoutsRef.current.push(t2);

    // Step 3: Emotion trends over time (heavier)
    const t3 = window.setTimeout(() => {
      const id3 = requestIdle(() => {
        try {
          // Determine all emotion keys for consistent columns
          const allEmotions = Array.from(new Set(emotions.map(e => e.emotion)));

          type Row = { date: string; count: number } & Record<string, number | string>;
          const dataMap = new Map<string, Row>();

          emotions.forEach(e => {
            const date = e.timestamp instanceof Date ? e.timestamp.toLocaleDateString() : new Date(e.timestamp as any).toLocaleDateString();
            if (!dataMap.has(date)) {
              const base: Row = { date, count: 0 };
              allEmotions.forEach(k => { base[k] = 0; });
              dataMap.set(date, base);
            }
            const row = dataMap.get(date)!;
            const current = row[e.emotion];
            row[e.emotion] = (typeof current === 'number' ? current : 0) + e.intensity;
            row.count = (row.count || 0) + 1;
          });

          // Sort by date asc
          const toDate = (d: string) => new Date(d);
          const rows = Array.from(dataMap.values()).sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());

          safeSetData(prev => ({ ...prev, emotionTrends: rows }));
          markStepDone('emotionTrends');
        } catch (error) {
          logger.error('[useProgressiveChartData] Failed computing emotion trends', error);
          setState(prev => ({ ...prev, error: error instanceof Error ? error : new Error('Unknown error') }));
        }
      }, { timeout: 400 });
      idleIdsRef.current.push(id3);
    }, 100);
    timeoutsRef.current.push(t3);

    // Optionally react to analytics results updates for future progressive enrichments
    if (analyticsResults) {
      try {
        // Currently no heavy enrichment needed; placeholder for progressive overlays
        logger.debug('[useProgressiveChartData] analyticsResults available', {
          patterns: analyticsResults.patterns?.length || 0,
          correlations: analyticsResults.correlations?.length || 0,
        });
      } catch {/* noop */}
    }
  }, [emotions, sensoryInputs, entries, analyticsResults, reset, safeSetData, markStepDone]);

  return { data, state, reset };
}

