import { useState, useCallback, useRef, useEffect } from 'react';
import { handleError } from '@/lib/errorHandler';
import { SensoryCompassError, ErrorType } from '@/types/errors';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}

export interface UseAsyncStateOptions {
  onSuccess?: <T>(data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
}

export function useAsyncState<T = unknown>(
  initialData: T | null = null,
  options: UseAsyncStateOptions = {}
): {
  state: AsyncState<T>;
  execute: (asyncFunction: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
} {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isSuccess: false,
    isError: false,
    isIdle: true,
  });

  const isMountedRef = useRef(true);
  const { onSuccess, onError, retryCount = 0, retryDelay = 1000, showErrorToast = true } = options;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>): Promise<T | null> => {
      if (!isMountedRef.current) return null;

      setState({
        data: state.data,
        loading: true,
        error: null,
        isSuccess: false,
        isError: false,
        isIdle: false,
      });

      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts <= retryCount) {
        try {
          const result = await asyncFunction();
          
          if (!isMountedRef.current) return null;

          setState({
            data: result,
            loading: false,
            error: null,
            isSuccess: true,
            isError: false,
            isIdle: false,
          });

          onSuccess?.(result);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempts++;

          if (attempts <= retryCount) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          }
        }
      }

      // All attempts failed
      if (!isMountedRef.current) return null;

      const finalError = lastError || new SensoryCompassError(
        ErrorType.UNKNOWN_ERROR,
        'Async operation failed'
      );

      setState({
        data: null,
        loading: false,
        error: finalError,
        isSuccess: false,
        isError: true,
        isIdle: false,
      });

      onError?.(finalError);

      if (showErrorToast) {
        await handleError(finalError, { showToast: true, throwError: false });
      }

      return null;
    },
    [state.data, onSuccess, onError, retryCount, retryDelay, showErrorToast]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      isSuccess: false,
      isError: false,
      isIdle: true,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
      isSuccess: data !== null,
      isError: false,
      error: null,
    }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({
      ...prev,
      error,
      isError: error !== null,
      isSuccess: false,
      loading: false,
    }));
  }, []);

  return {
    state,
    execute,
    reset,
    setData,
    setError,
  };
}

// Convenience hook for mutations (POST, PUT, DELETE)
export function useAsyncMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseAsyncStateOptions = {}
) {
  const { state, execute, reset, setData, setError } = useAsyncState<TData>(null, options);

  const mutate = useCallback(
    async (variables: TVariables) => {
      return execute(() => mutationFn(variables));
    },
    [execute, mutationFn]
  );

  return {
    ...state,
    mutate,
    reset,
    setData,
    setError,
  };
}

// Convenience hook for queries (GET)
export function useAsyncQuery<T = unknown>(
  queryFn: () => Promise<T>,
  options: UseAsyncStateOptions & { enabled?: boolean; refetchInterval?: number } = {}
) {
  const { enabled = true, refetchInterval, ...asyncOptions } = options;
  const { state, execute, reset, setData, setError } = useAsyncState<T>(null, asyncOptions);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (enabled) {
      execute(queryFn);
    }
  }, [enabled, execute, queryFn]);

  useEffect(() => {
    if (refetchInterval && enabled && state.isSuccess) {
      intervalRef.current = setInterval(() => {
        execute(queryFn);
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, state.isSuccess, execute, queryFn]);

  const refetch = useCallback(() => {
    return execute(queryFn);
  }, [execute, queryFn]);

  return {
    ...state,
    refetch,
    reset,
    setData,
    setError,
  };
}
