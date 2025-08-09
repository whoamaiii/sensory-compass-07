import { logger } from './logger';

export interface AnalyticsConfiguration {
  // Pattern Analysis Thresholds
  patternAnalysis: {
    minDataPoints: number;
    correlationThreshold: number;
    highIntensityThreshold: number;
    concernFrequencyThreshold: number;
    emotionConsistencyThreshold: number;
    moderateNegativeThreshold: number;
  };

  // Enhanced Pattern Analysis
  enhancedAnalysis: {
    trendThreshold: number;
    anomalyThreshold: number; // Standard deviations
    minSampleSize: number;
    predictionConfidenceThreshold: number;
    riskAssessmentThreshold: number;
  };

  // Time Windows
  timeWindows: {
    defaultAnalysisDays: number;
    recentDataDays: number;
    shortTermDays: number;
    longTermDays: number;
  };

  // Alert Sensitivity
  alertSensitivity: {
    level: 'low' | 'medium' | 'high';
    emotionIntensityMultiplier: number;
    frequencyMultiplier: number;
    anomalyMultiplier: number;
  };

  // Cache Settings
  cache: {
    ttl: number; // Time to live in milliseconds
    maxSize: number;
    invalidateOnConfigChange: boolean;
  };

  // Existing settings (maintained for compatibility)
  insights: {
    MIN_SESSIONS_FOR_FULL_ANALYTICS: number;
    HIGH_CONFIDENCE_PATTERN_THRESHOLD: number;
    MAX_PATTERNS_TO_SHOW: number;
    MAX_CORRELATIONS_TO_SHOW: number;
    MAX_PREDICTIONS_TO_SHOW: number;
    RECENT_EMOTION_COUNT: number;
    POSITIVE_EMOTION_TREND_THRESHOLD: number;
    NEGATIVE_EMOTION_TREND_THRESHOLD: number;
  };

  confidence: {
    THRESHOLDS: {
      EMOTION_ENTRIES: number;
      SENSORY_ENTRIES: number;
      TRACKING_ENTRIES: number;
      DAYS_SINCE_LAST_ENTRY: number;
    };
    WEIGHTS: {
      EMOTION: number;
      SENSORY: number;
      TRACKING: number;
      RECENCY_BOOST: number;
    };
  };

  healthScore: {
    WEIGHTS: {
      PATTERNS: number;
      CORRELATIONS: number;
      PREDICTIONS: number;
      ANOMALIES: number;
      MINIMUM_DATA: number;
    };
  };

  analytics: {
    MIN_TRACKING_FOR_CORRELATION: number;
    MIN_TRACKING_FOR_ENHANCED: number;
    ANALYSIS_PERIOD_DAYS: number;
  };
}

// Default configuration
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfiguration = {
  patternAnalysis: {
    minDataPoints: 3,
    correlationThreshold: 0.25,
    highIntensityThreshold: 4,
    concernFrequencyThreshold: 0.3,
    emotionConsistencyThreshold: 0.4,
    moderateNegativeThreshold: 0.4,
  },
  enhancedAnalysis: {
    trendThreshold: 0.05,
    anomalyThreshold: 1.5,
    minSampleSize: 5,
    predictionConfidenceThreshold: 0.6,
    riskAssessmentThreshold: 3,
  },
  timeWindows: {
    defaultAnalysisDays: 30,
    recentDataDays: 7,
    shortTermDays: 14,
    longTermDays: 90,
  },
  alertSensitivity: {
    level: 'medium',
    emotionIntensityMultiplier: 1.0,
    frequencyMultiplier: 1.0,
    anomalyMultiplier: 1.0,
  },
  cache: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 50,
    invalidateOnConfigChange: true,
  },
  insights: {
    MIN_SESSIONS_FOR_FULL_ANALYTICS: 5,
    HIGH_CONFIDENCE_PATTERN_THRESHOLD: 0.6,
    MAX_PATTERNS_TO_SHOW: 2,
    MAX_CORRELATIONS_TO_SHOW: 2,
    MAX_PREDICTIONS_TO_SHOW: 2,
    RECENT_EMOTION_COUNT: 7,
    POSITIVE_EMOTION_TREND_THRESHOLD: 0.6,
    NEGATIVE_EMOTION_TREND_THRESHOLD: 0.3,
  },
  confidence: {
    THRESHOLDS: {
      EMOTION_ENTRIES: 10,
      SENSORY_ENTRIES: 10,
      TRACKING_ENTRIES: 5,
      DAYS_SINCE_LAST_ENTRY: 7,
    },
    WEIGHTS: {
      EMOTION: 0.3,
      SENSORY: 0.3,
      TRACKING: 0.4,
      RECENCY_BOOST: 0.1,
    },
  },
  healthScore: {
    WEIGHTS: {
      PATTERNS: 20,
      CORRELATIONS: 20,
      PREDICTIONS: 20,
      ANOMALIES: 20,
      MINIMUM_DATA: 20,
    },
  },
  analytics: {
    MIN_TRACKING_FOR_CORRELATION: 3,
    MIN_TRACKING_FOR_ENHANCED: 2,
    ANALYSIS_PERIOD_DAYS: 30,
  },
};

// Preset configurations
export const PRESET_CONFIGS = {
  conservative: {
    name: 'Conservative',
    description: 'Higher thresholds, fewer alerts, more data required',
    config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      patternAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.patternAnalysis,
        minDataPoints: 5,
        correlationThreshold: 0.4,
        concernFrequencyThreshold: 0.4,
      },
      enhancedAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.enhancedAnalysis,
        anomalyThreshold: 2.0,
        minSampleSize: 8,
      },
      alertSensitivity: {
        level: 'low' as const,
        emotionIntensityMultiplier: 0.8,
        frequencyMultiplier: 0.8,
        anomalyMultiplier: 0.8,
      },
    },
  },
  balanced: {
    name: 'Balanced',
    description: 'Default settings, balanced sensitivity',
    config: DEFAULT_ANALYTICS_CONFIG,
  },
  sensitive: {
    name: 'Sensitive',
    description: 'Lower thresholds, more alerts, less data required',
    config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      patternAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.patternAnalysis,
        minDataPoints: 2,
        correlationThreshold: 0.15,
        concernFrequencyThreshold: 0.2,
      },
      enhancedAnalysis: {
        ...DEFAULT_ANALYTICS_CONFIG.enhancedAnalysis,
        anomalyThreshold: 1.0,
        minSampleSize: 3,
      },
      alertSensitivity: {
        level: 'high' as const,
        emotionIntensityMultiplier: 1.2,
        frequencyMultiplier: 1.2,
        anomalyMultiplier: 1.2,
      },
    },
  },
};

// Configuration manager class
export class AnalyticsConfigManager {
  private static instance: AnalyticsConfigManager;
  private config: AnalyticsConfiguration;
  private listeners: Array<(config: AnalyticsConfiguration) => void> = [];
  private storageKey = 'sensory-compass-analytics-config';

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AnalyticsConfigManager {
    if (!AnalyticsConfigManager.instance) {
      AnalyticsConfigManager.instance = new AnalyticsConfigManager();
    }
    return AnalyticsConfigManager.instance;
  }

  getConfig(): AnalyticsConfiguration {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AnalyticsConfiguration>): void {
    this.config = this.deepMerge(this.config, updates);
    this.saveConfig();
    this.notifyListeners();
  }

  setPreset(presetKey: keyof typeof PRESET_CONFIGS): void {
    const preset = PRESET_CONFIGS[presetKey];
    if (preset) {
      this.config = { ...preset.config };
      this.saveConfig();
      this.notifyListeners();
    }
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG };
    this.saveConfig();
    this.notifyListeners();
  }

  subscribe(callback: (config: AnalyticsConfiguration) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configString: string): boolean {
    try {
      const importedConfig = JSON.parse(configString);
      // Validate the imported config structure
      if (this.validateConfig(importedConfig)) {
        this.config = importedConfig;
        this.saveConfig();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to import configuration:', error);
      return false;
    }
  }

  private loadConfig(): AnalyticsConfiguration {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        // Non-browser environment (SSR/tests/workers)
        return { ...DEFAULT_ANALYTICS_CONFIG };
      }
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.validateConfig(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      logger.error('Failed to load analytics configuration:', error);
    }
    return { ...DEFAULT_ANALYTICS_CONFIG };
  }

  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      }
    } catch (error) {
      logger.error('Failed to save analytics configuration:', error);
    }
  }

  private notifyListeners(): void {
    const configCopy = { ...this.config };
    this.listeners.forEach(listener => listener(configCopy));
  }

  private deepMerge(target: AnalyticsConfiguration, source: Partial<AnalyticsConfiguration>): AnalyticsConfiguration {
    // Create a deep copy of the target
    const result = JSON.parse(JSON.stringify(target)) as AnalyticsConfiguration;
    
    // Merge source into result
    const merge = (targetObj: Record<string, unknown>, sourceObj: Record<string, unknown>) => {
      Object.keys(sourceObj).forEach(key => {
        const sourceValue = sourceObj[key];
        const targetValue = targetObj[key];
        
        if (sourceValue !== undefined && sourceValue !== null) {
          if (
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
          ) {
            // Recursively merge nested objects
            merge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
          } else {
            // Direct assignment for primitives and arrays
            targetObj[key] = sourceValue;
          }
        }
      });
    };
    
    merge(result as unknown as Record<string, unknown>, source as unknown as Record<string, unknown>);
    
    return result;
  }

  private validateConfig(config: unknown): config is AnalyticsConfiguration {
    // Basic validation to ensure the config has the expected structure
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    const cfg = config as Record<string, unknown>;
    return (
      !!cfg.patternAnalysis &&
      !!cfg.enhancedAnalysis &&
      !!cfg.timeWindows &&
      !!cfg.alertSensitivity &&
      !!cfg.cache &&
      !!cfg.insights &&
      !!cfg.confidence &&
      !!cfg.healthScore &&
      !!cfg.analytics
    );
  }
}

// Export singleton instance
export const analyticsConfig = AnalyticsConfigManager.getInstance();

// Legacy export for backward compatibility
export const ANALYTICS_CONFIG = {
  ...DEFAULT_ANALYTICS_CONFIG,
  // Add missing POSITIVE_EMOTIONS set
  POSITIVE_EMOTIONS: new Set(['happy', 'calm', 'excited', 'content', 'peaceful', 'cheerful', 'relaxed', 'optimistic'])
};
export type AnalyticsConfig = typeof ANALYTICS_CONFIG;
