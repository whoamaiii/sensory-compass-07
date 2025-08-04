/**
 * @file src/hooks/useAnalyticsWorker.ts
 * 
 * This hook encapsulates the logic for interacting with the analytics web worker.
 * It simplifies the process of creating, communicating with, and terminating the worker,
 * providing a clean, React-friendly interface for components to offload heavy computations.
 * Now enhanced with performance caching to avoid redundant calculations.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyticsData, AnalyticsResults } from '@/workers/analytics.worker';
import { usePerformanceCache } from './usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';
import { diagnostics } from '@/lib/diagnostics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';

interface CachedAnalyticsWorkerOptions {
  cacheTTL?: number;
  enableCacheStats?: boolean;
  precomputeOnIdle?: boolean;
}

/**
 * @hook useAnalyticsWorker
 * 
 * A custom hook to manage the analytics web worker with integrated caching.
 * 
 * @param options Configuration options for caching and precomputation
 * @returns {object} An object containing:
 *  - `results`: The latest analysis results received from the worker or cache.
 *  - `isAnalyzing`: A boolean flag indicating if an analysis is currently in progress.
 *  - `error`: Any error message returned from the worker.
 *  - `runAnalysis`: A function to trigger a new analysis by posting data to the worker.
 *  - `cacheStats`: Performance statistics about cache usage (if enabled).
 *  - `clearCache`: Function to clear the analytics cache.
 *  - `invalidateCache`: Function to invalidate cache entries by tag or pattern.
 */
export const useAnalyticsWorker = (options: CachedAnalyticsWorkerOptions = {}) => {
  const {
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    enableCacheStats = false,
    precomputeOnIdle = false
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<AnalyticsResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idleCallbackRef = useRef<number | null>(null);

  // Initialize performance cache with appropriate settings
  const cache = usePerformanceCache<AnalyticsResults>({
    maxSize: 50, // Store up to 50 analytics results
    ttl: cacheTTL,
    enableStats: enableCacheStats,
    versioning: true // Enable versioning to invalidate on data structure changes
  });

  useEffect(() => {
    // Skip worker initialization - use fallback mode directly
    // This ensures analytics work without worker complications
    logger.info('[useAnalyticsWorker] Using fallback mode for analytics');
    workerRef.current = null;

    // Cleanup function
    return () => {
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, []);

  /**
   * Creates a cache key based on the analytics data
   */
  const createCacheKey = useCallback((data: AnalyticsData): string => {
    // Defensive copy and sort by timestamp to stabilize latest calculations
    const emotionsSorted = [...data.emotions].sort((a, b) => (b.timestamp?.getTime?.() ?? 0) - (a.timestamp?.getTime?.() ?? 0));
    const sensorySorted = [...data.sensoryInputs].sort((a, b) => (b.timestamp?.getTime?.() ?? 0) - (a.timestamp?.getTime?.() ?? 0));

    const latestEmotionDate = emotionsSorted[0]?.timestamp ?? null;
    const latestSensoryDate = sensorySorted[0]?.timestamp ?? null;

    // Create a fingerprint of the data for cache key
    const dataFingerprint = cache.getDataFingerprint({
      emotionCount: data.emotions.length,
      sensoryCount: data.sensoryInputs.length,
      entryCount: data.entries.length,
      // Include some data characteristics for better cache discrimination
      latestEmotionDate,
      latestSensoryDate,
      emotionTypes: Array.from(new Set(data.emotions.map(e => e.emotion))).sort(),
      sensoryTypes: Array.from(new Set(data.sensoryInputs.map(s => s.type))).sort(),
      studentTags: Array.from(new Set(data.entries.map(e => e.studentId))).sort()
    });

    return cache.createKey('analytics', {
      fingerprint: dataFingerprint,
      dataPoints: data.emotions.length + data.sensoryInputs.length + data.entries.length
    });
  }, [cache]);

  /**
   * Extracts tags from analytics data for cache invalidation
   */
  const extractTagsFromData = useCallback((data: AnalyticsData | AnalyticsResults): string[] => {
    const tags: string[] = ['analytics'];
    
    // Add student-specific tags if available
    if ('entries' in data && data.entries.length > 0) {
      const studentIds = Array.from(new Set(data.entries.map(e => e.studentId)));
      tags.push(...studentIds.map(id => `student-${id}`));
    }

    // Add date-based tags for time-sensitive invalidation
    const now = new Date();
    tags.push(`analytics-${now.getFullYear()}-${now.getMonth() + 1}`);
    
    return tags;
  }, []);

  /**
   * Sends data to the worker to start a new analysis, checking cache first.
   * @param {AnalyticsData} data - The data to be analyzed.
   */
  const runAnalysis = useCallback(async (data: AnalyticsData) => {
    const cacheKey = createCacheKey(data);
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      try {
        logger.debug('[useAnalyticsWorker] cache hit', { cacheKey });
      } catch (err) {
        /* noop */
      }
      setResults(cachedResult);
      setError(null);
      return;
    }

    // If no worker available, use fallback
    if (!workerRef.current) {
      logger.warn('[useAnalyticsWorker] No worker available, using fallback');
      setIsAnalyzing(true);
      setError(null);
      
      try {
        const results = await analyticsWorkerFallback.processAnalytics(data);
        setResults(results);
        // Cache the results
        const tags = extractTagsFromData(data);
        cache.set(cacheKey, results, tags);
      } catch (error) {
        logger.error('[useAnalyticsWorker] Fallback failed', error);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        setResults({
          patterns: [],
          correlations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        });
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // If not in cache, proceed with worker analysis
    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    // Start watchdog timeout to prevent indefinite spinner
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    // Determine timeout from config if available; fallback to 15s minimum 3s
    const cfg = analyticsConfig.getConfig() as unknown as { timeouts?: { workerResponseMs?: number } };
    const timeoutMs = Math.max(cfg?.timeouts?.workerResponseMs ?? 15000, 3000);
    watchdogRef.current = setTimeout(() => {
      try {
        logger.error('[useAnalyticsWorker] watchdog timeout: worker did not respond');
      } catch {
        /* noop */
      }
      diagnostics.logWorkerTimeout('analytics', timeoutMs);
      setError('Analytics worker did not respond. Please try again.');
      setIsAnalyzing(false);
    }, timeoutMs);
    
    // Get current configuration
    const config = analyticsConfig.getConfig();

    try {
        logger.debug('[useAnalyticsWorker] posting to worker (runAnalysis)', { hasConfig: !!config, cacheKey });
    } catch {
      /* noop */
    }
    
    // Send data to worker with cache key and configuration
    try {
      const messagePayload = { ...data, cacheKey, config };
      logger.debug('[WORKER_MESSAGE] Sending message to analytics worker', { 
        cacheKey, 
        dataSize: JSON.stringify(messagePayload).length,
        emotionsCount: data.emotions?.length || 0,
        sensoryInputsCount: data.sensoryInputs?.length || 0,
        entriesCount: data.entries?.length || 0
      });
      workerRef.current.postMessage(messagePayload);
      logger.debug('[WORKER_MESSAGE] Message sent successfully to analytics worker');
    } catch (postErr) {
      logger.error('[WORKER_MESSAGE] Failed to send message to analytics worker', postErr);
      setError('Failed to communicate with analytics worker.');
      setIsAnalyzing(false);
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    }
  }, [cache, createCacheKey, extractTagsFromData]);

  /**
   * Pre-compute analytics for common queries during idle time
   */
  const precomputeCommonAnalytics = useCallback((dataProvider: () => AnalyticsData[]) => {
    if (!precomputeOnIdle || !workerRef.current) return;

    const precompute = () => {
      const commonDataSets = dataProvider();
      const config = analyticsConfig.getConfig();
      
      commonDataSets.forEach((data, index) => {
        // Stagger the precomputation to avoid blocking
        setTimeout(() => {
          const cacheKey = createCacheKey(data);
          
          // Only compute if not already cached
          if (!cache.has(cacheKey)) {
            try {
        logger.debug('[useAnalyticsWorker] posting to worker (precompute)', { hasConfig: !!config, cacheKey, idx: index });
            } catch {
              /* noop */
            }
            workerRef.current?.postMessage({ ...data, cacheKey, config });
          }
        }, index * 100); // 100ms between each precomputation
      });
    };

    // Use requestIdleCallback for precomputation
    if ('requestIdleCallback' in window) {
      idleCallbackRef.current = requestIdleCallback(precompute, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(precompute, 2000);
    }
  }, [precomputeOnIdle, cache, createCacheKey]);

  /**
   * Invalidate cache entries for a specific student
   */
  const invalidateCacheForStudent = useCallback((studentId: string) => {
    cache.invalidateByTag(`student-${studentId}`);
  }, [cache]);

  /**
   * Invalidate all analytics cache entries
   */
  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  /**
   * Subscribe to configuration changes to invalidate cache
   */
  useEffect(() => {
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      if (newConfig.cache.invalidateOnConfigChange) {
        clearCache();
      }
    });

    return unsubscribe;
  }, [clearCache]);

  /**
   * Get current cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cache.stats;
  }, [cache]);

  return {
    results,
    isAnalyzing,
    error,
    runAnalysis,
    precomputeCommonAnalytics,
    invalidateCacheForStudent,
    clearCache,
    cacheStats: getCacheStats(),
    cacheSize: cache.size
  };
};