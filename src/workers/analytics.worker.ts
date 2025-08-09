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
import { AnalyticsData, AnalyticsResults, AnalyticsConfiguration, WorkerCacheEntry, AnalyticsWorkerMessage } from '@/types/analytics';
import { createCachedPatternAnalysis } from '@/lib/cachedPatternAnalysis';
import { logger } from '@/lib/logger';

// Type is now imported from @/types/analytics

let workerCacheTTL = 5 * 60 * 1000; // default 5 minutes, overridden by config
let workerCacheMaxSize = 200; // soft cap, overridden by config if provided
const insertionOrder: string[] = []; // FIFO order for eviction

// Create a simple cache implementation for the worker
const workerCache = {
  storage: new Map<string, WorkerCacheEntry>(),
  
  get(key: string): unknown | undefined {
    const entry = this.storage.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    // Expired or missing: ensure removal
    this.storage.delete(key);
    return undefined;
  },
  
  set(key: string, value: unknown, tags: string[] = []): void {
    // Insert/update
    if (!this.storage.has(key)) {
      insertionOrder.push(key);
    }
    this.storage.set(key, {
      data: value,
      expires: Date.now() + workerCacheTTL,
      tags
    });
    // Evict oldest until under max size
    while (insertionOrder.length > workerCacheMaxSize) {
      const oldestKey = insertionOrder.shift();
      if (oldestKey) {
        this.storage.delete(oldestKey);
      }
    }
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
    if (count > 0) {
      // Rebuild insertion order without deleted keys
      const remaining = insertionOrder.filter(k => this.storage.has(k));
      insertionOrder.length = 0;
      insertionOrder.push(...remaining);
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

/**
 * Compute a stable hash for the subset of config that affects analysis output.
 */
const getConfigHash = (cfg: AnalyticsConfiguration | null): string => {
  if (!cfg) return 'no-config';
  const subset = {
    patternAnalysis: cfg.patternAnalysis,
    enhancedAnalysis: cfg.enhancedAnalysis,
    timeWindows: cfg.timeWindows,
    alertSensitivity: cfg.alertSensitivity
  };
  // Reuse workerCache fingerprint utility by temporary object
  const stringify = (obj: unknown): string => {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return `{${keys.map(k => `${k}:${stringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
  };
  const str = stringify(subset);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Outgoing message queue to avoid flooding the main thread with messages
const outgoingQueue: AnalyticsWorkerMessage[] = [];
let flushScheduled = false;
const enqueueMessage = (msg: AnalyticsWorkerMessage) => {
  outgoingQueue.push(msg);
  if (!flushScheduled) {
    flushScheduled = true;
    setTimeout(() => {
      try {
        while (outgoingQueue.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (postMessage as any)(outgoingQueue.shift());
        }
      } finally {
        flushScheduled = false;
      }
    }, 30);
  }
};

// Configuration passed from main thread
let currentConfig: AnalyticsConfiguration | null = null;

// Types are now imported from @/types/analytics
export type { AnalyticsData, AnalyticsResults } from '@/types/analytics';

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
export async function handleMessage(e: MessageEvent<AnalyticsData>) {
  const filteredData = e.data;

  // Diagnostic log: message received - use cache to limit verbosity
  try {
    const logKey = `worker_msg_${filteredData?.cacheKey || 'nocache'}_${new Date().getMinutes()}`;
    if (!workerCache.has(logKey)) {
      logger.debug('[analytics.worker] onmessage', {
        hasConfig: !!filteredData?.config,
        cacheKey: filteredData?.cacheKey ?? null,
        entries: filteredData?.entries?.length ?? 0,
        emotions: filteredData?.emotions?.length ?? 0,
        sensory: filteredData?.sensoryInputs?.length ?? 0,
      });
      workerCache.set(logKey, true, ['logging']);
    }
  } catch (e) {
    /* noop */
  }

  // Update configuration if provided
  if (filteredData.config) {
    currentConfig = filteredData.config;
    if (typeof currentConfig.cache?.ttl === 'number' && currentConfig.cache.ttl > 0) {
      workerCacheTTL = currentConfig.cache.ttl;
    }
    if (typeof currentConfig.cache?.maxSize === 'number' && currentConfig.cache.maxSize > 0) {
      workerCacheMaxSize = currentConfig.cache.maxSize;
      // Trim immediately if oversize
      while (insertionOrder.length > workerCacheMaxSize) {
        const oldestKey = insertionOrder.shift();
        if (oldestKey) {
          workerCache.storage.delete(oldestKey);
        }
      }
    }
  }

// Early exit if there is no data to analyze.
  if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) {
    enqueueMessage({
      type: 'complete',
      cacheKey: filteredData.cacheKey ?? undefined,
      payload: {
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: [],
        cacheKey: filteredData.cacheKey ?? undefined,
        updatedCharts: ['insightList']
      },
      chartsUpdated: ['insightList']
    });
    return;
  }

try {
    // Use configured time window or default to 30 days
    const timeWindow = currentConfig?.timeWindows?.defaultAnalysisDays || 30;

    // Progress heartbeat: start
    enqueueMessage({ type: 'progress', cacheKey: filteredData.cacheKey, progress: { stage: 'start', percent: 5 } });

    const emotionPatterns = filteredData.emotions.length > 0
      ? cachedAnalysis.analyzeEmotionPatterns(filteredData.emotions, timeWindow)
      : [];
    const sensoryPatterns = filteredData.sensoryInputs.length > 0
      ? cachedAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs, timeWindow)
      : [];
    
    const patterns = [...emotionPatterns, ...sensoryPatterns];

    // Send partial update for patterns
    enqueueMessage({
      type: 'partial',
      cacheKey: filteredData.cacheKey,
      payload: {
        patterns,
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['patternHighlights']
      },
      chartsUpdated: ['patternHighlights'],
      progress: { stage: 'patterns', percent: 30 }
    });

    let correlations: CorrelationResult[] = [];
    if (filteredData.entries.length > 2) {
      correlations = cachedAnalysis.analyzeEnvironmentalCorrelations(filteredData.entries);
    }

    // Send partial update for correlations
    enqueueMessage({
      type: 'partial',
      cacheKey: filteredData.cacheKey,
      payload: {
        correlations,
        environmentalCorrelations: correlations,
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['correlationMatrix']
      },
      chartsUpdated: ['correlationMatrix'],
      progress: { stage: 'correlations', percent: 55 }
    });

    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];
    if (filteredData.entries.length > 1) {
      predictiveInsights = await cachedAnalysis.generatePredictiveInsights(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries,
        []
      );

      // Send partial update for predictive insights
      enqueueMessage({
        type: 'partial',
        cacheKey: filteredData.cacheKey,
        payload: {
          predictiveInsights,
          cacheKey: filteredData.cacheKey,
          updatedCharts: ['predictiveTimeline']
        },
        chartsUpdated: ['predictiveTimeline'],
        progress: { stage: 'predictiveInsights', percent: 75 }
      });

      anomalies = cachedAnalysis.detectAnomalies(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries
      );

      // Send partial update for anomalies
      enqueueMessage({
        type: 'partial',
        cacheKey: filteredData.cacheKey,
        payload: {
          anomalies,
          cacheKey: filteredData.cacheKey,
          updatedCharts: ['anomalyTimeline']
        },
        chartsUpdated: ['anomalyTimeline'],
        progress: { stage: 'anomalies', percent: 85 }
      });
    }

    const insights = generateInsights(emotionPatterns, sensoryPatterns, correlations, filteredData);

    const results: AnalyticsResults = {
      patterns,
      correlations,
      environmentalCorrelations: correlations, // Include environmental correlations
      predictiveInsights,
      anomalies,
      insights,
      cacheKey: filteredData.cacheKey, // Include cache key if provided
      updatedCharts: ['insightList']
    };

    // Post the final results back to the main thread.
    enqueueMessage({ type: 'complete', cacheKey: filteredData.cacheKey, payload: results, chartsUpdated: ['insightList'], progress: { stage: 'complete', percent: 100 } });

  } catch (error) {
    try {
    logger.error('[analytics.worker] error', error);
    } catch (e) {
      /* noop */
    }
    logger.error('Error in analytics worker:', error);
    // Post an error message back to the main thread for graceful error handling.
    // Include empty results to prevent UI errors
    enqueueMessage({
      type: 'error',
      cacheKey: filteredData.cacheKey,
      error: 'Failed to analyze data.',
      payload: {
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: ['An error occurred during analysis. Please try again.'],
        cacheKey: filteredData.cacheKey,
        updatedCharts: ['insightList']
      },
      chartsUpdated: ['insightList']
    });
  }
}

// Attach the handler to self.onmessage for the worker context
if (typeof self !== 'undefined' && 'onmessage' in self) {
  self.onmessage = handleMessage;
}
