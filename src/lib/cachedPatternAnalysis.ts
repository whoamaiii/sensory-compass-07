import { EmotionEntry, SensoryEntry, TrackingEntry } from "@/types/student";
import { patternAnalysis, PatternResult, CorrelationResult, TriggerAlert } from "./patternAnalysis";
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection, TrendAnalysis, CorrelationMatrix } from "./enhancedPatternAnalysis";
import { Goal } from "@/types/student";
import { analyticsConfig } from "./analyticsConfig";

interface CacheStorage {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, tags?: string[]): void;
  has(key: string): boolean;
  invalidateByTag(tag: string): number;
  getDataFingerprint(data: unknown): string;
  createKey(prefix: string, params: Record<string, unknown>): string;
}

/**
 * CachedPatternAnalysisEngine provides cached versions of pattern analysis methods
 * to avoid redundant calculations and improve performance
 */
export class CachedPatternAnalysisEngine {
  private cache: CacheStorage;
  private ttl: number;
  private configUnsubscribe?: () => void;
  private currentConfigHash: string;

  constructor(cache: CacheStorage, ttl?: number) {
    this.cache = cache;
    const cfg = analyticsConfig.getConfig();
    this.ttl = ttl || cfg.cache.ttl;
    this.currentConfigHash = this.buildConfigHash(cfg);
    
    // Subscribe to configuration changes
    this.configUnsubscribe = analyticsConfig.subscribe((newConfig) => {
      this.ttl = newConfig.cache.ttl;
      this.currentConfigHash = this.buildConfigHash(newConfig);
      
      // Invalidate cache if configured to do so
      if (newConfig.cache.invalidateOnConfigChange) {
        this.invalidateAllCache();
      }
    });
  }

  private buildConfigHash(cfg: ReturnType<typeof analyticsConfig.getConfig>): string {
    // Only include parts that impact analysis outputs
    const subset = {
      patternAnalysis: cfg.patternAnalysis,
      enhancedAnalysis: cfg.enhancedAnalysis,
      timeWindows: cfg.timeWindows,
      alertSensitivity: cfg.alertSensitivity
    };
    return this.cache.getDataFingerprint(subset);
  }

  /**
   * Cleanup method to unsubscribe from configuration changes
   */
  destroy(): void {
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
    }
  }

  /**
   * Analyzes emotion patterns from a student's data, with results cached to prevent redundant computation.
   * It generates a cache key based on the data's fingerprint and other parameters.
   * If a valid cached result exists, it's returned immediately. Otherwise, it performs the analysis
   * and caches the result with tags for targeted invalidation (e.g., by student ID).
   *
   * @param {EmotionEntry[]} emotions The array of emotion entries to analyze.
   * @param {number} [timeframeDays=30] The number of days to look back for the analysis.
   * @returns {PatternResult[]} An array of identified emotion patterns.
   * @example
   * const emotionPatterns = cachedAnalysis.analyzeEmotionPatterns(student.emotions, 30);
   */
  analyzeEmotionPatterns(emotions: EmotionEntry[], timeframeDays: number = 30): PatternResult[] {
    const cacheKey = this.cache.createKey('emotion-patterns', {
      fingerprint: this.cache.getDataFingerprint(emotions),
      timeframeDays,
      count: emotions.length,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as PatternResult[] | undefined;
    if (cached) return cached;

    const result = patternAnalysis.analyzeEmotionPatterns(emotions, timeframeDays);
    
    // Tag with student IDs for targeted invalidation
    const studentIdsSet = new Set<string>();
    for (const e of emotions) {
      if (e.studentId) studentIdsSet.add(e.studentId);
    }
    const tags = ['emotion-patterns', ...Array.from(studentIdsSet, id => `student-${id}`)];
    
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Analyzes sensory input patterns from a student's data, with results cached for performance.
   * A unique cache key is created from the data fingerprint and parameters. It returns cached data
   * if available and still valid. Otherwise, it computes the patterns and caches the new results.
   *
   * @param {SensoryEntry[]} sensoryInputs The array of sensory input entries to analyze.
   * @param {number} [timeframeDays=30] The timeframe in days for the analysis.
   * @returns {PatternResult[]} An array of identified sensory patterns.
   * @example
   * const sensoryPatterns = cachedAnalysis.analyzeSensoryPatterns(student.sensoryInputs, 30);
   */
  analyzeSensoryPatterns(sensoryInputs: SensoryEntry[], timeframeDays: number = 30): PatternResult[] {
    const cacheKey = this.cache.createKey('sensory-patterns', {
      fingerprint: this.cache.getDataFingerprint(sensoryInputs),
      timeframeDays,
      count: sensoryInputs.length,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as PatternResult[] | undefined;
    if (cached) return cached;

    const result = patternAnalysis.analyzeSensoryPatterns(sensoryInputs, timeframeDays);
    
    // Tag with student IDs for targeted invalidation
    const studentIdsSet = new Set<string>();
    for (const s of sensoryInputs) {
      if (s.studentId) studentIdsSet.add(s.studentId);
    }
    const tags = ['sensory-patterns', ...Array.from(studentIdsSet, id => `student-${id}`)];
    
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Analyzes correlations between environmental factors and student data, with caching.
   * The cache key includes the data fingerprint to ensure results are specific to the dataset.
   * It returns from cache if possible or runs the analysis and stores the results.
   *
   * @param {TrackingEntry[]} trackingEntries The array of tracking entries containing environmental data.
   * @returns {CorrelationResult[]} An array of identified environmental correlations.
   * @example
   * const correlations = cachedAnalysis.analyzeEnvironmentalCorrelations(student.trackingEntries);
   */
  analyzeEnvironmentalCorrelations(trackingEntries: TrackingEntry[]): CorrelationResult[] {
    const cacheKey = this.cache.createKey('env-correlations', {
      fingerprint: this.cache.getDataFingerprint(trackingEntries),
      count: trackingEntries.length,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as CorrelationResult[] | undefined;
    if (cached) return cached;

    const result = patternAnalysis.analyzeEnvironmentalCorrelations(trackingEntries);
    
    // Tag with student IDs for targeted invalidation
    const studentIdsSet = new Set<string>();
    for (const e of trackingEntries) {
      if (e.studentId) studentIdsSet.add(e.studentId);
    }
    const tags = ['env-correlations', ...Array.from(studentIdsSet, id => `student-${id}`)];
    
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Generates trigger alerts based on emotion, sensory, and tracking data, with caching.
   * The cache key is a composite of fingerprints from all data sources and the student ID.
   * This ensures that alerts are re-calculated only when underlying data changes.
   *
   * @param {EmotionEntry[]} emotions The array of emotion entries.
   * @param {SensoryEntry[]} sensoryInputs The array of sensory input entries.
   * @param {TrackingEntry[]} trackingEntries The array of tracking entries.
   * @param {string} studentId The ID of the student for whom to generate alerts.
   * @returns {TriggerAlert[]} An array of trigger alerts.
   */
  generateTriggerAlerts(
    emotions: EmotionEntry[], 
    sensoryInputs: SensoryEntry[], 
    trackingEntries: TrackingEntry[],
    studentId: string
  ): TriggerAlert[] {
    const cacheKey = this.cache.createKey('trigger-alerts', {
      emotionFingerprint: this.cache.getDataFingerprint(emotions),
      sensoryFingerprint: this.cache.getDataFingerprint(sensoryInputs),
      trackingFingerprint: this.cache.getDataFingerprint(trackingEntries),
      studentId,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as TriggerAlert[] | undefined;
    if (cached) return cached;

    const result = patternAnalysis.generateTriggerAlerts(emotions, sensoryInputs, trackingEntries, studentId);
    
    const tags = ['trigger-alerts', `student-${studentId}`];
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Asynchronously generates predictive insights using enhanced pattern analysis, with caching.
   * The method is asynchronous and returns a promise. The cache key considers all data sources,
   * including student goals, ensuring a comprehensive check before re-computation.
   *
   * @param {EmotionEntry[]} emotions The array of emotion entries.
   * @param {SensoryEntry[]} sensoryInputs The array of sensory input entries.
   * @param {TrackingEntry[]} trackingEntries The array of tracking entries.
   * @param {Goal[]} [goals=[]] An optional array of student goals to factor into the insights.
   * @returns {Promise<PredictiveInsight[]>} A promise that resolves to an array of predictive insights.
   * @note This is a performance-intensive operation and relies heavily on caching.
   */
  async generatePredictiveInsights(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[],
    goals: Goal[] = []
  ): Promise<PredictiveInsight[]> {
    const cacheKey = this.cache.createKey('predictive-insights', {
      emotionFingerprint: this.cache.getDataFingerprint(emotions),
      sensoryFingerprint: this.cache.getDataFingerprint(sensoryInputs),
      trackingFingerprint: this.cache.getDataFingerprint(trackingEntries),
      goalsFingerprint: this.cache.getDataFingerprint(goals),
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as PredictiveInsight[] | undefined;
    if (cached) return cached;

    const result = await enhancedPatternAnalysis.generatePredictiveInsights(
      emotions,
      sensoryInputs,
      trackingEntries,
      goals
    );
    
    const studentIdsSet = new Set<string>();
    for (const e of emotions) if (e.studentId) studentIdsSet.add(e.studentId);
    for (const s of sensoryInputs) if (s.studentId) studentIdsSet.add(s.studentId);
    for (const t of trackingEntries) if (t.studentId) studentIdsSet.add(t.studentId);
    const tags = ['predictive-insights', ...Array.from(studentIdsSet, id => `student-${id}`)];
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Detects anomalies in student data, with results cached for efficiency.
   * It uses a cache key generated from fingerprints of all relevant data streams.
   * If a cached result is found, it is returned; otherwise, a new analysis is performed.
   *
   * @param {EmotionEntry[]} emotions The array of emotion entries.
   * @param {SensoryEntry[]} sensoryInputs The array of sensory input entries.
   * @param {TrackingEntry[]} trackingEntries The array of tracking entries.
   * @returns {AnomalyDetection[]} An array of detected anomalies.
   */
  detectAnomalies(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): AnomalyDetection[] {
    const cacheKey = this.cache.createKey('anomaly-detection', {
      emotionFingerprint: this.cache.getDataFingerprint(emotions),
      sensoryFingerprint: this.cache.getDataFingerprint(sensoryInputs),
      trackingFingerprint: this.cache.getDataFingerprint(trackingEntries),
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as AnomalyDetection[] | undefined;
    if (cached) return cached;

    const result = enhancedPatternAnalysis.detectAnomalies(
      emotions,
      sensoryInputs,
      trackingEntries
    );
    
    const studentIdsSet = new Set<string>();
    for (const e of emotions) if (e.studentId) studentIdsSet.add(e.studentId);
    for (const s of sensoryInputs) if (s.studentId) studentIdsSet.add(s.studentId);
    for (const t of trackingEntries) if (t.studentId) studentIdsSet.add(t.studentId);
    const tags = ['anomaly-detection', ...Array.from(studentIdsSet, id => `student-${id}`)];
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Analyzes trends in a given time-series dataset, with caching.
   * It returns a trend analysis object or null if the analysis is not possible.
   * The cache key is based on the data fingerprint to ensure accuracy.
   *
   * @param {{ value: number; timestamp: Date }[]} data The time-series data to analyze.
   * @returns {TrendAnalysis | null} A trend analysis object, or null if analysis fails.
   */
  analyzeTrendsWithStatistics(data: { value: number; timestamp: Date }[]): TrendAnalysis | null {
    const cacheKey = this.cache.createKey('trend-analysis', {
      fingerprint: this.cache.getDataFingerprint(data),
      count: data.length,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as TrendAnalysis | null | undefined;
    if (cached !== undefined) return cached;

    const result = enhancedPatternAnalysis.analyzeTrendsWithStatistics(data);
    
    this.cache.set(cacheKey, result, ['trend-analysis']);
    return result;
  }

  /**
   * Generates a correlation matrix from tracking entries, with caching.
   * This is useful for visualizing relationships between different variables.
   * The results are cached to avoid re-computing the matrix for the same dataset.
   *
   * @param {TrackingEntry[]} trackingEntries The array of tracking entries.
   * @returns {CorrelationMatrix} The generated correlation matrix.
   */
  generateCorrelationMatrix(trackingEntries: TrackingEntry[]): CorrelationMatrix {
    const cacheKey = this.cache.createKey('correlation-matrix', {
      fingerprint: this.cache.getDataFingerprint(trackingEntries),
      count: trackingEntries.length,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as CorrelationMatrix | undefined;
    if (cached) return cached;

    const result = enhancedPatternAnalysis.generateCorrelationMatrix(trackingEntries);
    
    const studentIdsSet = new Set<string>();
    for (const e of trackingEntries) {
      if (e.studentId) studentIdsSet.add(e.studentId);
    }
    const tags = ['correlation-matrix', ...Array.from(studentIdsSet, id => `student-${id}`)];
    
    this.cache.set(cacheKey, result, tags);
    return result;
  }

  /**
   * Generates a human-readable explanation for a given confidence score, with caching.
   * The explanation includes the confidence level, a descriptive text, and contributing factors.
   * Caching is used to avoid re-generating explanations for the same input parameters.
   *
   * @param {number} dataPoints The number of data points used in the analysis.
   * @param {number} timeSpanDays The time span of the data in days.
   * @param {number} rSquared The R-squared value from a regression analysis.
   * @param {number} confidence The confidence score to be explained.
   * @returns {{ level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] }} An object containing the confidence explanation.
   */
  generateConfidenceExplanation(
    dataPoints: number,
    timeSpanDays: number,
    rSquared: number,
    confidence: number
  ): { level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] } {
    const cacheKey = this.cache.createKey('confidence-explanation', {
      dataPoints,
      timeSpanDays,
      rSquared: Math.round(rSquared * 1000) / 1000, // Round to 3 decimal places
      confidence: Math.round(confidence * 1000) / 1000,
      configHash: this.currentConfigHash
    });

    const cached = this.cache.get(cacheKey) as { level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] } | undefined;
    if (cached) return cached;

    const result = enhancedPatternAnalysis.generateConfidenceExplanation(
      dataPoints,
      timeSpanDays,
      rSquared,
      confidence
    );
    
    this.cache.set(cacheKey, result, ['confidence-explanation']);
    return result;
  }

  /**
   * Invalidates all cache entries associated with a specific student ID.
   * This is done by finding and removing all cache entries tagged with `student-${studentId}`.
   *
   * @param {string} studentId The ID of the student whose cache should be invalidated.
   * @returns {number} The number of cache entries that were invalidated.
   * @example
   * const invalidatedCount = cachedAnalysis.invalidateStudentCache('student-123');
   */
  invalidateStudentCache(studentId: string): number {
    return this.cache.invalidateByTag(`student-${studentId}`);
  }

  /**
   * Invalidates the entire analysis cache by clearing entries associated with known tags.
   * This is a broad operation that should be used when global changes (like a new app version)
   * might affect the validity of all cached results.
   *
   * @returns {number} The total number of cache entries that were invalidated.
   */
  invalidateAllCache(): number {
    // Invalidate all known tags
    const tags = [
      'emotion-patterns',
      'sensory-patterns',
      'env-correlations',
      'trigger-alerts',
      'predictive-insights',
      'anomaly-detection',
      'trend-analysis',
      'correlation-matrix',
      'confidence-explanation'
    ];
    
    let invalidatedCount = 0;
    tags.forEach(tag => {
      invalidatedCount += this.cache.invalidateByTag(tag);
    });
    
    return invalidatedCount;
  }

  /**
   * Invalidate the entire cache. This is typically called when a configuration change
   * would affect the outcomes of all analyses, thus requiring a full reset.
   *
   * @returns {number} The total number of cache entries that were invalidated.
   */
  invalidateConfigurationCache(): number {
    return this.invalidateAllCache();
  }
}

/**
 * Factory function to create a cached pattern analysis instance
 */
export function createCachedPatternAnalysis(cache: CacheStorage, ttl?: number): CachedPatternAnalysisEngine {
  return new CachedPatternAnalysisEngine(cache, ttl);
}