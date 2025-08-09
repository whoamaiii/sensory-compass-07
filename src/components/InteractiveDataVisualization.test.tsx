import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
let InteractiveDataVisualization: any;

// Mock the dependencies
vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ option, height }: any) => (
    <div data-testid="echart-container" style={{ height }}>
      EChart Mock - {JSON.stringify(option?.title?.text || 'No title')}
    </div>
  )
}));

// Mock ChartKit builders to return minimal valid options
vi.mock('@/components/charts/ChartKit', () => ({
  buildEmotionTrendsOption: () => ({ series: [{ type: 'line', data: [] }], title: { text: 'Mock Trends' } }),
  buildAreaOption: () => ({ series: [{ type: 'line', areaStyle: {}, data: [] }] }),
  buildScatterOption: () => ({ series: [{ type: 'scatter', data: [] }] }),
  buildComposedOption: () => ({ series: [{ type: 'line', data: [] }, { type: 'bar', data: [] }] }),
  buildCorrelationHeatmapOption: () => ({ series: [{ type: 'heatmap', data: [] }], title: { text: 'Mock Correlations' } }),
  TrendRow: {} as any,
}));

vi.mock('./Visualization3D', () => ({
  Visualization3D: () => <div data-testid="viz-3d">3D Visualization Mock</div>
}));

vi.mock('./TimelineVisualization', () => ({
  TimelineVisualization: () => <div data-testid="timeline-viz">Timeline Visualization Mock</div>
}));

vi.mock('./AdvancedFilterPanel', () => ({
  AdvancedFilterPanel: () => <div data-testid="filter-panel">Advanced Filter Panel Mock</div>,
  applyFilters: ({ filteredEmotions, filteredSensory, filteredTracking }: any) => ({
    emotions: filteredEmotions,
    sensoryInputs: filteredSensory,
    trackingEntries: filteredTracking,
  })
}));

vi.mock('@/hooks/useRealtimeData', () => ({
  useRealtimeData: () => ({
    emotions: [],
    sensoryInputs: [],
    trackingEntries: [],
    connectionStatus: 'disconnected',
    newDataCount: 0,
    lastUpdate: null,
    isLive: false,
    clearNewDataIndicator: vi.fn(),
    getHistoricalData: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn()
  })
}));

beforeAll(async () => {
  ({ InteractiveDataVisualization } = await import('./InteractiveDataVisualization'));
});

describe('InteractiveDataVisualization', () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const mockEmotions = [
    {
      id: '1',
      emotion: 'happy',
      intensity: 4,
      triggers: ['playtime'],
      timestamp: now,
      notes: 'Playing with blocks'
    },
    {
      id: '2',
      emotion: 'calm',
      intensity: 3,
      triggers: ['quiet time'],
      timestamp: oneHourLater,
      notes: 'Reading a book'
    }
  ];

  const mockSensoryInputs = [
    {
      id: '1',
      type: 'visual',
      response: 'seeking',
      intensity: 3,
      timestamp: new Date(now.getTime() + 30 * 60 * 1000),
      notes: 'Looking at colorful pictures'
    },
    {
      id: '2',
      type: 'auditory',
      response: 'avoiding',
      intensity: 4,
      timestamp: new Date(now.getTime() + 90 * 60 * 1000),
      notes: 'Loud noise from outside'
    }
  ];

  const mockTrackingEntries = [
    {
      id: '1',
      timestamp: now,
      emotions: ['happy'],
      sensoryInputs: ['visual'],
      environmentalData: {
        location: 'classroom',
        noiseLevel: 3,
        lighting: 'natural',
        temperature: 22,
        weather: 'sunny'
      },
      notes: 'Morning session'
    }
  ];

  it('renders without crashing', () => {
    const { container } = render(
      <InteractiveDataVisualization
        emotions={mockEmotions}
        sensoryInputs={mockSensoryInputs}
        trackingEntries={mockTrackingEntries}
        studentName="Test Student"
      />
    );
    
    expect(container).toBeTruthy();
  });

  it('displays student name', () => {
    render(
      <InteractiveDataVisualization
        emotions={mockEmotions}
        sensoryInputs={mockSensoryInputs}
        trackingEntries={mockTrackingEntries}
        studentName="Test Student"
      />
    );
    
    expect(screen.getByText(/Test Student/)).toBeInTheDocument();
  });

  it('renders chart container', async () => {
    render(
      <InteractiveDataVisualization
        emotions={mockEmotions}
        sensoryInputs={mockSensoryInputs}
        trackingEntries={mockTrackingEntries}
        studentName="Test Student"
      />
    );
    // Ensure the Trends tab is active to render the chart
    // Ensure filters are reset to include all data (some defaults may filter)
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    filtersButton.click();
    const resetButtons = screen.queryAllByRole('button', { name: /reset/i });
    resetButtons.forEach(b => b.click?.());
    screen.getByRole('tab', { name: /trends/i }).click();
    await new Promise(r => setTimeout(r, 0));

    await waitFor(() => {
      const chartContainers = screen.queryAllByTestId('echart-container');
      expect(chartContainers.length).toBeGreaterThan(0);
    });
  });

  it('displays data counts', async () => {
    render(
      <InteractiveDataVisualization
        emotions={mockEmotions}
        sensoryInputs={mockSensoryInputs}
        trackingEntries={mockTrackingEntries}
        studentName="Test Student"
      />
    );
    // Reset any filters and switch to Trends tab
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    filtersButton.click();
    const resetButtons = screen.queryAllByRole('button', { name: /reset/i });
    resetButtons.forEach(b => b.click?.());
    screen.getByRole('tab', { name: /trends/i }).click();
    await new Promise(r => setTimeout(r, 0));
    return waitFor(() => {
      expect(screen.getByText(/2 emotions/i)).toBeInTheDocument();
      expect(screen.getByText(/2 sensory inputs/i)).toBeInTheDocument();
      expect(screen.getByText(/1 sessions/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', () => {
    render(
      <InteractiveDataVisualization
        emotions={[]}
        sensoryInputs={[]}
        trackingEntries={[]}
        studentName="Test Student"
      />
    );
    
    expect(screen.getByText(/0 emotions/)).toBeInTheDocument();
    expect(screen.getByText(/0 sensory inputs/)).toBeInTheDocument();
    expect(screen.getByText(/0 sessions/)).toBeInTheDocument();
  });

  it('handles invalid data gracefully', () => {
    const { container } = render(
      <InteractiveDataVisualization
        emotions={null as any}
        sensoryInputs={undefined as any}
        trackingEntries={123 as any}
        studentName="Test Student"
      />
    );
    
    // Should render without crashing
    expect(container).toBeTruthy();
    
    // Should show 0 counts for invalid data
    expect(screen.getByText(/0 emotions/)).toBeInTheDocument();
    expect(screen.getByText(/0 sensory inputs/)).toBeInTheDocument();
    expect(screen.getByText(/0 sessions/)).toBeInTheDocument();
  });
});
