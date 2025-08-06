
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

