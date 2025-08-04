import { useState, useRef, useCallback, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  tags?: string[];
  version?: string;
}

interface CacheOptions {
  maxSize?: number;
  ttl?: number; // time to live in milliseconds
  enableStats?: boolean;
  versioning?: boolean;
}

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

/**
 * Enhanced high-performance caching hook with LRU eviction, TTL, tagging, and performance statistics
 * 
 * @param options Configuration object for cache behavior
 * @param options.maxSize Maximum number of entries (default: 100)
 * @param options.ttl Time to live in milliseconds (default: 5 minutes)
 * @param options.enableStats Whether to track performance statistics (default: false)
 * @param options.versioning Whether to enable cache versioning (default: false)
 * 
 * @returns Cache interface with get, set, has, clear, cleanup, invalidate methods and optional stats
 * 
 * @example
 * ```typescript
 * const cache = usePerformanceCache<AnalyticsResult>({ 
 *   maxSize: 50, 
 *   ttl: 10 * 60 * 1000, // 10 minutes
 *   enableStats: true,
 *   versioning: true
 * });
 * 
 * // Store data with tags
 * cache.set('analytics:student:123', result, ['student-123', 'analytics']);
 * 
 * // Invalidate by tag
 * cache.invalidateByTag('student-123');
 * 
 * // Create composite cache key
 * const key = cache.createKey('analytics', { studentId: '123', dateRange: '7d' });
 * ```
 */
export function usePerformanceCache<T>(options: CacheOptions = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000, // 5 minutes default
    enableStats = false,
    versioning = false
  } = options;

  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const tagIndex = useRef<Map<string, Set<string>>>(new Map());
  const currentVersion = useRef<string>(Date.now().toString());
  // Mutation counter to force React re-computation of derived metrics and expose live size
  const mutationCounter = useRef(0);

  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    invalidations: 0
  });

  const bumpMutation = useCallback(() => {
    mutationCounter.current += 1;
  }, []);

  const updateStats = useCallback((operation: keyof typeof stats) => {
    if (enableStats) {
      setStats(prev => ({
        ...prev,
        [operation]: prev[operation] + 1
      }));
      // Also bump mutation so hitRate and memoryUsage recompute alongside stats updates
      bumpMutation();
    }
  }, [enableStats, bumpMutation]);

  const isExpired = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() - entry.timestamp > ttl;
  }, [ttl]);

  const evictLRU = useCallback(() => {
    let lruKey = '';
    let lruTimestamp = Date.now();

    cache.current.forEach((entry, key) => {
      if (entry.timestamp < lruTimestamp) {
        lruTimestamp = entry.timestamp;
        lruKey = key;
      }
    });

    if (lruKey) {
      const entry = cache.current.get(lruKey);
      if (entry?.tags) {
        removeFromTagIndex(lruKey, entry.tags);
      }
      cache.current.delete(lruKey);
      updateStats('evictions');
      bumpMutation();
    }
  }, [updateStats, bumpMutation]);

  const removeFromTagIndex = useCallback((key: string, tags: string[]) => {
    tags.forEach(tag => {
      const keys = tagIndex.current.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          tagIndex.current.delete(tag);
        }
      }
    });
  }, []);

  const addToTagIndex = useCallback((key: string, tags: string[]) => {
    tags.forEach(tag => {
      if (!tagIndex.current.has(tag)) {
        tagIndex.current.set(tag, new Set());
      }
      tagIndex.current.get(tag)!.add(key);
    });
  }, []);

  const get = useCallback((key: string): T | undefined => {
    const entry = cache.current.get(key);
    
    if (!entry) {
      updateStats('misses');
      return undefined;
    }
    
    if (isExpired(entry)) {
      if (entry.tags) {
        removeFromTagIndex(key, entry.tags);
      }
      cache.current.delete(key);
      updateStats('misses');
      bumpMutation();
      return undefined;
    }

    if (versioning && entry.version !== currentVersion.current) {
      if (entry.tags) {
        removeFromTagIndex(key, entry.tags);
      }
      cache.current.delete(key);
      updateStats('misses');
      bumpMutation();
      return undefined;
    }

    // Update hit count and timestamp for LRU
    entry.hits++;
    entry.timestamp = Date.now();
    updateStats('hits');
    
    return entry.data;
  }, [isExpired, updateStats, versioning, removeFromTagIndex, bumpMutation]);

  const set = useCallback((key: string, value: T, tags: string[] = []): void => {
    // Check if we need to evict
    if (cache.current.size >= maxSize && !cache.current.has(key)) {
      evictLRU();
    }

    // If updating existing entry, remove old tags
    const existingEntry = cache.current.get(key);
    if (existingEntry?.tags) {
      removeFromTagIndex(key, existingEntry.tags);
    }

    cache.current.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      tags,
      version: versioning ? currentVersion.current : undefined
    });

    if (tags.length > 0) {
      addToTagIndex(key, tags);
    }

    updateStats('sets');
    bumpMutation();
  }, [maxSize, evictLRU, updateStats, versioning, removeFromTagIndex, addToTagIndex, bumpMutation]);

  const has = useCallback((key: string): boolean => {
    const entry = cache.current.get(key);
    if (!entry) return false;
    
    if (isExpired(entry)) {
      if (entry.tags) {
        removeFromTagIndex(key, entry.tags);
      }
      cache.current.delete(key);
      bumpMutation();
      return false;
    }

    if (versioning && entry.version !== currentVersion.current) {
      if (entry.tags) {
        removeFromTagIndex(key, entry.tags);
      }
      cache.current.delete(key);
      bumpMutation();
      return false;
    }

    return true;
  }, [isExpired, versioning, removeFromTagIndex, bumpMutation]);

  const clear = useCallback(() => {
    cache.current.clear();
    tagIndex.current.clear();
    setStats({ hits: 0, misses: 0, sets: 0, evictions: 0, invalidations: 0 });
    bumpMutation();
  }, [bumpMutation]);

  const invalidateByTag = useCallback((tag: string): number => {
    const keys = tagIndex.current.get(tag);
    if (!keys) return 0;

    let invalidatedCount = 0;
    keys.forEach(key => {
      const entry = cache.current.get(key);
      if (entry) {
        cache.current.delete(key);
        invalidatedCount++;
        updateStats('invalidations');
      }
    });

    tagIndex.current.delete(tag);
    if (invalidatedCount > 0) bumpMutation();
    return invalidatedCount;
  }, [updateStats, bumpMutation]);

  const invalidateByPattern = useCallback((pattern: RegExp): number => {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    cache.current.forEach((entry, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
        if (entry.tags) {
          removeFromTagIndex(key, entry.tags);
        }
      }
    });

    keysToDelete.forEach(key => {
      cache.current.delete(key);
      invalidatedCount++;
      updateStats('invalidations');
    });

    if (invalidatedCount > 0) bumpMutation();
    return invalidatedCount;
  }, [updateStats, removeFromTagIndex, bumpMutation]);

  const invalidateVersion = useCallback(() => {
    if (versioning) {
      currentVersion.current = Date.now().toString();
    }
  }, [versioning]);

  const createKey = useCallback((prefix: string, params: Record<string, unknown>): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join(':');
    return `${prefix}:${sortedParams}`;
  }, []);

  const getDataFingerprint = useCallback((data: unknown): string => {
    // Create a fingerprint for data to use in cache keys
    const stringify = (obj: unknown): string => {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj !== 'object') return String(obj);
      if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
      
      const keys = Object.keys(obj).sort();
      return `{${keys.map(k => `${k}:${stringify(obj[k])}`).join(',')}}`;
    };

    const str = stringify(data);
    // Simple hash function for fingerprint
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Expose live size directly from the Map to avoid stale memoization on ref properties.
  const size = cache.current.size;

  // Derive hitRate from current stats; dependency is ensured by updateStats bumping mutation.
  const hitRate = useMemo(() => {
    const total = stats.hits + stats.misses;
    return total > 0 ? (stats.hits / total) * 100 : 0;
  }, [stats.hits, stats.misses, mutationCounter.current]);

  const memoryUsage = useMemo(() => {
    if (!enableStats) return undefined;
    
    // Rough estimation of memory usage
    let totalSize = 0;
    cache.current.forEach((entry) => {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate (2 bytes per char)
    });
    return totalSize;
  }, [enableStats, mutationCounter.current]);

  // Clean up expired entries periodically
  const cleanup = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cache.current.forEach((entry, key) => {
      if (now - entry.timestamp > ttl || (versioning && entry.version !== currentVersion.current)) {
        keysToDelete.push(key);
        if (entry.tags) {
          removeFromTagIndex(key, entry.tags);
        }
      }
    });

    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => cache.current.delete(key));
      bumpMutation();
    }
  }, [ttl, versioning, removeFromTagIndex, bumpMutation]);

  const getCacheStats = useCallback((): CacheStats => {
    return {
      ...stats,
      hitRate,
      size,
      memoryUsage
    };
  }, [stats, hitRate, size, memoryUsage]);

  return {
    get,
    set,
    has,
    clear,
    cleanup,
    size,
    invalidateByTag,
    invalidateByPattern,
    invalidateVersion,
    createKey,
    getDataFingerprint,
    stats: enableStats ? getCacheStats() : null
  };
}