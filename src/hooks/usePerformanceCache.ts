import { useState, useRef, useCallback, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface CacheOptions {
  maxSize?: number;
  ttl?: number; // time to live in milliseconds
  enableStats?: boolean;
}

export function usePerformanceCache<T>(options: CacheOptions = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000, // 5 minutes default
    enableStats = false
  } = options;

  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  });

  const updateStats = useCallback((operation: keyof typeof stats) => {
    if (enableStats) {
      setStats(prev => ({
        ...prev,
        [operation]: prev[operation] + 1
      }));
    }
  }, [enableStats]);

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
      cache.current.delete(lruKey);
      updateStats('evictions');
    }
  }, [updateStats]);

  const get = useCallback((key: string): T | undefined => {
    const entry = cache.current.get(key);
    
    if (!entry) {
      updateStats('misses');
      return undefined;
    }
    
    if (isExpired(entry)) {
      cache.current.delete(key);
      updateStats('misses');
      return undefined;
    }

    // Update hit count and timestamp for LRU
    entry.hits++;
    entry.timestamp = Date.now();
    updateStats('hits');
    
    return entry.data;
  }, [isExpired, updateStats]);

  const set = useCallback((key: string, value: T): void => {
    // Check if we need to evict
    if (cache.current.size >= maxSize && !cache.current.has(key)) {
      evictLRU();
    }

    cache.current.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0
    });

    updateStats('sets');
  }, [maxSize, evictLRU, updateStats]);

  const has = useCallback((key: string): boolean => {
    const entry = cache.current.get(key);
    return entry ? !isExpired(entry) : false;
  }, [isExpired]);

  const clear = useCallback(() => {
    cache.current.clear();
    setStats({ hits: 0, misses: 0, sets: 0, evictions: 0 });
  }, []);

  const size = useMemo(() => cache.current.size, [cache.current]);

  const hitRate = useMemo(() => {
    const total = stats.hits + stats.misses;
    return total > 0 ? (stats.hits / total) * 100 : 0;
  }, [stats.hits, stats.misses]);

  // Clean up expired entries periodically
  const cleanup = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cache.current.forEach((entry, key) => {
      if (now - entry.timestamp > ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => cache.current.delete(key));
  }, [ttl]);

  return {
    get,
    set,
    has,
    clear,
    cleanup,
    size,
    stats: enableStats ? { ...stats, hitRate } : null
  };
}