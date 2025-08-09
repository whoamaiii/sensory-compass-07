import { describe, it, expect } from 'vitest';
import { buildEmotionTrendsOption, buildAreaOption, buildScatterOption, buildComposedOption, TrendRow } from '@/components/charts/ChartKit';

const rowsFixture: TrendRow[] = [
  { date: '2025-07-15', avgEmotionIntensity: 4, positiveEmotions: 1, negativeEmotions: 0.5, totalSensoryInputs: 2 },
  { date: '2025-07-16', avgEmotionIntensity: 5, positiveEmotions: 0.8, negativeEmotions: 1.2, totalSensoryInputs: 3 },
  { date: '2025-07-17', avgEmotionIntensity: 6, positiveEmotions: 1.5, negativeEmotions: 0.7, totalSensoryInputs: 1 },
];

describe('ChartKit option builders', () => {
  it('buildEmotionTrendsOption returns consistent series shapes', () => {
    const option = buildEmotionTrendsOption(rowsFixture, {
      title: 'Test',
      showMovingAverage: true,
      movingAverageWindow: 2,
      useDualYAxis: true,
      thresholds: { emotion: 7, sensory: 5 },
    });

    // Basic shape assertions (snapshot-like but stable)
    expect(Array.isArray(option.series)).toBe(true);
    const series = option.series as any[];
    // Expect 5 series when MA is enabled
    expect(series.length).toBe(5);
    // Check names
    expect(series.map(s => s.name)).toEqual([
      'Avg Emotion Intensity',
      'Avg Intensity (2d MA)',
      'Positive Emotions',
      'Negative Emotions',
      'Sensory Inputs',
    ]);
    // Check data lengths
    series.forEach(s => {
      expect(Array.isArray(s.data)).toBe(true);
      expect(s.data.length).toBe(rowsFixture.length);
    });
  });

  it('buildAreaOption produces two line series with areaStyle', () => {
    const option = buildAreaOption(rowsFixture);
    const series = option.series as any[];
    expect(series.length).toBe(2);
    expect(series[0].type).toBe('line');
    expect(series[0].areaStyle).toBeDefined();
  });

  it('buildScatterOption produces 1 scatter series with xy tuples', () => {
    const option = buildScatterOption(rowsFixture);
    const series = option.series as any[];
    expect(series.length).toBe(1);
    expect(series[0].type).toBe('scatter');
    expect(Array.isArray(series[0].data[0])).toBe(true);
    expect(series[0].data[0].length).toBe(2);
  });

  it('buildComposedOption produces bar+line combo', () => {
    const option = buildComposedOption(rowsFixture);
    const series = option.series as any[];
    expect(series.length).toBe(3);
    expect(series[0].type).toBe('bar');
    expect(series[1].type).toBe('bar');
    expect(series[2].type).toBe('line');
  });
});




