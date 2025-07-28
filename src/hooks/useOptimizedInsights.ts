import { useMemo, useCallback } from 'react';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import { patternAnalysis } from '@/lib/patternAnalysis';
import { usePerformanceCache } from './usePerformanceCache';

export function useOptimizedInsights(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[]
) {
  const cache = usePerformanceCache({
    maxSize: 50,
    ttl: 10 * 60 * 1000, // 10 minutes
    enableStats: true
  });

  // Create stable cache keys based on data fingerprints
  const dataFingerprint = useMemo(() => {
    const emotionsHash = emotions.length + '_' + (emotions[0]?.timestamp.getTime() || 0);
    const sensoryHash = sensoryInputs.length + '_' + (sensoryInputs[0]?.timestamp.getTime() || 0);
    const entriesHash = trackingEntries.length + '_' + (trackingEntries[0]?.timestamp.getTime() || 0);
    return `${emotionsHash}_${sensoryHash}_${entriesHash}`;
  }, [emotions, sensoryInputs, trackingEntries]);

  const getInsights = useCallback(async () => {
    const cacheKey = `insights_${dataFingerprint}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new insights
    const [basicInsights, predictiveInsights] = await Promise.all([
      Promise.resolve(patternAnalysis.analyzeEmotionPatterns(emotions)),
      Promise.resolve(enhancedPatternAnalysis.generatePredictiveInsights(
        emotions,
        sensoryInputs,
        trackingEntries,
        [] // goals would be passed here if available
      ))
    ]);

    const combinedInsights = {
      basic: basicInsights,
      predictive: predictiveInsights,
      generatedAt: new Date().toISOString()
    };

    // Cache the results
    cache.set(cacheKey, combinedInsights);
    
    return combinedInsights;
  }, [dataFingerprint, cache, emotions, sensoryInputs, trackingEntries]);

  const getCorrelationMatrix = useCallback(() => {
    const cacheKey = `correlations_${dataFingerprint}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (trackingEntries.length < 10) {
      return null;
    }

    const correlations = enhancedPatternAnalysis.generateCorrelationMatrix(trackingEntries);
    cache.set(cacheKey, correlations);
    
    return correlations;
  }, [dataFingerprint, cache, trackingEntries]);

  const getAnomalies = useCallback(() => {
    const cacheKey = `anomalies_${dataFingerprint}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const anomalies = enhancedPatternAnalysis.detectAnomalies(
      emotions,
      sensoryInputs,
      trackingEntries
    );
    
    cache.set(cacheKey, anomalies);
    return anomalies;
  }, [dataFingerprint, cache, emotions, sensoryInputs, trackingEntries]);

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  return {
    getInsights,
    getCorrelationMatrix,
    getAnomalies,
    clearCache,
    cacheStats: cache.stats
  };
}