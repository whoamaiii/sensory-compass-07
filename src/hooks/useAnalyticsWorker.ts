/**
 * @file src/hooks/useAnalyticsWorker.ts
 * 
 * This hook encapsulates the logic for interacting with the analytics web worker.
 * It simplifies the process of creating, communicating with, and terminating the worker,
 * providing a clean, React-friendly interface for components to offload heavy computations.
 */
import { useState, useEffect, useRef } from 'react';
import { AnalyticsData, AnalyticsResults } from '@/workers/analytics.worker';

/**
 * @hook useAnalyticsWorker
 * 
 * A custom hook to manage the analytics web worker.
 * 
 * @returns {object} An object containing:
 *  - `results`: The latest analysis results received from the worker.
 *  - `isAnalyzing`: A boolean flag indicating if an analysis is currently in progress.
 *  - `error`: Any error message returned from the worker.
 *  - `runAnalysis`: A function to trigger a new analysis by posting data to the worker.
 */
export const useAnalyticsWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [results, setResults] = useState<AnalyticsResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a new worker instance using the vite-specific `new URL` pattern.
    // The worker is created only once when the hook is first used.
    workerRef.current = new Worker(new URL('@/workers/analytics.worker.ts', import.meta.url), {
        type: 'module',
      });

    // onmessage handler to receive results from the worker.
    workerRef.current.onmessage = (e: MessageEvent<AnalyticsResults & { error?: string }>) => {
      if (e.data.error) {
        setError(e.data.error);
      } else {
        setResults(e.data);
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
    };
  }, []);

  /**
   * Sends data to the worker to start a new analysis.
   * @param {AnalyticsData} data - The data to be analyzed.
   */
  const runAnalysis = (data: AnalyticsData) => {
    if (workerRef.current) {
      setIsAnalyzing(true);
      setError(null);
      setResults(null);
      workerRef.current.postMessage(data);
    }
  };

  return {
    results,
    isAnalyzing,
    error,
    runAnalysis,
  };
}; 