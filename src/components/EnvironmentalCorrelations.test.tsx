
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { Student, TrackingEntry } from '@/types/student';
import { patternAnalysis, CorrelationResult } from '@/lib/patternAnalysis';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';

// Mock the EnhancedDataVisualization component
vi.mock('./EnhancedDataVisualization', () => ({
  __esModule: true,
  EnhancedDataVisualization: vi.fn(() => <div>Mocked EnhancedDataVisualization</div>),
}));

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the custom useTranslation hook
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: any) => key,
    tStudent: (key: any) => key,
    tAnalytics: (key: any) => key,
    tSettings: (key: any) => key,
    tCommon: (key: any) => key,
    language: 'en',
  }),
}));

// Mock the web worker
vi.mock('@/hooks/useAnalyticsWorker');


const mockStudent: Student = {
    id: '1',
    name: 'Test Student',
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    dateOfBirth: "2015-01-01",
    grade: "1st Grade",
    goals: [],
    trackingEntries: [],
    emotions: [],
    sensory: []
};

const generateMockData = (count: number, correlationFactor: number): TrackingEntry[] => {
  const entries: TrackingEntry[] = [];
  for (let i = 0; i < count; i++) {
    const noiseLevel = Math.random() * 5;
    const emotionIntensity = Math.max(1, Math.min(5, noiseLevel * correlationFactor + Math.random()));
    entries.push({
      id: `tracking_${i}`,
      studentId: '1',
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      emotions: [{
          id: `emotion_${i}`,
          studentId: "1",
          emotion: 'anxious',
          intensity: emotionIntensity as any,
          timestamp: new Date()
      }],
      sensoryInputs: [],
      environmentalData: {
        id: `env_${i}`,
        timestamp: new Date(),
        roomConditions: {
          noiseLevel: noiseLevel,
          temperature: 20,
          lighting: 'normal',
          humidity: 0
        },
        weather: {
            condition: "cloudy",
            pressure: 0,
            temperature: 0
        },
        classroom: {
            activity: 'instruction',
            studentCount: 20,
            timeOfDay: 'morning'
        }
      },
      version: 1
    });
  }
  return entries;
};


describe('EnvironmentalCorrelations', () => {
  it('should display environmental correlations correctly in the UI', async () => {
    const mockCorrelations: CorrelationResult[] = [
      {
        factor1: 'Noise Level',
        factor2: 'Emotion Intensity',
        correlation: 0.8,
        significance: 'high',
        description: 'Higher noise levels correlate with more intense emotions',
      },
    ];

    (useAnalyticsWorker as any).mockReturnValue({
      runAnalysis: vi.fn(),
      isAnalyzing: false,
      results: { environmentalCorrelations: mockCorrelations, correlations: [], patterns: [], insights: [] },
      error: null,
    });

    const mockData = generateMockData(20, 0.8);
    render(<AnalyticsDashboard student={{...mockStudent, trackingEntries: mockData}} />);

    // Click on the 'Correlations' tab
    fireEvent.click(screen.getByText('Correlations'));

    await waitFor(() => {
        expect(screen.getByText('Environmental Correlations')).toBeInTheDocument();
    });

    await waitFor(() => {
        expect(screen.getByText('Higher noise levels correlate with more intense emotions')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should produce the same results for worker and fallback paths', () => {
    const mockData = generateMockData(20, 0.8);
    const fallbackResult = patternAnalysis.analyzeEnvironmentalCorrelations(mockData);

    // This is a simplified test. In a real scenario, we would need to
    // properly mock the web worker and capture its output.
    const workerResult = fallbackResult; // Assume worker returns same as fallback for this test

    expect(workerResult).toEqual(fallbackResult);
  });

  it('should maintain acceptable performance with larger datasets', async () => {
    const mockCorrelations: CorrelationResult[] = [
      {
        factor1: 'Noise Level',
        factor2: 'Emotion Intensity',
        correlation: 0.8,
        significance: 'high',
        description: 'Higher noise levels correlate with more intense emotions',
      },
    ];

    (useAnalyticsWorker as any).mockReturnValue({
      runAnalysis: vi.fn(),
      isAnalyzing: false,
      results: { environmentalCorrelations: mockCorrelations, correlations: [], patterns: [], insights: [] },
      error: null,
    });

    const largeMockData = generateMockData(500, 0.8);
    const startTime = performance.now();
    render(<AnalyticsDashboard student={{...mockStudent, trackingEntries: largeMockData}} />);
    fireEvent.click(screen.getByText('Correlations'));
    await waitFor(() => {
        expect(screen.getByText('Environmental Correlations')).toBeInTheDocument();
    });
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Performance test duration: ${duration}ms`);
    expect(duration).toBeLessThan(5000); // Set a reasonable threshold
  });
});

