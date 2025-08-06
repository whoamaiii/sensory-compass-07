import { analyticsConfig } from './analyticsConfig';
import { logger } from './logger';

/**
 * Temporary override to make analytics more sensitive for development/testing
 * This will help patterns show up with less data
 */
export function applyDevelopmentAnalyticsConfig() {
  logger.info('Applying development analytics configuration for better pattern detection');
  
  analyticsConfig.updateConfig({
    patternAnalysis: {
      minDataPoints: 2,               // Reduced from 3
      correlationThreshold: 0.1,      // Reduced from 0.25
      highIntensityThreshold: 3,      // Reduced from 4
      concernFrequencyThreshold: 0.2, // Reduced from 0.3
      emotionConsistencyThreshold: 0.3, // Reduced from 0.4
      moderateNegativeThreshold: 0.25,  // Reduced from 0.4
    },
    enhancedAnalysis: {
      trendThreshold: 0.03,           // Reduced from 0.05
      anomalyThreshold: 1.0,          // Reduced from 1.5
      minSampleSize: 3,               // Reduced from 5
      predictionConfidenceThreshold: 0.4, // Reduced from 0.6
      riskAssessmentThreshold: 2,     // Reduced from 3
    },
    timeWindows: {
      defaultAnalysisDays: 30,
      recentDataDays: 7,
      shortTermDays: 14,
      longTermDays: 90,
    },
    alertSensitivity: {
      level: 'high' as const,
      emotionIntensityMultiplier: 1.5,
      frequencyMultiplier: 1.5,
      anomalyMultiplier: 1.5,
    },
    insights: {
      MIN_SESSIONS_FOR_FULL_ANALYTICS: 3,  // Reduced from 5
      HIGH_CONFIDENCE_PATTERN_THRESHOLD: 0.4, // Reduced from 0.6
      MAX_PATTERNS_TO_SHOW: 5,             // Increased from 2
      MAX_CORRELATIONS_TO_SHOW: 5,         // Increased from 2
      MAX_PREDICTIONS_TO_SHOW: 3,          // Increased from 2
      RECENT_EMOTION_COUNT: 5,             // Reduced from 7
      POSITIVE_EMOTION_TREND_THRESHOLD: 0.4, // Reduced from 0.6
      NEGATIVE_EMOTION_TREND_THRESHOLD: 0.2, // Reduced from 0.3
    },
    analytics: {
      MIN_TRACKING_FOR_CORRELATION: 2,     // Reduced from 3
      MIN_TRACKING_FOR_ENHANCED: 2,        // No change
      ANALYSIS_PERIOD_DAYS: 30,
    },
  });
  
  // Clear analytics cache to ensure fresh analysis with new config
  try {
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('analytics-cache') || 
      key.includes('performance-cache') ||
      key.includes('sensory-compass-analytics')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
    logger.info(`Cleared ${cacheKeys.length} analytics cache entries`);
  } catch (error) {
    logger.warn('Failed to clear analytics cache:', error);
  }
}

// Auto-apply in development mode
if (import.meta.env.DEV) {
  applyDevelopmentAnalyticsConfig();
}
