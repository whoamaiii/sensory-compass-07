import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { patternAnalysis, PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import { alertSystem } from "@/lib/alertSystem";
import { dataStorage, IDataStorage } from "@/lib/dataStorage";
import { generateUniversalMockDataForStudent as generateMockData } from './universalDataGenerator';
import { ANALYTICS_CONFIG, AnalyticsConfig } from "./analyticsConfig.ts";
import { analyticsConfig } from "./analyticsConfig";
import { logger } from "./logger";

// #region Type Definitions

// Ensure analytics is initialized for all students, including newly added and mock data
export const ensureUniversalAnalyticsInitialization = async (): Promise<void> => {
  try {
    // Attempt to retrieve all students; fallback to generating mock data if storage is empty
    const students = await dataStorage.getAllStudents();
    if (!students || students.length === 0) {
      // Generate a minimal set of mock students to seed analytics
      const seedCount = 3;
      const mockIds: string[] = [];
      for (let i = 0; i < seedCount; i++) {
        const mock = generateMockData();
        mockIds.push(mock.student.id);
        await dataStorage.saveStudent(mock.student);
        await dataStorage.saveTrackingEntries(mock.student.id, mock.trackingEntries);
        await dataStorage.saveEmotions(mock.student.id, mock.emotions);
        await dataStorage.saveSensoryInputs(mock.student.id, mock.sensoryInputs);
      }
    }

    const cfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    const minEmotions = cfg?.confidence?.THRESHOLDS?.EMOTION_ENTRIES ?? ANALYTICS_CONFIG.CONFIDENCE.THRESHOLDS.EMOTION_ENTRIES;
    const minSensory = cfg?.confidence?.THRESHOLDS?.SENSORY_ENTRIES ?? ANALYTICS_CONFIG.CONFIDENCE.THRESHOLDS.SENSORY_ENTRIES;
    const minTracking = cfg?.confidence?.THRESHOLDS?.TRACKING_ENTRIES ?? ANALYTICS_CONFIG.CONFIDENCE.THRESHOLDS.TRACKING_ENTRIES;

    const allStudents = await dataStorage.getAllStudents();
    for (const student of allStudents) {
      // Load data
      const emotions = await dataStorage.getEmotions(student.id);
      const sensoryInputs = await dataStorage.getSensoryInputs(student.id);
      const tracking = await dataStorage.getTrackingEntries(student.id);

      const hasMinimumData =
        (emotions?.length ?? 0) >= minEmotions ||
        (sensoryInputs?.length ?? 0) >= minSensory ||
        (tracking?.length ?? 0) >= minTracking;

      // If any data exists or minimum satisfied, ensure profile exists and mark initialized
      await analyticsManager.initializeStudentAnalytics?.(student.id);

      // Optionally trigger a background precomputation to warm caches
      if (hasMinimumData) {
        try {
          // Use analysis period from live config or default
          const analysisDays =
            cfg?.analytics?.ANALYSIS_PERIOD_DAYS ?? ANALYTICS_CONFIG.ANALYTICS.ANALYSIS_PERIOD_DAYS;

          // Run lightweight computations to warm caches; ignore results
          if (emotions?.length) {
            patternAnalysis.analyzeEmotionPatterns(emotions, analysisDays);
          }
          if (sensoryInputs?.length) {
            patternAnalysis.analyzeSensoryPatterns(sensoryInputs, analysisDays);
          }
          if (tracking?.length && tracking.length >= (cfg?.analytics?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.ANALYTICS.MIN_TRACKING_FOR_CORRELATION)) {
            patternAnalysis.analyzeEnvironmentalCorrelations(tracking);
          }
        } catch {
          /* noop - warmup is best-effort */
        }
      }
    }
  } catch (e) {
    logger.error('[analyticsManager] ensureUniversalAnalyticsInitialization failed', e);
  }
};

/**
 * Defines the analytics profile for a student, tracking configuration and health.
 */
interface StudentAnalyticsProfile {
  studentId: string;
  isInitialized: boolean;
  lastAnalyzedAt: Date | null;
  analyticsConfig: {
    patternAnalysisEnabled: boolean;
    correlationAnalysisEnabled: boolean;
    predictiveInsightsEnabled: boolean;
    anomalyDetectionEnabled: boolean;
    alertSystemEnabled: boolean;
  };
  minimumDataRequirements: {
    emotionEntries: number;
    sensoryEntries: number;
    trackingEntries: number;
  };
  analyticsHealthScore: number;
}

/**
 * Represents the complete set of results from an analytics run.
 */
interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
  hasMinimumData: boolean;
  confidence: number;
}

type AnalyticsCache = Map<string, { results: AnalyticsResults; timestamp: Date }>;
type AnalyticsProfileMap = Map<string, StudentAnalyticsProfile>;
// #endregion

// #region Utility & Helper Functions (for better SRP)

/**
 * Safely parses analytics profiles from localStorage.
 * @param storedProfiles - The stringified profiles from localStorage.
 * @returns A map of valid student profiles.
 */
function loadProfilesFromStorage(storedProfiles: string | null): AnalyticsProfileMap {
  const profiles: AnalyticsProfileMap = new Map();
  if (!storedProfiles) return profiles;

  try {
    const data = JSON.parse(storedProfiles);
    
    // Runtime validation
    const isAnalyticsProfile = (obj: unknown): obj is StudentAnalyticsProfile => {
      const profile = obj as Partial<StudentAnalyticsProfile>;
      return !!(profile && typeof profile.studentId === 'string' && typeof profile.isInitialized === 'boolean');
    };

    Object.entries(data).forEach(([studentId, profile]) => {
      if (isAnalyticsProfile(profile)) {
        profiles.set(studentId, {
          ...profile,
          lastAnalyzedAt: profile.lastAnalyzedAt ? new Date(profile.lastAnalyzedAt) : null,
        });
      }
    });
  } catch (error) {
    logger.error("Error loading analytics profiles:", error);
  }
  return profiles;
}

/**
 * Calculates the confidence score for a set of analytics data.
 */
function calculateConfidence(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
  config: AnalyticsConfig['CONFIDENCE']
): number {
  const { THRESHOLDS, WEIGHTS } = config;

  const emotionWeight = Math.min(emotions.length / THRESHOLDS.EMOTION_ENTRIES, 1) * WEIGHTS.EMOTION;
  const sensoryWeight = Math.min(sensoryInputs.length / THRESHOLDS.SENSORY_ENTRIES, 1) * WEIGHTS.SENSORY;
  const trackingWeight = Math.min(trackingEntries.length / THRESHOLDS.TRACKING_ENTRIES, 1) * WEIGHTS.TRACKING;

  let confidence = emotionWeight + sensoryWeight + trackingWeight;

  if (trackingEntries.length > 0) {
    const lastEntry = trackingEntries[trackingEntries.length - 1];
    const daysSinceLastEntry = (Date.now() - new Date(lastEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastEntry < THRESHOLDS.DAYS_SINCE_LAST_ENTRY) {
      confidence = Math.min(confidence + WEIGHTS.RECENCY_BOOST, 1);
    }
  }

  return Math.round(confidence * 100) / 100;
}

/**
 * Generates human-readable insights from analytics results.
 */
function generateInsights(
  results: Omit<AnalyticsResults, 'insights' | 'confidence'>,
  emotions: readonly EmotionEntry[],
  trackingEntries: readonly TrackingEntry[],
  config: AnalyticsConfig['INSIGHTS']
): string[] {
    const insights: string[] = [];
    const { patterns, correlations, predictiveInsights } = results;

    if (trackingEntries.length === 0) {
      return ["No tracking data available yet. Start by creating your first tracking session to begin pattern analysis."];
    }

    if (trackingEntries.length < config.MIN_SESSIONS_FOR_FULL_ANALYTICS) {
      insights.push(`Limited data available (${trackingEntries.length} sessions). Analytics will improve as more data is collected.`);
    }

    patterns
      .filter(p => p.confidence > config.HIGH_CONFIDENCE_PATTERN_THRESHOLD)
      .slice(0, config.MAX_PATTERNS_TO_SHOW)
      .forEach(pattern => insights.push(`Pattern detected: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)`));

    correlations
      .filter(c => c.significance === 'high')
      .slice(0, config.MAX_CORRELATIONS_TO_SHOW)
      .forEach(correlation => insights.push(`Strong correlation found: ${correlation.description}`));

    predictiveInsights
      .slice(0, config.MAX_PREDICTIONS_TO_SHOW)
      .forEach(insight => insights.push(`Prediction: ${insight.description} (${Math.round(insight.confidence * 100)}% confidence)`));

    // Add progress insights (positive/negative trends)
    if (emotions.length >= config.RECENT_EMOTION_COUNT) {
        const recentEmotions = emotions.slice(-config.RECENT_EMOTION_COUNT);
        const positiveRate = recentEmotions.filter(e => ANALYTICS_CONFIG.POSITIVE_EMOTIONS.has(e.emotion.toLowerCase())).length / recentEmotions.length;

        if (positiveRate > config.POSITIVE_EMOTION_TREND_THRESHOLD) {
            insights.push(`Positive trend: ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`);
        } else if (positiveRate < config.NEGATIVE_EMOTION_TREND_THRESHOLD) {
            insights.push(`Consider reviewing strategies - only ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`);
        }
    }

    if (insights.length === 0) {
      insights.push("Analytics are active and monitoring patterns. Continue collecting data for more detailed insights.");
    }

    return insights;
}

// #endregion

/**
 * @class AnalyticsManagerService
 * @singleton
 * @description A singleton service that manages all analytics-related operations, including caching,
 * profile management, and orchestrating analysis tasks.
 */
class AnalyticsManagerService {
  private static instance: AnalyticsManagerService;
  private analyticsProfiles: AnalyticsProfileMap;
  private analyticsCache: AnalyticsCache = new Map();
  private storage: IDataStorage;

  private constructor(storage: IDataStorage, profiles: AnalyticsProfileMap) {
    this.storage = storage;
    this.analyticsProfiles = profiles;
  }

  /**
   * Retrieves the singleton instance of the AnalyticsManagerService.
   * @param {IDataStorage} [storage=dataStorage] - The data storage dependency.
   * @param {AnalyticsProfileMap} [profiles] - Optional initial profiles to load.
   * @returns {AnalyticsManagerService} The singleton instance.
   */
  static getInstance(
    storage: IDataStorage = dataStorage,
    profiles?: AnalyticsProfileMap
  ): AnalyticsManagerService {
    if (!AnalyticsManagerService.instance) {
      const initialProfiles = profiles ?? loadProfilesFromStorage(localStorage.getItem('sensoryTracker_analyticsProfiles'));
      AnalyticsManagerService.instance = new AnalyticsManagerService(storage, initialProfiles);
    }
    return AnalyticsManagerService.instance;
  }

  public initializeStudentAnalytics(studentId: string): void {
    if (this.analyticsProfiles.has(studentId)) {
      return;
    }

    const profile: StudentAnalyticsProfile = {
      studentId,
      isInitialized: true,
      lastAnalyzedAt: null,
      analyticsConfig: {
        patternAnalysisEnabled: true,
        correlationAnalysisEnabled: true,
        predictiveInsightsEnabled: true,
        anomalyDetectionEnabled: true,
        alertSystemEnabled: true,
      },
      minimumDataRequirements: {
        emotionEntries: 1,
        sensoryEntries: 1,
        trackingEntries: 1,
      },
      analyticsHealthScore: 0,
    };

    this.analyticsProfiles.set(studentId, profile);
    this.saveAnalyticsProfiles();
  }

  public async getStudentAnalytics(student: Student): Promise<AnalyticsResults> {
    this.initializeStudentAnalytics(student.id);

    const cached = this.analyticsCache.get(student.id);
    if (cached && (Date.now() - cached.timestamp.getTime()) < ANALYTICS_CONFIG.CACHE_TTL) {
      return cached.results;
    }

    const results = await this.generateAnalytics(student);
    this.analyticsCache.set(student.id, { results, timestamp: new Date() });

    const profile = this.analyticsProfiles.get(student.id);
    if (profile) {
      profile.lastAnalyzedAt = new Date();
      profile.analyticsHealthScore = this.calculateHealthScore(results);
      this.analyticsProfiles.set(student.id, profile);
      this.saveAnalyticsProfiles();
    }

    return results;
  }

  private async generateAnalytics(student: Student): Promise<AnalyticsResults> {
    const trackingEntries = this.storage.getTrackingEntriesForStudent(student.id);
    const goals = this.storage.getGoalsForStudent(student.id);

    const emotions: EmotionEntry[] = trackingEntries.flatMap(entry => entry.emotions);
    const sensoryInputs: SensoryEntry[] = trackingEntries.flatMap(entry => entry.sensoryInputs);

    const hasMinimumData = emotions.length > 0 || sensoryInputs.length > 0 || trackingEntries.length > 0;

    const patterns: PatternResult[] = [];
    let correlations: CorrelationResult[] = [];
    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];

    if (hasMinimumData) {
        try {
            // Prefer live, user-adjustable configuration; fall back to legacy constants to avoid undefined access.
            const liveConfig = (() => {
              try { return analyticsConfig.getConfig(); } catch { return null; }
            })();
            const ANALYTICS = liveConfig?.analytics ?? ANALYTICS_CONFIG.ANALYTICS;

            const analysisDays = ANALYTICS?.ANALYSIS_PERIOD_DAYS ?? ANALYTICS_CONFIG.ANALYTICS.ANALYSIS_PERIOD_DAYS;

            if (emotions.length > 0) {
                patterns.push(...patternAnalysis.analyzeEmotionPatterns(emotions, analysisDays));
            }
            if (sensoryInputs.length > 0) {
                patterns.push(...patternAnalysis.analyzeSensoryPatterns(sensoryInputs, analysisDays));
            }
            if (trackingEntries.length >= (ANALYTICS?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.ANALYTICS.MIN_TRACKING_FOR_CORRELATION)) {
                correlations = patternAnalysis.analyzeEnvironmentalCorrelations(trackingEntries);
            }
            if (trackingEntries.length >= (ANALYTICS?.MIN_TRACKING_FOR_ENHANCED ?? ANALYTICS_CONFIG.ANALYTICS.MIN_TRACKING_FOR_ENHANCED)) {
                predictiveInsights = await enhancedPatternAnalysis.generatePredictiveInsights(emotions, sensoryInputs, trackingEntries, goals);
                anomalies = enhancedPatternAnalysis.detectAnomalies(emotions, sensoryInputs, trackingEntries);
            }
            if (trackingEntries.length > 0) {
                await alertSystem.generateAlertsForStudent(student, emotions, sensoryInputs, trackingEntries);
            }
        } catch (error) {
            logger.error(`Error generating analytics for student ${student.id}:`, error);
            // Re-throw a specific error to let the caller handle it
            throw new Error(`Analytics generation failed for student ${student.id}`);
        }
    }
    
    const resultsWithoutInsights = { patterns, correlations, predictiveInsights, anomalies, hasMinimumData };

    // Resolve INSIGHTS/CONFIDENCE from live config when available; fall back to legacy constants.
    const liveCfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    const INSIGHTS_CFG = liveCfg?.insights ?? ANALYTICS_CONFIG.INSIGHTS;
    const CONFIDENCE_CFG = liveCfg?.confidence ?? ANALYTICS_CONFIG.CONFIDENCE;

    return {
      ...resultsWithoutInsights,
      insights: generateInsights(resultsWithoutInsights, emotions, trackingEntries, INSIGHTS_CFG),
      confidence: calculateConfidence(emotions, sensoryInputs, trackingEntries, CONFIDENCE_CFG),
    };
  }

  /**
   * Calculates an "analytics health score" based on the completeness and confidence of the results.
   * @private
   * @param {AnalyticsResults} results - The results from an analytics run.
   * @returns {number} A score from 0 to 100.
   */
  private calculateHealthScore(results: AnalyticsResults): number {
    const liveCfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    const { WEIGHTS } = (liveCfg?.healthScore ?? ANALYTICS_CONFIG.HEALTH_SCORE);
    let score = 0;

    if (results.patterns.length > 0) score += WEIGHTS.PATTERNS;
    if (results.correlations.length > 0) score += WEIGHTS.CORRELATIONS;
    if (results.predictiveInsights.length > 0) score += WEIGHTS.PREDICTIONS;
    if (results.anomalies.length > 0) score += WEIGHTS.ANOMALIES;
    if (results.hasMinimumData) score += WEIGHTS.MINIMUM_DATA;

    return Math.round(score * results.confidence);
  }

  /**
   * Forces a re-calculation of analytics for a specific student by clearing their cache
   * and re-running the analysis.
   * @param {Student} student - The student to re-analyze.
   */
  public async triggerAnalyticsForStudent(student: Student): Promise<void> {
    this.analyticsCache.delete(student.id);
    await this.getStudentAnalytics(student);
  }

  /**
   * Triggers an analytics refresh for all students in the system.
   * Uses Promise.allSettled to ensure that one failed analysis does not stop others.
   */
  public async triggerAnalyticsForAllStudents(): Promise<void> {
    const students = this.storage.getStudents();
    
    const analyticsPromises = students.map(student => {
      this.initializeStudentAnalytics(student.id);
      return this.triggerAnalyticsForStudent(student);
    });

    const settledResults = await Promise.allSettled(analyticsPromises);

    settledResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Failed to process analytics for student ${students[index].id}:`, result.reason);
      }
    });
  }

  /**
   * Gets the current analytics status for all students, including health scores and last analysis time.
   * This is useful for displaying a high-level dashboard of the system's state.
   * @returns {Array<object>} An array of status objects for each student.
   */
  public getAnalyticsStatus() {
    const students = this.storage.getStudents();
    return students.map(student => {
      const profile = this.analyticsProfiles.get(student.id);
      const cached = this.analyticsCache.get(student.id);
      
      return {
        studentId: student.id,
        studentName: student.name,
        isInitialized: profile?.isInitialized ?? false,
        lastAnalyzed: profile?.lastAnalyzedAt ?? null,
        healthScore: profile?.analyticsHealthScore ?? 0,
        hasMinimumData: cached?.results.hasMinimumData ?? false,
      };
    });
  }

  /**
   * Clears the analytics cache.
   * @param {string} [studentId] - If provided, clears the cache for only that student.
   * Otherwise, clears the entire analytics cache.
   */
  public clearCache(studentId?: string): void {
    if (studentId) {
      this.analyticsCache.delete(studentId);
    } else {
      this.analyticsCache.clear();
    }
  }

  /**
   * Saves the current map of analytics profiles to localStorage.
   * @private
   */
  private saveAnalyticsProfiles(): void {
    try {
      const data = Object.fromEntries(this.analyticsProfiles);
      localStorage.setItem('sensoryTracker_analyticsProfiles', JSON.stringify(data));
    } catch (error) {
      logger.error('Error saving analytics profiles:', error);
    }
  }
}

export const analyticsManager = AnalyticsManagerService.getInstance();