// Alternative worker implementation using inline worker for better compatibility
import { AnalyticsData, AnalyticsResults } from '@/workers/analytics.worker';
import { logger } from './logger';

const workerCode = `
  import { logger } from './logger.js';
  
  self.onmessage = async (e) => {
    const data = e.data;
    // Worker received message
    
    // Simple response for testing
    const results = {
      patterns: [],
      correlations: [],
      predictiveInsights: [],
      anomalies: [],
      insights: ['Worker is functioning correctly'],
      cacheKey: data.cacheKey
    };
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    self.postMessage(results);
  };
`;

export function createInlineWorker(): Worker | null {
  let workerUrl: string | null = null;
  
  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    // Clean up the URL after creating the worker
    URL.revokeObjectURL(workerUrl);
    
    return worker;
  } catch (error) {
    // Ensure URL is cleaned up even if worker creation fails
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
    }
    logger.error('Failed to create inline worker:', error as Error);
    return null;
  }
}
