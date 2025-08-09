/**
 * Type definitions for analytics and pattern analysis
 */
import { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import { PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { EmotionEntry, SensoryEntry, TrackingEntry } from './student';

/**
 * Analytics data input structure
 */
export interface AnalyticsData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  cacheKey?: string;
  config?: AnalyticsConfiguration;
}

/**
 * Keys representing dashboard charts that can be updated by worker messages
 */
export type AnalyticsChartKey =
  | 'emotionDistribution'
  | 'sensoryResponses'
  | 'emotionTrends'
  | 'patternHighlights'
  | 'correlationMatrix'
  | 'predictiveTimeline'
  | 'anomalyTimeline'
  | 'insightList';

/**
 * Analytics results structure
 */
export interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  environmentalCorrelations?: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
  cacheKey?: string;
  error?: string;
  /** Optional metadata for downstream consumers describing which charts should update */
  updatedCharts?: AnalyticsChartKey[];
}

/**
 * Partial analytics results for incremental updates from the worker
 */
export type AnalyticsResultsPartial = Partial<AnalyticsResults> & { cacheKey?: string };

/**
 * Worker message envelope for incremental communication
 */
export type WorkerMessageType = 'progress' | 'partial' | 'complete' | 'error';

export interface AnalyticsWorkerMessage {
  type: WorkerMessageType;
  cacheKey?: string;
  payload?: AnalyticsResultsPartial;
  error?: string;
  /** Which charts should update in response to this message */
  chartsUpdated?: AnalyticsChartKey[];
  /** Optional progress metadata for UI feedback and watchdog heartbeats */
  progress?: { stage: string; percent: number };
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfiguration {
  patternAnalysis: {
    minDataPoints: number;
    confidenceThreshold: number;
    significanceLevel: number;
  };
  enhancedAnalysis: {
    enablePredictiveInsights: boolean;
    enableAnomalyDetection: boolean;
    mlModelConfidence: number;
  };
  timeWindows: {
    defaultAnalysisDays: number;
    shortTermDays: number;
    longTermDays: number;
  };
  alertSensitivity: {
    level: 'low' | 'medium' | 'high';
    emotionIntensityMultiplier: number;
    frequencyMultiplier: number;
    anomalyMultiplier: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    invalidateOnConfigChange: boolean;
  };
}

/**
 * Cache interface for pattern analysis
 */
export interface AnalyticsCacheInterface {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, tags?: string[]): void;
  has(key: string): boolean;
  invalidateByTag(tag: string): number;
  getDataFingerprint(data: unknown): string;
  createKey(prefix: string, params: Record<string, unknown>): string;
}

/**
 * Worker cache entry
 */
export interface WorkerCacheEntry {
  data: unknown;
  expires: number;
  tags?: string[];
}
