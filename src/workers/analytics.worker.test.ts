import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage } from './analytics.worker';
import type { AnalyticsData } from '@/types/analytics';

// Mock dependencies
vi.mock('@/lib/patternAnalysis', () => ({
  patternAnalysis: vi.fn().mockResolvedValue({
    patterns: [{ id: '1', type: 'behavioral', description: 'Test pattern' }],
    correlations: [{ id: '1', factor1: 'emotion', factor2: 'sensory' }],
    insights: ['Test insight'],
  }),
}));

vi.mock('@/lib/enhancedPatternAnalysis', () => ({
  enhancedPatternAnalysisEngine: {
    analyzeInteractions: vi.fn().mockResolvedValue({
      interactions: [],
      significance: 0.5,
    }),
    analyzeTrends: vi.fn().mockResolvedValue({
      trends: [],
      predictions: [],
    }),
  },
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
  });

  it('should handle ANALYZE message', async () => {
const testData: AnalyticsData = {
      entries: [{ id: '1', timestamp: new Date(), value: 5 }],
      emotions: [],
      sensoryInputs: [],
    };

    await handleMessage.call(self, new MessageEvent('message', { data: testData }));

    expect(self.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        patterns: expect.any(Array),
        correlations: expect.any(Array),
        insights: expect.any(Array),
      })
    );
  });

  it('should handle empty data', async () => {
    const testData: AnalyticsData = {
      entries: [],
      emotions: [],
      sensoryInputs: [],
    };

    await handleMessage.call(self, new MessageEvent('message', { data: testData }));

    expect(self.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        patterns: [],
        correlations: [],
        insights: [],
      })
    );
  });
});
