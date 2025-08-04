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
   * Analyzes emotion patterns with caching
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
   * Analyzes sensory patterns with caching
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
   * Analyzes environmental correlations with caching
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
   * Generates trigger alerts with caching
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
   * Generates predictive insights with caching
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
   * Detects anomalies with caching
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
   * Analyzes trends with statistics and caching
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
   * Generates correlation matrix with caching
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
   * Generates confidence explanation with caching
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
   * Invalidate cache for a specific student
   */
  invalidateStudentCache(studentId: string): number {
    return this.cache.invalidateByTag(`student-${studentId}`);
  }

  /**
   * Invalidate all pattern analysis cache
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
   * Invalidate cache when configuration changes
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