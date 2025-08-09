/**
 * @fileoverview useLoadingState - Hook for managing loading states consistently
 * 
 * Provides a standardized way to handle loading states with proper error handling,
 * timeout management, and cleanup to prevent memory leaks.
 * 
 * Features:
 * - Automatic cleanup on unmount
 * - Loading timeout with callback
 * - Error state management
 * - Progress tracking
 * - Multiple loading operations tracking
 * 
 * @module hooks/useLoadingState
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Loading state configuration options
 */
interface UseLoadingStateOptions {
  /** Timeout in milliseconds before considering the operation stuck */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
  /** Whether to track progress (0-100) */
  trackProgress?: boolean;
  /** Initial loading state */
  initialLoading?: boolean;
}

/**
 * Loading state object
 */
interface LoadingState {
  /** Whether currently loading */
  isLoading: boolean;
  /** Loading progress (0-100) if trackProgress is enabled */
  progress: number;
  /** Error that occurred during loading */
  error: Error | null;
  /** Whether the loading operation timed out */
  hasTimedOut: boolean;
  /** Number of concurrent loading operations */
  loadingCount: number;
}

/**
 * Loading state hook return type
 */
interface UseLoadingStateReturn {
  /** Current loading state */
  state: LoadingState;
  /** Start loading with optional progress */
  startLoading: (initialProgress?: number) => void;
  /** Stop loading and clear error */
  stopLoading: () => void;
  /** Update progress (0-100) */
  updateProgress: (progress: number) => void;
  /** Set error and stop loading */
  setError: (error: Error) => void;
  /** Reset all state to initial */
  reset: () => void;
  /** Execute an async function with loading state management */
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for managing loading states with proper cleanup and error handling
 * 
 * @param options - Configuration options
 * @returns Loading state management functions and state
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { state, withLoading } = useLoadingState({
 *     timeout: 10000,
 *     onTimeout: () => toast.error('Operation timed out')
 *   });
 * 
 *   const handleSubmit = async () => {
 *     const result = await withLoading(async () => {
 *       return await api.submitData(data);
 *     });
 *     
 *     if (result) {
 *       toast.success('Success!');
 *     }
 *   };
 * 
 *   if (state.isLoading) {
 *     return <LoadingSpinner progress={state.progress} />;
 *   }
 * 
 *   if (state.error) {
 *     return <ErrorMessage error={state.error} />;
 *   }
 * 
 *   return <Form onSubmit={handleSubmit} />;
 * };
 * ```
 */
export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const {
    timeout = 30000,
    onTimeout,
    trackProgress = false,
    initialLoading = false
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    progress: 0,
    error: null,
    hasTimedOut: false,
    loadingCount: initialLoading ? 1 : 0
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Start loading operation
   */
  const startLoading = useCallback((initialProgress: number = 0) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: trackProgress ? initialProgress : 0,
      error: null,
      hasTimedOut: false,
      loadingCount: prev.loadingCount + 1
    }));

    // Set timeout if configured
    if (timeout > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            hasTimedOut: true,
            isLoading: false,
            loadingCount: Math.max(0, prev.loadingCount - 1)
          }));

          onTimeout?.();
          logger.warn('Loading operation timed out', { timeout });
        }
      }, timeout);
    }
  }, [timeout, onTimeout, trackProgress]);

  /**
   * Stop loading operation
   */
  const stopLoading = useCallback(() => {
    if (!isMountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: prev.loadingCount <= 1 ? false : true,
      progress: trackProgress ? 100 : 0,
      hasTimedOut: false,
      loadingCount: Math.max(0, prev.loadingCount - 1)
    }));
  }, [trackProgress]);

  /**
   * Update loading progress
   */
  const updateProgress = useCallback((progress: number) => {
    if (!isMountedRef.current || !trackProgress) return;

    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress))
    }));
  }, [trackProgress]);

  /**
   * Set error and stop loading
   */
  const setError = useCallback((error: Error) => {
    if (!isMountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      hasTimedOut: false,
      loadingCount: 0
    }));

    logger.error('Loading operation failed', error);
  }, []);

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    if (!isMountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState({
      isLoading: false,
      progress: 0,
      error: null,
      hasTimedOut: false,
      loadingCount: 0
    });
  }, []);

  /**
   * Execute async function with loading state management
   */
  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    startLoading();

    try {
      const result = await asyncFn();
      
      if (isMountedRef.current) {
        stopLoading();
      }
      
      return result;
    } catch (error) {
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));
      }
      return null;
    }
  }, [startLoading, stopLoading, setError]);

  return {
    state,
    startLoading,
    stopLoading,
    updateProgress,
    setError,
    reset,
    withLoading
  };
}
