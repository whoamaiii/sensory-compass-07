import { h64 } from 'xxhashjs';

/**
 * @file src/hooks/useAnalyticsWorker.ts
 * 
 * This hook encapsulates the logic for interacting with the analytics web worker.
 * It simplifies the process of creating, communicating with, and terminating the worker,
 * providing a clean, React-friendly interface for components to offload heavy computations.
 * Now enhanced with performance caching to avoid redundant calculations.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyticsData, AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import { usePerformanceCache } from './usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { logger } from '@/lib/logger';
import { diagnostics } from '@/lib/diagnostics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import AnalyticsWorker from '@/workers/analytics.worker?worker';

// Define CacheStats type if not imported from usePerformanceCache
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  invalidations: number;
  hitRate: number;
  size: number;
  memoryUsage?: number;
}

interface CachedAnalyticsWorkerOptions {
  cacheTTL?: number;
  enableCacheStats?: boolean;
  precomputeOnIdle?: boolean;
}

interface UseAnalyticsWorkerReturn {
  results: AnalyticsResults | null;
  isAnalyzing: boolean;
  error: string | null;
  runAnalysis: (data: AnalyticsData) => Promise<void>;
  precomputeCommonAnalytics: (dataProvider: () => AnalyticsData[]) => void;
  invalidateCacheForStudent: (studentId: string) => void;
  clearCache: () => void;
  cacheStats: CacheStats | null;
  cacheSize: number;
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
export const useAnalyticsWorker = (options: CachedAnalyticsWorkerOptions = {}): UseAnalyticsWorkerReturn => {
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

  useEffect(() => {
    // Initialize the analytics web worker
    try {
      const worker = new AnalyticsWorker();
      workerRef.current = worker;

      // Set up message handler for receiving results from the worker
      worker.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
        const { data: msg } = event;

        // Any message resets watchdog (heartbeat)
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }

        if (msg.type === 'progress') {
          // Re-arm watchdog on heartbeat, keep analyzing true
          setIsAnalyzing(true);
          const timeoutMs = Math.max(15000, 3000);
          watchdogRef.current = setTimeout(() => {
            diagnostics.logWorkerTimeout('analytics', timeoutMs);
            setError('Worker timeout during progress.');
          }, timeoutMs);
          return;
        }

        if (msg.type === 'error') {
          logger.error('[useAnalyticsWorker] Worker error', msg.error);
          setError(msg.error || 'Unknown worker error');
          setIsAnalyzing(false);
          return;
        }

        if (msg.type === 'partial' && msg.payload) {
          // Merge partials into current results to enable incremental UI updates
          setResults(prev => {
            const base: AnalyticsResults = prev || {
              patterns: [],
              correlations: [],
              environmentalCorrelations: [],
              predictiveInsights: [],
              anomalies: [],
              insights: [],
              cacheKey: msg.cacheKey,
            };
            const merged: AnalyticsResults = {
              ...base,
              ...msg.payload,
              environmentalCorrelations: msg.payload.environmentalCorrelations || base.environmentalCorrelations || [],
              cacheKey: msg.cacheKey || base.cacheKey,
            };
            return merged;
          });
          setError(null);
          // Re-arm watchdog for next step
          const timeoutMs = Math.max(15000, 3000);
          watchdogRef.current = setTimeout(() => {
            diagnostics.logWorkerTimeout('analytics', timeoutMs);
            setError('Worker timeout after partial update.');
            setIsAnalyzing(false);
          }, timeoutMs);
          return;
        }

        if (msg.type === 'complete' && msg.payload) {
          const resultsWithDefaults: AnalyticsResults = {
            ...msg.payload,
            environmentalCorrelations: msg.payload.environmentalCorrelations || [],
          } as AnalyticsResults;

          const tags = extractTagsFromData(resultsWithDefaults);
          if (resultsWithDefaults.cacheKey) {
            cache.set(resultsWithDefaults.cacheKey, resultsWithDefaults, tags);
          }

          setResults(resultsWithDefaults);
          setError(null);
          setIsAnalyzing(false);
          logger.debug('[useAnalyticsWorker] Received complete results from worker', { 
            cacheKey: resultsWithDefaults.cacheKey,
            patternsCount: resultsWithDefaults.patterns?.length || 0,
            insightsCount: resultsWithDefaults.insights?.length || 0,
            chartsUpdated: msg.chartsUpdated,
          });
          return;
        }
      };

      // Set up error handler for worker failures
      worker.onerror = async (error: ErrorEvent) => {
        logger.error('[useAnalyticsWorker] Worker runtime error, switching to fallback', error);
        
        // Clear watchdog timer
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        
        // Terminate the failed worker and set to null to trigger fallback
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        
        // If we have pending analysis, process with fallback
        // This ensures we don't lose the current analysis request
        setError('Analytics worker encountered an error. Switching to fallback mode.');
        
        // Note: The next call to runAnalysis will automatically use the fallback
        // since workerRef.current is now null
      };

      logger.info('[useAnalyticsWorker] Analytics worker initialized successfully');
    } catch (error) {
      // If worker initialization fails, log and use fallback mode
      logger.error('[useAnalyticsWorker] Failed to initialize worker', error);
      workerRef.current = null;
    }

    // Cleanup function to properly terminate worker on unmount
    return () => {
      if (workerRef.current) {
        logger.debug('[useAnalyticsWorker] Terminating analytics worker');
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [cache, extractTagsFromData]);

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
    const dataFingerprint = h64(JSON.stringify({
      emotions: emotionsSorted,
      sensoryInputs: sensorySorted,
      entries: data.entries,
    }), 0xABCD).toString(16);

    return cache.createKey('analytics', {
      fingerprint: dataFingerprint,
      dataPoints: data.emotions.length + data.sensoryInputs.length + data.entries.length
    });
  }, [cache]);

  /**
   * Sends data to the worker to start a new analysis, checking cache first.
   * @param {AnalyticsData} data - The data to be analyzed.
   */
  const runAnalysis = useCallback(async (data: AnalyticsData) => {
    const cacheKey = createCacheKey(data);
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      // Reduce logging verbosity - only log on first hit per key
      if (!cache.get(`_logged_${cacheKey}`)) {
        try {
          logger.debug('[useAnalyticsWorker] cache hit', { cacheKey });
          cache.set(`_logged_${cacheKey}`, true, ['logging'], 60000); // Log once per minute max
        } catch (err) {
          /* noop */
        }
      }
      setResults(cachedResult);
      setError(null);
      return;
    }

    // If no worker available, use fallback
    if (!workerRef.current) {
      // Only log fallback mode once per session
      if (!cache.get('_logged_fallback_mode')) {
        logger.debug('[useAnalyticsWorker] No worker available, using fallback');
        cache.set('_logged_fallback_mode', true, ['logging'], 3600000); // Log once per hour
      }
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
          environmentalCorrelations: [],
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
    const cfg = analyticsConfig.getConfig();
    // Clamp watchdog timeout to a sane upper bound to avoid indefinite spinners.
    // Use config ttl as a hint but never exceed 20s; keep a 5s lower bound.
    const hint = cfg?.cache?.ttl ?? 15000;
    const timeoutMs = Math.min(20000, Math.max(5000, hint));
    watchdogRef.current = setTimeout(async () => {
      try {
        logger.error('[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback');
      } catch {
        /* noop */
      }
      diagnostics.logWorkerTimeout('analytics', timeoutMs);
      
      // Terminate unresponsive worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Attempt fallback processing
      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics(data);
        setResults(fallbackResults);
        const tags = extractTagsFromData(data);
        cache.set(cacheKey, fallbackResults, tags);
        setError('Worker timeout - results computed using fallback mode.');
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback failed after watchdog timeout', fallbackError);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        setResults({
          patterns: [],
          correlations: [],
          environmentalCorrelations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        });
      } finally {
        setIsAnalyzing(false);
      }
    }, timeoutMs);
    
    // Get current configuration
    const config = analyticsConfig.getConfig();

    // Rate limit worker posting logs
    const logKey = `_logged_worker_post_${new Date().getMinutes()}`;
    if (!cache.get(logKey)) {
      try {
        logger.debug('[useAnalyticsWorker] posting to worker (runAnalysis)', { hasConfig: !!config, cacheKey });
        cache.set(logKey, true, ['logging'], 60000); // Log at most once per minute
      } catch {
        /* noop */
      }
    }
    
    // Send data to worker with cache key and configuration
    try {
      const messagePayload = { ...data, cacheKey, config };
      // Rate limit WORKER_MESSAGE logs
      const workerLogKey = `_logged_worker_message_${cacheKey}_${new Date().getMinutes()}`;
      if (!cache.get(workerLogKey)) {
        logger.debug('[WORKER_MESSAGE] Sending message to analytics worker', {
          cacheKey,
          dataSize: JSON.stringify(messagePayload).length,
          emotionsCount: data.emotions?.length || 0,
          sensoryInputsCount: data.sensoryInputs?.length || 0,
          entriesCount: data.entries?.length || 0
        });
        cache.set(workerLogKey, true, ['logging'], 60000); // Log once per minute per cache key
      }
      workerRef.current.postMessage(messagePayload);
    } catch (postErr) {
      logger.error('[WORKER_MESSAGE] Failed to post message to worker, falling back to sync', { error: postErr });
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      
      // Fallback to synchronous processing
      try {
        const fallbackResults = await analyticsWorkerFallback.processAnalytics(data);
        setResults(fallbackResults);
        const tags = extractTagsFromData(data);
        cache.set(cacheKey, fallbackResults, tags);
        setError(null);
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback processing failed after worker post error', fallbackError);
        setError('Analytics processing failed.');
      } finally {
        setIsAnalyzing(false);
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