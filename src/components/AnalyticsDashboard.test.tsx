import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { mockStudent } from '@/lib/mockData';

vi.mock('@/hooks/useAnalyticsWorker', () => ({
  useAnalyticsWorker: vi.fn(),
}));

describe('AnalyticsDashboard', () => {
  const mockRunAnalysis = vi.fn();
  const mockInvalidateCache = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard with loading state', () => {
    (useAnalyticsWorker as unknown as vi.Mock).mockReturnValue({
      results: null,
      isAnalyzing: true,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    render(<AnalyticsDashboard student={mockStudent} filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} />);

    // Expect at least one analyzing indicator present
    const analyzing = screen.getAllByText(/Analyzing (data|correlations)\.\.\./);
    expect(analyzing.length).toBeGreaterThan(0);
  });

  it('should render the dashboard with results', async () => {
    const mockResults = {
      patterns: [{ id: '1', pattern: 'test-pattern', description: 'A test pattern', type: 'emotion', confidence: 0.8, dataPoints: 10 }],
      correlations: [{ factor1: 'A', factor2: 'B', correlation: 0.5, significance: 'high', description: 'Test Correlation' }],
      insights: ['A test insight'],
    } as any;

    (useAnalyticsWorker as unknown as vi.Mock).mockReturnValue({
      results: mockResults,
      isAnalyzing: false,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    render(<AnalyticsDashboard student={mockStudent} filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} />);

    await waitFor(() => {
      const matches = screen.getAllByText(/\bTest Pattern\b/i);
      expect(matches.length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Test Correlation')).toBeInTheDocument();
    expect(screen.getByText('A test insight')).toBeInTheDocument();
  });

  it('should call runAnalysis on mount with filtered data', () => {
    (useAnalyticsWorker as unknown as vi.Mock).mockReturnValue({
      results: null,
      isAnalyzing: false,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    const filteredData = {
      entries: [{ id: '1', timestamp: new Date(), value: 1 }],
      emotions: [],
      sensoryInputs: [],
    };

    render(<AnalyticsDashboard student={mockStudent} filteredData={filteredData} />);

    expect(mockRunAnalysis).toHaveBeenCalledWith(filteredData);
  });
});

