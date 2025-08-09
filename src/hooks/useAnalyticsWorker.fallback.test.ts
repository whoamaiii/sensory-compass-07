import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AnalyticsData } from '@/types/analytics';

// Mock dependencies first
vi.mock('@/lib/logger');
vi.mock('@/lib/diagnostics');
vi.mock('@/lib/analyticsConfig', () => ({
  analyticsConfig: {
    getConfig: vi.fn(() => ({
      cache: { invalidateOnConfigChange: false }
    })),
    subscribe: vi.fn(() => vi.fn())
  }
}));

// Mock the analytics worker fallback
vi.mock('@/lib/analyticsWorkerFallback', () => ({
  analyticsWorkerFallback: {
    processAnalytics: vi.fn().mockResolvedValue({
      patterns: [],
      correlations: [],
      environmentalCorrelations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: ['Fallback result']
    })
  }
}));

// Mock the worker to fail initialization
vi.mock('@/workers/analytics.worker?worker', () => ({
  default: class {
    constructor() {
      throw new Error('Worker not supported');
    }
  }
}));

// Import the hook after all mocks are set up
import { useAnalyticsWorker } from './useAnalyticsWorker';

describe('useAnalyticsWorker - Fallback Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use fallback when worker initialization fails', async () => {
    const { analyticsWorkerFallback } = await import('@/lib/analyticsWorkerFallback');
    const { result } = renderHook(() => useAnalyticsWorker());
    
    const testData: AnalyticsData = { 
      entries: [], 
      emotions: [], 
      sensoryInputs: [] 
    };

    // Run analysis which should use the fallback
    await act(async () => {
      await result.current.runAnalysis(testData);
    });

    // Verify fallback was called
    expect(analyticsWorkerFallback.processAnalytics).toHaveBeenCalledWith(testData);
    
    // Should get results from fallback
    expect(result.current.results).toEqual({
      patterns: [],
      correlations: [],
      environmentalCorrelations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: ['Fallback result']
    });
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
