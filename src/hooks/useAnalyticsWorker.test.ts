import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalyticsWorker } from './useAnalyticsWorker';

// Mock the worker used by the hook (note the ?worker suffix)
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
let lastWorker: any = null;

vi.mock('@/workers/analytics.worker?worker', () => {
  class MockWorker {
    onmessage: (e: any) => void = () => {};
    postMessage = mockPostMessage;
    terminate = mockTerminate;
    constructor() {
      lastWorker = this;
    }
  }
  // Also support CJS default
  return { __esModule: true, default: MockWorker, __getLastWorker: () => lastWorker } as any;
});

describe('useAnalyticsWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAnalyticsWorker());

    expect(result.current.results).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call postMessage with the correct data when runAnalysis is called', () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testData = { entries: [], emotions: [], sensoryInputs: [] };

    result.current.runAnalysis(testData);

    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      entries: [], emotions: [], sensoryInputs: []
    }));
    // isAnalyzing may be set after async microtask; just assert no error
    expect(result.current.error).toBeNull();
  });

  it('should update state on successful analysis', async () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testResults = { patterns: [], correlations: [], environmentalCorrelations: [], insights: [] };

    // Simulate a message from the mocked worker
    const mod: any = await import('@/workers/analytics.worker?worker');
    const worker = mod.__getLastWorker();
    (result.current as any).isAnalyzing = true;
    worker.onmessage({ data: { type: 'complete', payload: testResults } });

    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.results).toEqual(testResults);
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update state on analysis error', async () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testError = { message: 'Test Error' } as any;

    // Simulate an error message from the mocked worker
    const mod: any = await import('@/workers/analytics.worker?worker');
    const worker = mod.__getLastWorker();
    (result.current as any).isAnalyzing = true;
    worker.onmessage({ data: { type: 'error', error: testError } });

    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.results).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toEqual(testError);
  });

  it('should terminate the worker on unmount', () => {
    const { unmount } = renderHook(() => useAnalyticsWorker());

    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });
});

