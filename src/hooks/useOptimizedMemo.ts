import { useRef, useEffect, useState, DependencyList } from 'react';
import { logger } from '@/lib/logger';

/**
 * Enhanced memoization hook that tracks computation time and provides debugging info
 * Useful for identifying performance bottlenecks and optimizing expensive computations
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  debugName?: string
): T {
  const resultRef = useRef<T>();
  const computationTimeRef = useRef<number>(0);
  const computationCountRef = useRef<number>(0);
  const depsRef = useRef<DependencyList>();

  // Check if deps have changed
  const depsChanged = !depsRef.current || 
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (depsChanged) {
    const startTime = performance.now();
    resultRef.current = factory();
    const endTime = performance.now();
    
    computationTimeRef.current = endTime - startTime;
    computationCountRef.current++;
    depsRef.current = deps;

    // Log performance metrics in development
    if (import.meta.env.MODE === 'development' && debugName) {
      if (computationTimeRef.current > 16) { // Longer than one frame (16ms)
        logger.warn(
          `[Performance] ${debugName} took ${computationTimeRef.current.toFixed(2)}ms ` +
          `(computation #${computationCountRef.current})`
        );
      }
    }
  }

  // Cleanup effect to log total stats
  useEffect(() => {
    return () => {
      if (import.meta.env.MODE === 'development' && debugName && computationCountRef.current > 0) {
        logger.info(
          `[Performance Summary] ${debugName}: ${computationCountRef.current} computations`
        );
      }
    };
  }, [debugName]);

  return resultRef.current as T;
}

/**
 * Debounced memo hook for values that change frequently
 * Delays computation until value has been stable for the specified duration
 */
export function useDebouncedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  delay: number = 300
): T | undefined {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const resultRef = useRef<T>();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      // Compute immediately on first run
      resultRef.current = factory();
      isFirstRun.current = false;
    } else {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        resultRef.current = factory();
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return resultRef.current;
}

/**
 * Async memo hook for expensive async computations
 * Returns loading state and memoized result
 */
export function useAsyncMemo<T>(
  asyncFactory: () => Promise<T>,
  deps: DependencyList,
  initialValue?: T
): { data: T | undefined; loading: boolean; error: Error | null } {
  const [state, setState] = useState<{
    data: T | undefined;
    loading: boolean;
    error: Error | null;
  }>({
    data: initialValue,
    loading: true,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    asyncFactory()
      .then(result => {
        if (!cancelled && isMountedRef.current) {
          setState({ data: result, loading: false, error: null });
        }
      })
      .catch(error => {
        if (!cancelled && isMountedRef.current) {
          setState(prev => ({ ...prev, loading: false, error }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return state;
}