
import { EmotionEntry, SensoryEntry } from '@/types/student';
import { bin, extent } from 'vega-transforms';

/**
 * Aggregates emotion and sensory entries by day, calculating the total count
 * and average intensity for each day. This is useful for visualizing trends
 * over time.
 *
 * @param entries - An array of EmotionEntry or SensoryEntry objects. Each object
 *   must have a `timestamp` and `intensity` property.
 * @returns An array of objects, where each object represents a day and contains
 *   the date, the total number of entries for that day, and the average
 *   intensity of those entries.
 *
 * @example
 * const entries = [
 *   { timestamp: '2023-01-01T12:00:00Z', intensity: 5 },
 *   { timestamp: '2023-01-01T18:00:00Z', intensity: 3 },
 *   { timestamp: '2023-01-02T09:00:00Z', intensity: 8 },
 * ];
 * const dailyStats = aggregateEntriesByDay(entries);
 * // dailyStats will be:
 * // [
 * //   { date: '2023-01-01', count: 2, averageIntensity: 4 },
 * //   { date: '2023-01-02', count: 1, averageIntensity: 8 },
 * // ]
 */
export function aggregateEntriesByDay(entries: (EmotionEntry | SensoryEntry)[]) {
  const aggregated = entries.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { count: 0, totalIntensity: 0 };
    }
    acc[date].count++;
    acc[date].totalIntensity += entry.intensity;
    return acc;
  }, {} as Record<string, { count: number; totalIntensity: number }>);

  return Object.entries(aggregated).map(([date, { count, totalIntensity }]) => ({
    date,
    count,
    averageIntensity: totalIntensity / count,
  }));
}

/**
 * Computes intensity bins for a collection of emotion or sensory entries.
 * This function uses the vega-transforms `bin` utility to partition the
 * entries into a specified number of bins based on their intensity levels.
 *
 * @param entries - An array of EmotionEntry or SensoryEntry objects. Each
 *   object must have an `intensity` property.
 * @returns An array of objects, where each object represents an intensity
 *   bin. It includes the bin range as a string (e.g., "0-2") and the
 *   number of entries falling within that bin.
 *
 * @example
 * const entries = [
 *   { intensity: 1 },
 *   { intensity: 2 },
 *   { intensity: 5 },
 *   { intensity: 8 },
 *   { intensity: 9 },
 * ];
 * const intensityBins = computeIntensityBins(entries);
 * // Example output (exact bins may vary based on implementation):
 * // [
 * //   { bin: '0-2', count: 2 },
 * //   { bin: '4-6', count: 1 },
 * //   { bin: '8-10', count: 2 },
 * // ]
 */
export function computeIntensityBins(entries: (EmotionEntry | SensoryEntry)[]) {
  const intensityExtent = extent(entries, (d: EmotionEntry | SensoryEntry) => d.intensity);
  const binned = bin({ extent: intensityExtent, maxbins: 5 })(entries, (d: EmotionEntry | SensoryEntry) => d.intensity);

  return binned.map((bin: any) => ({
    bin: `${bin.x0}-${bin.x1}`,
    count: bin.length,
  }));
}

/**
 * Prepare rows for the Emotion Trends chart by aggregating daily stats from
 * emotion events and sensory inputs. Pure and deterministic for unit testing.
 */
export function prepareEmotionTrendsData(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
): Array<{
  date: string;
  avgEmotionIntensity: number;
  positiveEmotions: number;
  negativeEmotions: number;
  totalSensoryInputs: number;
}> {
  const byDate = new Map<
    string,
    { date: string; avgEmotionIntensity: number; positiveEmotions: number; negativeEmotions: number; totalSensoryInputs: number; count: number }
  >();

  const positiveSet = new Set(['happy', 'calm', 'focused', 'excited', 'proud']);
  const negativeSet = new Set(['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed']);

  for (const emotion of emotions) {
    const dateObj = emotion.timestamp instanceof Date ? emotion.timestamp : new Date(emotion.timestamp as any);
    if (Number.isNaN(dateObj.getTime())) continue;
    const key = dateObj.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, {
        date: key,
        avgEmotionIntensity: 0,
        positiveEmotions: 0,
        negativeEmotions: 0,
        totalSensoryInputs: 0,
        count: 0,
      });
    }
    const row = byDate.get(key)!;
    const intensityRaw = (emotion as any).intensity;
    const intensity = typeof intensityRaw === 'number' ? intensityRaw : Number(intensityRaw) || 0;
    row.avgEmotionIntensity = (row.avgEmotionIntensity * row.count + intensity) / (row.count + 1);
    row.count += 1;
    const name = String((emotion as any).emotion || '').toLowerCase();
    if (positiveSet.has(name)) row.positiveEmotions += 1;
    if (negativeSet.has(name)) row.negativeEmotions += 1;
  }

  for (const sensory of sensoryInputs) {
    const dateObj = sensory.timestamp instanceof Date ? sensory.timestamp : new Date(sensory.timestamp as any);
    if (Number.isNaN(dateObj.getTime())) continue;
    const key = dateObj.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, {
        date: key,
        avgEmotionIntensity: 0,
        positiveEmotions: 0,
        negativeEmotions: 0,
        totalSensoryInputs: 0,
        count: 0,
      });
    }
    const row = byDate.get(key)!;
    row.totalSensoryInputs += 1;
  }

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ count, ...rest }) => rest);
}

