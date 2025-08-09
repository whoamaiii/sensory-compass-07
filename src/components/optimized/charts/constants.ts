/**
 * Emotion color palette used across charts.
 * Keys should match canonical emotion names coming from data.
 */
export const EMOTION_COLORS = {
  happy: '#10B981',
  calm: '#06B6D4',
  excited: '#8B5CF6',
  sad: '#3B82F6',
  anxious: '#F59E0B',
  angry: '#EF4444',
} as const;

/** Default heights for chart types used in optimized components. */
export const DEFAULT_CHART_HEIGHT = {
  trends: 300,
  pie: 250,
  bar: 250,
} as const;

/** Moving average window (in days) for trends. */
export const TREND_MOVING_AVERAGE_WINDOW = 7;

/** Threshold guide-lines for trends charts (teacher-friendly defaults). */
export const TREND_THRESHOLDS = {
  emotion: 7,
  sensory: 5,
} as const;

/** Colors for sensory response stacked bar series. */
export const SENSORY_BAR_COLORS = {
  seeking: '#10B981',
  avoiding: '#EF4444',
  neutral: '#6B7280',
} as const;


