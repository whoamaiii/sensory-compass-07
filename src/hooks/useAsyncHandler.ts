import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAsyncHandlerOptions<R = unknown> {
  onSuccess?: (result: R) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncHandler<T extends unknown[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: UseAsyncHandlerOptions<R> = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: T): Promise<R | undefined> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await asyncFunction(...args);
        
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(error);
        
        const errorMessage = options.errorMessage || error.message;
        toast.error(errorMessage);
        
        options.onError?.(error);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, options]
  );

  return {
    execute,
    loading,
    error,
    clearError: () => setError(null)
  };
}