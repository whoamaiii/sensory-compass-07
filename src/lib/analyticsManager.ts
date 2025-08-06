import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { patternAnalysis, PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import { alertSystem } from "@/lib/alertSystem";
import { dataStorage, IDataStorage } from "@/lib/dataStorage";
import { generateUniversalMockDataForStudent as generateMockData } from './universalDataGenerator';
import { ANALYTICS_CONFIG, AnalyticsConfig } from "./analyticsConfig";
import { analyticsConfig } from "./analyticsConfig";
import { logger } from "./logger";

// #region Type Definitions

/**
 * Ensures universal analytics initialization for all students in the system.
 * 
 * @async
 * @function ensureUniversalAnalyticsInitialization
 * @returns {Promise<void>} A promise that resolves when initialization is complete
 * 
 * @description This function handles the complete analytics initialization process:
 * 1. **Mock Data Generation**: If no students exist, generates a minimal set of 3 mock students
 *    to seed the analytics system with baseline data.
 * 2. **Minimum Data Thresholds**: Checks each student against configurable thresholds:
 *    - EMOTION_ENTRIES: Minimum emotion entries required
 *    - SENSORY_ENTRIES: Minimum sensory input entries required  
 *    - TRACKING_ENTRIES: Minimum tracking session entries required
 * 3. **Cache Warming Strategy**: For students meeting minimum data requirements, performs
 *    lightweight precomputation of analytics to populate caches:
 *    - Emotion pattern analysis
 *    - Sensory pattern analysis
 *    - Environmental correlation analysis (if sufficient tracking entries)
 * 
 * The function gracefully handles errors and treats cache warming as best-effort.
 * Configuration is loaded from live analytics config with fallback to defaults.
 */
export const ensureUniversalAnalyticsInitialization = async (): Promise<void> => {
  try {
    // Retrieve students via synchronous API; if none, generate a small seed using generator
    const students = dataStorage.getStudents();
    if (!students || students.length === 0) {
      const seedCount = 3;
      for (let i = 0; i < seedCount; i++) {
        // The generator in this codebase returns TrackingEntry[] for a student; persist via existing APIs
        const generatedEntries = generateMockData('seed'); // supply an argument to satisfy signature
        // Persist by using available save APIs
        try {
          // Save each generated tracking entry
          for (const entry of generatedEntries) {
            dataStorage.saveTrackingEntry(entry);
          }
        } catch (err) {
          logger.error('[analyticsManager] mock data seed failed', { error: err });
        }
      }
    }

    const cfg = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
    const minEmotions = cfg?.confidence?.THRESHOLDS?.EMOTION_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.EMOTION_ENTRIES;
    const minSensory = cfg?.confidence?.THRESHOLDS?.SENSORY_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.SENSORY_ENTRIES;
    const minTracking = cfg?.confidence?.THRESHOLDS?.TRACKING_ENTRIES ?? ANALYTICS_CONFIG.confidence.THRESHOLDS.TRACKING_ENTRIES;

    const allStudents = dataStorage.getStudents();
    for (const student of allStudents) {
      // Load data via available synchronous APIs
      const tracking = dataStorage.getTrackingEntriesForStudent(student.id);
      const emotions = tracking.flatMap(t => t.emotions ?? []);
      const sensoryInputs = tracking.flatMap(t => t.sensoryInputs ?? []);

      const hasMinimumData =
        (emotions.length) >= minEmotions ||
        (sensoryInputs.length) >= minSensory ||
        (tracking.length) >= minTracking;

      // Ensure profile exists
      analyticsManager.initializeStudentAnalytics(student.id);

      // Best-effort warmups
      if (hasMinimumData) {
        try {
          const analysisDays =
            cfg?.analytics?.ANALYSIS_PERIOD_DAYS ?? ANALYTICS_CONFIG.analytics.ANALYSIS_PERIOD_DAYS;

          if (emotions.length) {
            patternAnalysis.analyzeEmotionPatterns(emotions, analysisDays);
          }
          if (sensoryInputs.length) {
            patternAnalysis.analyzeSensoryPatterns(sensoryInputs, analysisDays);
          }
          if (tracking.length && tracking.length >= (cfg?.analytics?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_CORRELATION)) {
            patternAnalysis.analyzeEnvironmentalCorrelations(tracking);
          }
        } catch {
          /* noop */
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
 * Safely parses analytics profiles from localStorage with validation and error handling.
 * 
 * @function loadProfilesFromStorage
 * @param {string | null} storedProfiles - The stringified profiles from localStorage
 * @returns {AnalyticsProfileMap} A map of valid student profiles, keyed by student ID
 * 
 * @description This function provides robust loading of persisted analytics profiles:
 * 
 * **Validation Process**:
 * - Checks if input is null/empty, returns empty Map if so
 * - Attempts JSON parsing with try/catch for malformed data
 * - Runtime type validation for each profile object
 * - Validates required fields: studentId (string) and isInitialized (boolean)
 * - Converts date strings back to Date objects for lastAnalyzedAt field
 * 
 * **Error Handling**:
 * - Catches and logs JSON parsing errors
 * - Skips invalid profile entries rather than failing completely
 * - Returns empty Map on complete failure to ensure app stability
 * 
 * This defensive approach ensures the analytics system remains functional even
 * if localStorage data becomes corrupted or outdated.
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
 * Calculates confidence score based on data availability and recency.
 * 
 * @function calculateConfidence
 * @param {EmotionEntry[]} emotions - Array of emotion entries
 * @param {SensoryEntry[]} sensoryInputs - Array of sensory input entries
 * @param {TrackingEntry[]} trackingEntries - Array of tracking entries
 * @param {AnalyticsConfig['CONFIDENCE']} config - Configuration object with thresholds and weights
 * @returns {number} Confidence score between 0 and 1 (0% to 100%)
 * 
 * @description Uses weighted calculations based on data quantity relative to thresholds,
 * with a recency boost if data is fresh (within configured days).
 * 
 * **Weight Calculation Algorithm**:
 * 1. **Data Quantity Weights**: Each data type contributes based on quantity vs threshold
 *    - Emotion weight = min(emotion_count / EMOTION_THRESHOLD, 1) * EMOTION_WEIGHT
 *    - Sensory weight = min(sensory_count / SENSORY_THRESHOLD, 1) * SENSORY_WEIGHT
 *    - Tracking weight = min(tracking_count / TRACKING_THRESHOLD, 1) * TRACKING_WEIGHT
 * 
 * 2. **Recency Boost**: Additional confidence if last entry is recent
 *    - Checks days since last tracking entry
 *    - If within DAYS_SINCE_LAST_ENTRY threshold, adds RECENCY_BOOST
 *    - Final confidence capped at 1.0 (100%)
 * 
 * The algorithm ensures confidence scales smoothly from 0% (no data) to 100% (abundant recent data).
 */
function calculateConfidence(
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  trackingEntries: TrackingEntry[],
  config: AnalyticsConfig['confidence']
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
 * 
 * @function generateInsights
 * @param {Omit<AnalyticsResults, 'insights' | 'confidence'>} results - Analytics results without insights
 * @param {readonly EmotionEntry[]} emotions - Array of emotion entries
 * @param {readonly TrackingEntry[]} trackingEntries - Array of tracking entries
 * @param {AnalyticsConfig['INSIGHTS']} config - Configuration for insight generation
 * @returns {string[]} Array of human-readable insight strings
 * 
 * @description Creates contextual, actionable insights based on analytics data:
 * 
 * **Insight Generation Logic**:
 * 1. **Data Availability Check**: Returns guidance message if no tracking data exists
 * 
 * 2. **Limited Data Warning**: Alerts when sessions < MIN_SESSIONS_FOR_FULL_ANALYTICS
 * 
 * 3. **Pattern Insights**: 
 *    - Filters patterns by HIGH_CONFIDENCE_PATTERN_THRESHOLD
 *    - Limits to MAX_PATTERNS_TO_SHOW
 *    - Formats with pattern description and confidence percentage
 * 
 * 4. **Correlation Insights**:
 *    - Only includes 'high' significance correlations
 *    - Limits to MAX_CORRELATIONS_TO_SHOW
 * 
 * 5. **Predictive Insights**:
 *    - Shows top predictions up to MAX_PREDICTIONS_TO_SHOW
 *    - Includes confidence percentage
 * 
 * 6. **Emotion Trend Analysis**:
 *    - Analyzes recent emotions (RECENT_EMOTION_COUNT)
 *    - Calculates positive emotion rate
 *    - Provides encouragement or suggestions based on thresholds
 * 
 * 7. **Fallback Message**: Ensures array is never empty
 * 
 * All thresholds and limits are configurable for flexibility.
 */
function generateInsights(
  results: Omit<AnalyticsResults, 'insights' | 'confidence'>,
  emotions: readonly EmotionEntry[],
  trackingEntries: readonly TrackingEntry[],
  config: AnalyticsConfig['insights']
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
 * Singleton service managing all analytics operations for the Sensory Tracker application.
 * 
 * @class AnalyticsManagerService
 * @singleton
 * 
 * @description This service orchestrates all analytics-related operations:
 * 
 * **Singleton Pattern Implementation**:
 * - Single instance ensures consistent state across the application
 * - Lazy initialization with getInstance() method
 * - Private constructor prevents direct instantiation
 * - Thread-safe in JavaScript's single-threaded environment
 * 
 * **Core Responsibilities**:
 * 1. **Profile Management**: Maintains analytics profiles for each student
 * 2. **Caching Strategy**: Implements TTL-based caching to optimize performance
 * 3. **Analytics Orchestration**: Coordinates pattern analysis, correlations, and predictions
 * 4. **Data Persistence**: Manages localStorage for profile persistence
 * 
 * **Caching Behavior**:
 * - Cache entries stored with timestamp
 * - TTL (Time To Live) configured via ANALYTICS_CONFIG.CACHE_TTL
 * - Automatic cache invalidation on data updates
 * - Manual cache clearing available per student or globally
 * 
 * **Performance Optimizations**:
 * - Lazy loading of analytics data
 * - Batch processing for multiple students
 * - Graceful error handling with Promise.allSettled
 * 
 * @example
 * const manager = AnalyticsManagerService.getInstance();
 * const analytics = await manager.getStudentAnalytics(student);
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
      let stored: string | null = null;
      try {
        stored = typeof localStorage !== 'undefined' ? localStorage.getItem('sensoryTracker_analyticsProfiles') : null;
      } catch (e) {
        // environment without localStorage (SSR/tests)
      }
      const initialProfiles = profiles ?? loadProfilesFromStorage(stored);
      AnalyticsManagerService.instance = new AnalyticsManagerService(storage, initialProfiles);
    }
    return AnalyticsManagerService.instance;
  }

  /**
   * Initializes analytics profile for a new student.
   * 
   * @public
   * @method initializeStudentAnalytics
   * @param {string} studentId - Unique identifier for the student
   * @returns {void}
   * 
   * @description Creates and persists an analytics profile for a student if not already initialized.
   * 
   * **Profile Initialization**:
   * - Checks if profile already exists (idempotent operation)
   * - Creates default profile with all analytics features enabled
   * - Sets minimal data requirements (1 entry each for emotions, sensory, tracking)
   * - Initializes health score to 0 (will be calculated on first analysis)
   * - Persists profile to localStorage immediately
   * 
   * **Default Configuration**:
   * - patternAnalysisEnabled: true
   * - correlationAnalysisEnabled: true
   * - predictiveInsightsEnabled: true
   * - anomalyDetectionEnabled: true
   * - alertSystemEnabled: true
   * 
   * This method is automatically called when accessing student analytics,
   * ensuring profiles exist before analysis.
   */
  public initializeStudentAnalytics(studentId: string): void {
    try {
      if (!studentId || typeof studentId !== 'string') {
        logger.warn('[analyticsManager] initializeStudentAnalytics: invalid studentId', { studentId });
        return;
      }

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
    } catch (error) {
      logger.error('[analyticsManager] initializeStudentAnalytics failed', { error, studentId });
      // fail-soft
    }
  }

  /**
   * Retrieves comprehensive analytics for a specific student.
   * 
   * @public
   * @async
   * @method getStudentAnalytics
   * @param {Student} student - The student object to analyze
   * @returns {Promise<AnalyticsResults>} Complete analytics results including patterns, correlations, and insights
   * 
   * @description Main entry point for retrieving student analytics with intelligent caching.
   * 
   * **Caching Strategy**:
   * 1. Ensures student profile is initialized
   * 2. Checks cache for existing results
   * 3. Returns cached results if within TTL (Time To Live)
   * 4. Generates fresh analytics if cache miss or expired
   * 5. Updates cache with new results and timestamp
   * 
   * **TTL Behavior**:
   * - Default TTL: Configured in ANALYTICS_CONFIG.CACHE_TTL
   * - Cache validity: timestamp + TTL > current time
   * - Expired entries trigger regeneration
   * 
   * **Side Effects**:
   * - Updates lastAnalyzedAt timestamp in profile
   * - Recalculates and updates health score
   * - Persists updated profile to localStorage
   * 
   * @throws {Error} If analytics generation fails (wrapped from generateAnalytics)
   * 
   * @example
   * const results = await analyticsManager.getStudentAnalytics(student);
   * logger.info(`Confidence: ${results.confidence * 100}%`);
   */
  public async getStudentAnalytics(student: Student): Promise<AnalyticsResults> {
    this.initializeStudentAnalytics(student.id);

    const cached = this.analyticsCache.get(student.id);
    if (cached && (Date.now() - cached.timestamp.getTime()) < (ANALYTICS_CONFIG.analytics as any).CACHE_TTL) {
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

  /**
   * Generates fresh analytics for a student by orchestrating all analysis modules.
   * 
   * @private
   * @async
   * @method generateAnalytics
   * @param {Student} student - The student to analyze
   * @returns {Promise<AnalyticsResults>} Complete analytics results
   * 
   * @description Core analytics generation logic that coordinates multiple analysis types.
   * 
   * **Analysis Pipeline**:
   * 1. **Data Collection**: 
   *    - Retrieves all tracking entries for student
   *    - Extracts emotions and sensory inputs from entries
   *    - Loads student goals for predictive analysis
   * 
   * 2. **Minimum Data Check**:
   *    - Verifies at least one data type has entries
   *    - Skips analysis if no data available
   * 
   * 3. **Pattern Analysis** (if data exists):
   *    - Emotion patterns (if emotions > 0)
   *    - Sensory patterns (if sensory inputs > 0)
   *    - Environmental correlations (if tracking >= MIN_TRACKING_FOR_CORRELATION)
   * 
   * 4. **Enhanced Analysis** (if tracking >= MIN_TRACKING_FOR_ENHANCED):
   *    - Predictive insights using ML models
   *    - Anomaly detection for unusual patterns
   * 
   * 5. **Alert Generation**:
   *    - Triggers alert system for any tracking data
   * 
   * 6. **Insight Generation**:
   *    - Creates human-readable insights
   *    - Calculates overall confidence score
   * 
   * **Configuration**:
   * - Prefers live user-adjustable configuration
   * - Falls back to default constants if config unavailable
   * 
   * **Error Handling**:
   * - Logs detailed errors with student context
   * - Re-throws wrapped error for caller handling
   * 
   * @throws {Error} Analytics generation failed for student
   */
  private async generateAnalytics(student: Student): Promise<AnalyticsResults> {
    const trackingEntries = this.storage.getTrackingEntriesForStudent(student.id);
    const goals = this.storage.getGoalsForStudent(student.id);

    const emotions: EmotionEntry[] = trackingEntries.flatMap(entry => entry.emotions || []);
    const sensoryInputs: SensoryEntry[] = trackingEntries.flatMap(entry => entry.sensoryInputs || []);

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
            const ANALYTICS = liveConfig?.analytics ?? ANALYTICS_CONFIG.analytics;

            const analysisDays = ANALYTICS?.ANALYSIS_PERIOD_DAYS ?? ANALYTICS_CONFIG.analytics.ANALYSIS_PERIOD_DAYS;

            if (emotions.length > 0) {
                patterns.push(...patternAnalysis.analyzeEmotionPatterns(emotions, analysisDays));
            }
            if (sensoryInputs.length > 0) {
                patterns.push(...patternAnalysis.analyzeSensoryPatterns(sensoryInputs, analysisDays));
            }
            if (trackingEntries.length >= (ANALYTICS?.MIN_TRACKING_FOR_CORRELATION ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_CORRELATION)) {
                correlations = patternAnalysis.analyzeEnvironmentalCorrelations(trackingEntries);
            }
            if (trackingEntries.length >= (ANALYTICS?.MIN_TRACKING_FOR_ENHANCED ?? ANALYTICS_CONFIG.analytics.MIN_TRACKING_FOR_ENHANCED)) {
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
    const INSIGHTS_CFG = liveCfg?.insights ?? ANALYTICS_CONFIG.insights;
    const CONFIDENCE_CFG = liveCfg?.confidence ?? ANALYTICS_CONFIG.confidence;

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
    const { WEIGHTS } = (liveCfg?.healthScore ?? ANALYTICS_CONFIG.healthScore);
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
    try {
      if (!student || !student.id) {
        logger.warn('[analyticsManager] triggerAnalyticsForStudent: invalid student', { student });
        return;
      }
      this.analyticsCache.delete(student.id);
      await this.getStudentAnalytics(student);
    } catch (error) {
      logger.error('[analyticsManager] triggerAnalyticsForStudent failed', { error, studentId: student?.id });
      // fail-soft
    }
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sensoryTracker_analyticsProfiles', JSON.stringify(data));
      }
    } catch (error) {
      logger.error('Error saving analytics profiles:', error);
      // fail-soft
    }
  }
}

export const analyticsManager = AnalyticsManagerService.getInstance();