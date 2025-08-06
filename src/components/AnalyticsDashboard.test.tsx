
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
    (useAnalyticsWorker as jest.Mock).mockReturnValue({
      results: null,
      isAnalyzing: true,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    render(<AnalyticsDashboard student={mockStudent} filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} />);

    expect(screen.getByText('Analyzing data...')).toBeInTheDocument();
  });

  it('should render the dashboard with results', async () => {
    const mockResults = {
      patterns: [{ id: '1', name: 'Test Pattern', description: 'A test pattern' }],
      correlations: [{ id: '1', name: 'Test Correlation', description: 'A test correlation' }],
      insights: [{ id: '1', text: 'A test insight' }],
    };

    (useAnalyticsWorker as jest.Mock).mockReturnValue({
      results: mockResults,
      isAnalyzing: false,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    render(<AnalyticsDashboard student={mockStudent} filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} />);

    await waitFor(() => {
      expect(screen.getByText('Test Pattern')).toBeInTheDocument();
      expect(screen.getByText('Test Correlation')).toBeInTheDocument();
      expect(screen.getByText('A test insight')).toBeInTheDocument();
    });
  });

  it('should call runAnalysis on mount with filtered data', () => {
    (useAnalyticsWorker as jest.Mock).mockReturnValue({
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

