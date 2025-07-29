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
    // Create a new worker instance using the vite-specific `new URL` pattern.
    // The worker is created only once when the hook is first used.
    workerRef.current = new Worker(new URL('@/workers/analytics.worker.ts', import.meta.url), {
        type: 'module',
      });

    // onmessage handler to receive results from the worker.
    workerRef.current.onmessage = (e: MessageEvent<AnalyticsResults & { error?: string; cacheKey?: string }>) => {
      if (e.data.error) {
        setError(e.data.error);
      } else {
        setResults(e.data);
        
        // Cache the results with appropriate tags
        if (e.data.cacheKey) {
          const tags = extractTagsFromData(e.data);
          cache.set(e.data.cacheKey, e.data, tags);
        }
      }
      setIsAnalyzing(false);
    };

    // onerror handler for any unhandled errors within the worker.
    workerRef.current.onerror = (e) => {
      console.error('Error in analytics worker:', e);
      setError('An unexpected error occurred in the analytics worker.');
      setIsAnalyzing(false);
    };

    // Cleanup function to terminate the worker when the component unmounts.
    // This is crucial to prevent memory leaks.
    return () => {
      workerRef.current?.terminate();
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
      }
    };
  }, [cache]);

  /**
   * Creates a cache key based on the analytics data
   */
  const createCacheKey = useCallback((data: AnalyticsData): string => {
    // Create a fingerprint of the data for cache key
    const dataFingerprint = cache.getDataFingerprint({
      emotionCount: data.emotions.length,
      sensoryCount: data.sensoryInputs.length,
      entryCount: data.entries.length,
      // Include some data characteristics for better cache discrimination
      latestEmotionDate: data.emotions[0]?.timestamp,
      latestSensoryDate: data.sensoryInputs[0]?.timestamp,
      emotionTypes: [...new Set(data.emotions.map(e => e.emotion))].sort(),
      sensoryTypes: [...new Set(data.sensoryInputs.map(s => s.type))].sort()
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
      const studentIds = [...new Set(data.entries.map(e => e.studentId))];
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
  const runAnalysis = useCallback((data: AnalyticsData) => {
    if (!workerRef.current) return;

    const cacheKey = createCacheKey(data);
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      setResults(cachedResult);
      setError(null);
      return;
    }

    // If not in cache, proceed with worker analysis
    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    
    // Get current configuration
    const config = analyticsConfig.getConfig();
    
    // Send data to worker with cache key and configuration
    workerRef.current.postMessage({ ...data, cacheKey, config });
  }, [cache, createCacheKey]);

  /**
   * Pre-compute analytics for common queries during idle time
   */
  const precomputeCommonAnalytics = useCallback((dataProvider: () => AnalyticsData[]) => {
    if (!precomputeOnIdle || !workerRef.current) return;

    const precompute = () => {
      const commonDataSets = dataProvider();
      
      commonDataSets.forEach((data, index) => {
        // Stagger the precomputation to avoid blocking
        setTimeout(() => {
          const cacheKey = createCacheKey(data);
          
          // Only compute if not already cached
          if (!cache.has(cacheKey)) {
            workerRef.current?.postMessage({ ...data, cacheKey });
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