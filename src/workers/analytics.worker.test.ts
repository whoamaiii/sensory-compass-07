import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage } from './analytics.worker';
import type { AnalyticsData } from '@/types/analytics';

// Mock cached analysis used by worker to deterministic outputs
vi.mock('@/lib/cachedPatternAnalysis', () => ({
  createCachedPatternAnalysis: () => ({
    analyzeEmotionPatterns: vi.fn().mockReturnValue([]),
    analyzeSensoryPatterns: vi.fn().mockReturnValue([]),
    analyzeEnvironmentalCorrelations: vi.fn().mockReturnValue([
      { factor1: 'emotion', factor2: 'sensory', correlation: 0.5, significance: 'high', description: 'test' }
    ]),
    generatePredictiveInsights: vi.fn().mockResolvedValue([]),
    detectAnomalies: vi.fn().mockReturnValue([]),
  })
}));

// Mock the global postMessage for worker context
const mockPostMessage = vi.fn();
(global as any).postMessage = mockPostMessage;

const self = {
  postMessage: mockPostMessage,
} as any;

describe('analytics.worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should handle ANALYZE message', async () => {
const testData: AnalyticsData = {
      entries: [{ id: '1', timestamp: new Date(), value: 5 }],
      emotions: [],
      sensoryInputs: [],
    };

    await handleMessage.call(self, new MessageEvent('message', { data: testData as any }));
    await vi.runAllTimersAsync();

    expect(self.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'complete',
        payload: expect.objectContaining({
          patterns: expect.any(Array),
          correlations: expect.any(Array),
          insights: expect.any(Array),
        })
      })
    );
  });

  it('should handle empty data', async () => {
    const testData: AnalyticsData = {
      entries: [],
      emotions: [],
      sensoryInputs: [],
    };

    await handleMessage.call(self, new MessageEvent('message', { data: testData as any }));
    await vi.runAllTimersAsync();

    expect(self.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'complete',
        payload: expect.objectContaining({
          patterns: [],
          correlations: [],
          insights: [],
        })
      })
    );
  });
});
