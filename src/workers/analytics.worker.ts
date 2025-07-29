/**
 * @file src/workers/analytics.worker.ts
 * 
 * This is a web worker dedicated to performing heavy analytics computations
 * in a background thread, ensuring the main UI thread remains responsive.
 * It listens for messages containing student data, runs a series of analyses,
 * and posts the results back to the main thread.
 */
import { PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import { PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { createCachedPatternAnalysis } from '@/lib/cachedPatternAnalysis';
import { AnalyticsConfiguration } from '@/lib/analyticsConfig';

interface CacheEntry {
  data: unknown;
  expires: number;
  tags?: string[];
}

// Create a simple cache implementation for the worker
const workerCache = {
  storage: new Map<string, CacheEntry>(),
  
  get(key: string): unknown | undefined {
    const entry = this.storage.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.storage.delete(key);
    return undefined;
  },
  
  set(key: string, value: unknown, tags: string[] = []): void {
    this.storage.set(key, {
      data: value,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes TTL
      tags
    });
  },
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  },
  
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.storage.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.storage.delete(key);
        count++;
      }
    }
    return count;
  },
  
  getDataFingerprint(data: unknown): string {
    const stringify = (obj: unknown): string => {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj !== 'object') return String(obj);
      if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
      
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      return `{${keys.map(k => `${k}:${stringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
    };

    const str = stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },
  
  createKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join(':');
    return `${prefix}:${sortedParams}`;
  }
};

// Create cached pattern analysis instance
const cachedAnalysis = createCachedPatternAnalysis(workerCache);

// Configuration passed from main thread
let currentConfig: AnalyticsConfiguration | null = null;

/**
 * @interface AnalyticsData
 * Defines the shape of the data the worker expects to receive.
 */
export interface AnalyticsData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  cacheKey?: string; // Optional cache key for storing results
  config?: AnalyticsConfiguration; // Configuration passed from main thread
}

/**
 * @interface AnalyticsResults
 * Defines the shape of the results the worker will post back to the main thread.
 */
export interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
  cacheKey?: string; // Include cache key in results for storage
}

/**
 * Generates high-level, human-readable insights from the raw analysis results.
 * This function consolidates the most significant findings into a simple string array.
 * @param {PatternResult[]} emotionPatterns - The results from emotion pattern analysis.
 * @param {PatternResult[]} sensoryPatterns - The results from sensory pattern analysis.
 * @param {CorrelationResult[]} correlations - The results from correlation analysis.
 * @param {AnalyticsData} data - The raw data used for the analysis.
 * @returns {string[]} An array of insight strings.
 */
const generateInsights = (
  emotionPatterns: PatternResult[],
  sensoryPatterns: PatternResult[],
  correlations: CorrelationResult[],
  data: AnalyticsData
): string[] => {
    const allInsights: string[] = [];
  
      if (data.entries.length < 5) {
        allInsights.push(
          `Limited data available (${data.entries.length} sessions). Consider collecting more tracking sessions for better pattern analysis.`
        );
      }
  
      const highConfidenceEmotionPatterns = emotionPatterns.filter(p => p.confidence > 0.7);
      if (highConfidenceEmotionPatterns.length > 0) {
        const pattern = highConfidenceEmotionPatterns[0];
        allInsights.push(
          `Strong ${pattern.pattern.replace('-', ' ')} pattern detected with ${Math.round(pattern.confidence * 100)}% confidence.`
        );
      }
  
      const highConfidenceSensoryPatterns = sensoryPatterns.filter(p => p.confidence > 0.6);
      if (highConfidenceSensoryPatterns.length > 0) {
        const pattern = highConfidenceSensoryPatterns[0];
        allInsights.push(
          `${pattern.description} - consider implementing the recommended strategies.`
        );
      }
  
      const strongCorrelations = correlations.filter(c => c.significance === 'high');
      if (strongCorrelations.length > 0) {
        strongCorrelations.forEach(correlation => {
          allInsights.push(
            `Strong correlation found: ${correlation.description}`
          );
        });
      }
  
      return allInsights.length > 0 ? allInsights : [
        'Continue collecting data to identify meaningful patterns and insights.'
      ];
};

/**
 * Main message handler for the worker.
 * This function is triggered when the main thread calls `worker.postMessage()`.
 * It orchestrates the analysis process and posts the results back.
 */
self.onmessage = async (e: MessageEvent<AnalyticsData>) => {
  const filteredData = e.data;
  
  // Update configuration if provided
  if (filteredData.config) {
    currentConfig = filteredData.config;
  }

  // Early exit if there is no data to analyze.
  if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) {
    postMessage({
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: [],
      });
    return;
  }

  try {
    // Use configured time window or default to 30 days
    const timeWindow = currentConfig?.timeWindows?.defaultAnalysisDays || 30;
    
    const emotionPatterns = filteredData.emotions.length > 0
      ? cachedAnalysis.analyzeEmotionPatterns(filteredData.emotions, timeWindow)
      : [];
    const sensoryPatterns = filteredData.sensoryInputs.length > 0
      ? cachedAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs, timeWindow)
      : [];
    
    const patterns = [...emotionPatterns, ...sensoryPatterns];

    let correlations: CorrelationResult[] = [];
    if (filteredData.entries.length > 2) {
      correlations = cachedAnalysis.analyzeEnvironmentalCorrelations(filteredData.entries);
    }

    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];
    if (filteredData.entries.length > 1) {
      predictiveInsights = await cachedAnalysis.generatePredictiveInsights(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries,
        []
      );

      anomalies = cachedAnalysis.detectAnomalies(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries
      );
    }

    const insights = generateInsights(emotionPatterns, sensoryPatterns, correlations, filteredData);

    const results: AnalyticsResults = {
      patterns,
      correlations,
      predictiveInsights,
      anomalies,
      insights,
      cacheKey: filteredData.cacheKey, // Include cache key if provided
    };

    // Post the final results back to the main thread.
    postMessage(results);

  } catch (error) {
    console.error('Error in analytics worker:', error);
    // Post an error message back to the main thread for graceful error handling.
    postMessage({ error: 'Failed to analyze data.' });
  }
}; 