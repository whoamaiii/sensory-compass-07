/**
 * @file src/workers/analytics.worker.ts
 * 
 * This is a web worker dedicated to performing heavy analytics computations
 * in a background thread, ensuring the main UI thread remains responsive.
 * It listens for messages containing student data, runs a series of analyses,
 * and posts the results back to the main thread.
 */
import { patternAnalysis, PatternResult, CorrelationResult } from '@/lib/patternAnalysis';
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection } from '@/lib/enhancedPatternAnalysis';
import { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

/**
 * @interface AnalyticsData
 * Defines the shape of the data the worker expects to receive.
 */
export interface AnalyticsData {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
}

/**
 * @interface AnalyticsResults
 * Defines the shape of the results the worker will post back to the main thread.
 */
export interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
}

/**
 * Generates high-level, human-readable insights from the raw analysis results.
 * This function consolidates the most significant findings into a simple string array.
 * @param {PatternResult[]} emotionPatterns - The results from emotion pattern analysis.
 * @param {PatternResult[]} sensoryPatterns - The results from sensory pattern analysis.
 * @param {CorrelationResult[]} correlations - The results from correlation analysis.
 * @param {AnalyticsData} data - The raw data used for the analysis.
 * @returns {string[]} An array of insight strings.
 */
const generateInsights = (
  emotionPatterns: PatternResult[],
  sensoryPatterns: PatternResult[],
  correlations: CorrelationResult[],
  data: AnalyticsData
): string[] => {
    const allInsights: string[] = [];
  
      if (data.entries.length < 5) {
        allInsights.push(
          `Limited data available (${data.entries.length} sessions). Consider collecting more tracking sessions for better pattern analysis.`
        );
      }
  
      const highConfidenceEmotionPatterns = emotionPatterns.filter(p => p.confidence > 0.7);
      if (highConfidenceEmotionPatterns.length > 0) {
        const pattern = highConfidenceEmotionPatterns[0];
        allInsights.push(
          `Strong ${pattern.pattern.replace('-', ' ')} pattern detected with ${Math.round(pattern.confidence * 100)}% confidence.`
        );
      }
  
      const highConfidenceSensoryPatterns = sensoryPatterns.filter(p => p.confidence > 0.6);
      if (highConfidenceSensoryPatterns.length > 0) {
        const pattern = highConfidenceSensoryPatterns[0];
        allInsights.push(
          `${pattern.description} - consider implementing the recommended strategies.`
        );
      }
  
      const strongCorrelations = correlations.filter(c => c.significance === 'high');
      if (strongCorrelations.length > 0) {
        strongCorrelations.forEach(correlation => {
          allInsights.push(
            `Strong correlation found: ${correlation.description}`
          );
        });
      }
  
      return allInsights.length > 0 ? allInsights : [
        'Continue collecting data to identify meaningful patterns and insights.'
      ];
};

/**
 * Main message handler for the worker.
 * This function is triggered when the main thread calls `worker.postMessage()`.
 * It orchestrates the analysis process and posts the results back.
 */
self.onmessage = (e: MessageEvent<AnalyticsData>) => {
  const filteredData = e.data;

  // Early exit if there is no data to analyze.
  if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) {
    postMessage({
        patterns: [],
        correlations: [],
        predictiveInsights: [],
        anomalies: [],
        insights: [],
      });
    return;
  }

  try {
    const emotionPatterns = filteredData.emotions.length > 0 
      ? patternAnalysis.analyzeEmotionPatterns(filteredData.emotions, 30)
      : [];
    const sensoryPatterns = filteredData.sensoryInputs.length > 0
      ? patternAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs, 30)
      : [];
    
    const patterns = [...emotionPatterns, ...sensoryPatterns];

    let correlations: CorrelationResult[] = [];
    if (filteredData.entries.length > 2) {
      correlations = patternAnalysis.analyzeEnvironmentalCorrelations(filteredData.entries);
    }

    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];
    if (filteredData.entries.length > 1) {
      predictiveInsights = enhancedPatternAnalysis.generatePredictiveInsights(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries,
        []
      );

      anomalies = enhancedPatternAnalysis.detectAnomalies(
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries
      );
    }

    const insights = generateInsights(emotionPatterns, sensoryPatterns, correlations, filteredData);

    const results: AnalyticsResults = {
      patterns,
      correlations,
      predictiveInsights,
      anomalies,
      insights,
    };

    // Post the final results back to the main thread.
    postMessage(results);

  } catch (error) {
    console.error('Error in analytics worker:', error);
    // Post an error message back to the main thread for graceful error handling.
    postMessage({ error: 'Failed to analyze data.' });
  }
}; 