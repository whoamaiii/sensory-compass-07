
import { renderHook } from '@testing-library/react-hooks';
import { useAnalyticsWorker } from './useAnalyticsWorker';

// Mock the worker
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

vi.mock('@/workers/analytics.worker.ts', () => {
  return {
    default: class MockWorker {
      onmessage: (e: any) => void = () => {};
      postMessage = mockPostMessage;
      terminate = mockTerminate;
    },
  };
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

    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'ANALYZE', payload: testData });
    expect(result.current.isAnalyzing).toBe(true);
  });

  it('should update state on successful analysis', () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testResults = { patterns: [], correlations: [], insights: [] };

    // Simulate a message from the worker
    const worker = new (require('@/workers/analytics.worker.ts').default)();
    worker.onmessage({ data: { type: 'ANALYSIS_COMPLETE', payload: testResults } });

    expect(result.current.results).toEqual(testResults);
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update state on analysis error', () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testError = { message: 'Test Error' };

    // Simulate an error message from the worker
    const worker = new (require('@/workers/analytics.worker.ts').default)();
    worker.onmessage({ data: { type: 'ERROR', payload: testError } });

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

