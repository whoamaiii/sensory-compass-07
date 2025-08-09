import { describe, it, expect } from 'vitest';
import { prepareEmotionTrendsData } from '@/lib/chartTransforms';
import type { EmotionEntry, SensoryEntry } from '@/types/student';

describe('prepareEmotionTrendsData', () => {
  const date = (s: string) => new Date(s);

  it('aggregates by day with average intensity and counts', () => {
    const emotions: EmotionEntry[] = [
      { id: 'e1', emotion: 'happy', intensity: 6, timestamp: date('2024-01-01T08:00:00Z') },
      { id: 'e2', emotion: 'sad', intensity: 4, timestamp: date('2024-01-01T12:00:00Z') },
      { id: 'e3', emotion: 'excited', intensity: 8, timestamp: date('2024-01-02T10:00:00Z') },
    ] as any;
    const sensory: SensoryEntry[] = [
      { id: 's1', response: 'seeking', timestamp: date('2024-01-01T09:00:00Z') },
      { id: 's2', response: 'avoiding', timestamp: date('2024-01-03T10:00:00Z') },
    ] as any;

    const rows = prepareEmotionTrendsData(emotions, sensory);

    expect(rows).toEqual([
      {
        date: '2024-01-01',
        avgEmotionIntensity: 5,
        positiveEmotions: 1,
        negativeEmotions: 1,
        totalSensoryInputs: 1,
      },
      {
        date: '2024-01-02',
        avgEmotionIntensity: 8,
        positiveEmotions: 1,
        negativeEmotions: 0,
        totalSensoryInputs: 0,
      },
      {
        date: '2024-01-03',
        avgEmotionIntensity: 0,
        positiveEmotions: 0,
        negativeEmotions: 0,
        totalSensoryInputs: 1,
      },
    ]);
  });

  it('handles invalid timestamps and coerces intensity', () => {
    const emotions: EmotionEntry[] = [
      { id: 'e1', emotion: 'PROUD', intensity: '7' as any, timestamp: new Date(NaN) },
      { id: 'e2', emotion: 'frustrated', intensity: '3' as any, timestamp: new Date('2024-01-05T00:00:00Z') },
    ] as any;
    const sensory: SensoryEntry[] = [
      { id: 's1', response: 'neutral', timestamp: new Date('invalid') as any },
      { id: 's2', response: 'neutral', timestamp: new Date('2024-01-05T05:00:00Z') },
    ] as any;

    const rows = prepareEmotionTrendsData(emotions, sensory);
    expect(rows).toEqual([
      {
        date: '2024-01-05',
        avgEmotionIntensity: 3,
        positiveEmotions: 0,
        negativeEmotions: 1,
        totalSensoryInputs: 1,
      },
    ]);
  });
});


