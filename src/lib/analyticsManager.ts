import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { patternAnalysis, PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import { alertSystem } from "@/lib/alertSystem";
import { dataStorage } from "@/lib/dataStorage";

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

interface AnalyticsResults {
  patterns: PatternResult[];
  correlations: CorrelationResult[];
  predictiveInsights: PredictiveInsight[];
  anomalies: AnomalyDetection[];
  insights: string[];
  hasMinimumData: boolean;
  confidence: number;
}

class AnalyticsManagerService {
  private static instance: AnalyticsManagerService;
  private analyticsProfiles: Map<string, StudentAnalyticsProfile> = new Map();
  private analyticsCache: Map<string, { results: AnalyticsResults; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.loadAnalyticsProfiles();
  }

  static getInstance(): AnalyticsManagerService {
    if (!AnalyticsManagerService.instance) {
      AnalyticsManagerService.instance = new AnalyticsManagerService();
    }
    return AnalyticsManagerService.instance;
  }

  // Initialize analytics for a new student
  public initializeStudentAnalytics(studentId: string): void {
    if (this.analyticsProfiles.has(studentId)) {
      return; // Already initialized
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
        emotionEntries: 1, // Start with any data
        sensoryEntries: 1,
        trackingEntries: 1,
      },
      analyticsHealthScore: 0,
    };

    this.analyticsProfiles.set(studentId, profile);
    this.saveAnalyticsProfiles();

    // Analytics is initialized - will show empty state until real data is collected
  }

  // Generate universal mock data for a student to enable pattern detection
  private generateUniversalMockDataForStudent(studentId: string): void {
    try {
      const student = dataStorage.getStudents().find(s => s.id === studentId);
      if (!student) return;

      // Import and use universal data generator
      const { generateUniversalMockDataForStudent } = require('./universalDataGenerator');
      const trackingEntries = generateUniversalMockDataForStudent(student);
      
      // Save tracking entries
      trackingEntries.forEach((entry: any) => {
        dataStorage.saveTrackingEntry(entry);
      });
    } catch (error) {
      console.error('Error generating universal mock data:', error);
    }
  }

  // Get analytics results for a student
  public async getStudentAnalytics(studentId: string): Promise<AnalyticsResults> {
    // Ensure student is initialized
    this.initializeStudentAnalytics(studentId);

    // Check cache first
    const cached = this.analyticsCache.get(studentId);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return cached.results;
    }

    // Generate fresh analytics
    const results = await this.generateAnalytics(studentId);
    this.analyticsCache.set(studentId, {
      results,
      timestamp: new Date()
    });

    // Update profile
    const profile = this.analyticsProfiles.get(studentId);
    if (profile) {
      profile.lastAnalyzedAt = new Date();
      profile.analyticsHealthScore = this.calculateHealthScore(results);
      this.analyticsProfiles.set(studentId, profile);
      this.saveAnalyticsProfiles();
    }

    return results;
  }

  // Generate comprehensive analytics for a student
  private async generateAnalytics(studentId: string): Promise<AnalyticsResults> {
    const student = dataStorage.getStudents().find(s => s.id === studentId);
    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    // Load student data
    const allTrackingEntries = dataStorage.getTrackingEntries();
    const trackingEntries = allTrackingEntries.filter(entry => entry.studentId === studentId);
    
    const emotions: EmotionEntry[] = [];
    const sensoryInputs: SensoryEntry[] = [];

    // Extract emotions and sensory inputs from tracking entries
    trackingEntries.forEach(entry => {
      emotions.push(...entry.emotions);
      sensoryInputs.push(...entry.sensoryInputs);
    });

    const goals = dataStorage.getGoals().filter(goal => goal.studentId === studentId);

    // Check if we have minimum data
    const hasMinimumData = emotions.length >= 1 || sensoryInputs.length >= 1 || trackingEntries.length >= 1;

    let patterns: PatternResult[] = [];
    let correlations: CorrelationResult[] = [];
    let predictiveInsights: PredictiveInsight[] = [];
    let anomalies: AnomalyDetection[] = [];

    if (hasMinimumData) {
      try {
        // Pattern analysis
        if (emotions.length > 0) {
          patterns.push(...patternAnalysis.analyzeEmotionPatterns(emotions, 30));
        }
        if (sensoryInputs.length > 0) {
          patterns.push(...patternAnalysis.analyzeSensoryPatterns(sensoryInputs, 30));
        }

        // Correlation analysis
        if (trackingEntries.length > 2) {
          correlations = patternAnalysis.analyzeEnvironmentalCorrelations(trackingEntries);
        }

        // Enhanced analytics
        if (trackingEntries.length > 1) {
          predictiveInsights = enhancedPatternAnalysis.generatePredictiveInsights(
            emotions,
            sensoryInputs,
            trackingEntries,
            goals
          );

          anomalies = enhancedPatternAnalysis.detectAnomalies(
            emotions,
            sensoryInputs,
            trackingEntries
          );
        }

        // Generate alerts
        if (trackingEntries.length > 0) {
          await alertSystem.generateAlertsForStudent(
            student,
            emotions,
            sensoryInputs,
            trackingEntries
          );
        }
      } catch (error) {
        console.error('Error generating analytics:', error);
      }
    }

    // Generate insights
    const insights = this.generateInsights(
      patterns,
      correlations,
      predictiveInsights,
      emotions,
      sensoryInputs,
      trackingEntries
    );

    // Calculate confidence based on data quality and quantity
    const confidence = this.calculateConfidence(emotions, sensoryInputs, trackingEntries);

    return {
      patterns,
      correlations,
      predictiveInsights,
      anomalies,
      insights,
      hasMinimumData,
      confidence,
    };
  }

  // Generate contextual insights
  private generateInsights(
    patterns: PatternResult[],
    correlations: CorrelationResult[],
    predictiveInsights: PredictiveInsight[],
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): string[] {
    const insights: string[] = [];

    // Data availability insights
    if (trackingEntries.length === 0) {
      insights.push("No tracking data available yet. Start by creating your first tracking session to begin pattern analysis.");
      return insights;
    }

    if (trackingEntries.length < 5) {
      insights.push(`Limited data available (${trackingEntries.length} sessions). Analytics will improve as more data is collected.`);
    }

    // Pattern insights
    const highConfidencePatterns = patterns.filter(p => p.confidence > 0.6);
    if (highConfidencePatterns.length > 0) {
      highConfidencePatterns.slice(0, 2).forEach(pattern => {
        insights.push(`Pattern detected: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)`);
      });
    }

    // Correlation insights
    const strongCorrelations = correlations.filter(c => c.significance === 'high');
    if (strongCorrelations.length > 0) {
      strongCorrelations.slice(0, 2).forEach(correlation => {
        insights.push(`Strong correlation found: ${correlation.description}`);
      });
    }

    // Predictive insights
    if (predictiveInsights.length > 0) {
      predictiveInsights.slice(0, 2).forEach(insight => {
        insights.push(`Prediction: ${insight.description} (${Math.round(insight.confidence * 100)}% confidence)`);
      });
    }

    // Progress insights
    if (emotions.length > 5) {
      const recentEmotions = emotions.slice(-7); // Last 7 emotions
      const positiveEmotions = recentEmotions.filter(e => 
        ['happy', 'calm', 'focused', 'proud', 'content'].includes(e.emotion.toLowerCase())
      );
      const positiveRate = positiveEmotions.length / recentEmotions.length;
      
      if (positiveRate > 0.6) {
        insights.push(`Positive trend: ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`);
      } else if (positiveRate < 0.3) {
        insights.push(`Consider reviewing strategies - ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`);
      }
    }

    if (insights.length === 0) {
      insights.push("Analytics are active and monitoring patterns. Continue collecting data for more detailed insights.");
    }

    return insights;
  }

  // Calculate analytics confidence based on data quality
  private calculateConfidence(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): number {
    let confidence = 0;

    // Base confidence on data quantity
    const emotionWeight = Math.min(emotions.length / 10, 1) * 0.3;
    const sensoryWeight = Math.min(sensoryInputs.length / 10, 1) * 0.3;
    const trackingWeight = Math.min(trackingEntries.length / 5, 1) * 0.4;

    confidence = emotionWeight + sensoryWeight + trackingWeight;

    // Boost confidence if we have recent data
    if (trackingEntries.length > 0) {
      const lastEntry = trackingEntries[trackingEntries.length - 1];
      const daysSinceLastEntry = (Date.now() - lastEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastEntry < 7) {
        confidence = Math.min(confidence + 0.1, 1);
      }
    }

    return Math.round(confidence * 100) / 100;
  }

  // Calculate analytics health score
  private calculateHealthScore(results: AnalyticsResults): number {
    let score = 0;

    // Base score on availability of different analytics
    if (results.patterns.length > 0) score += 20;
    if (results.correlations.length > 0) score += 20;
    if (results.predictiveInsights.length > 0) score += 20;
    if (results.anomalies.length > 0) score += 20;
    if (results.hasMinimumData) score += 20;

    // Adjust based on confidence
    score = score * results.confidence;

    return Math.round(score);
  }

  // Trigger analytics update for a student
  public async triggerAnalyticsForStudent(studentId: string): Promise<void> {
    try {
      // Clear cache to force fresh analysis
      this.analyticsCache.delete(studentId);
      
      // Generate new analytics
      await this.getStudentAnalytics(studentId);
    } catch (error) {
      console.error(`Error triggering analytics for student ${studentId}:`, error);
    }
  }

  // Trigger analytics for all students
  public async triggerAnalyticsForAllStudents(): Promise<void> {
    const students = dataStorage.getStudents();
    
    for (const student of students) {
      this.initializeStudentAnalytics(student.id);
      await this.triggerAnalyticsForStudent(student.id);
    }
  }

  // Get analytics status for all students
  public getAnalyticsStatus(): Array<{
    studentId: string;
    studentName: string;
    isInitialized: boolean;
    lastAnalyzed: Date | null;
    healthScore: number;
    hasMinimumData: boolean;
  }> {
    const students = dataStorage.getStudents();
    return students.map(student => {
      const profile = this.analyticsProfiles.get(student.id);
      const cached = this.analyticsCache.get(student.id);
      
      return {
        studentId: student.id,
        studentName: student.name,
        isInitialized: profile?.isInitialized || false,
        lastAnalyzed: profile?.lastAnalyzedAt || null,
        healthScore: profile?.analyticsHealthScore || 0,
        hasMinimumData: cached?.results.hasMinimumData || false,
      };
    });
  }

  // Clear analytics cache
  public clearCache(studentId?: string): void {
    if (studentId) {
      this.analyticsCache.delete(studentId);
    } else {
      this.analyticsCache.clear();
    }
  }

  // Load analytics profiles from localStorage
  private loadAnalyticsProfiles(): void {
    try {
      const stored = localStorage.getItem('sensoryTracker_analyticsProfiles');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([studentId, profile]) => {
          // Convert date strings back to Date objects
          const profileData = profile as any;
          const convertedProfile: StudentAnalyticsProfile = {
            studentId: profileData.studentId,
            isInitialized: profileData.isInitialized,
            lastAnalyzedAt: profileData.lastAnalyzedAt ? new Date(profileData.lastAnalyzedAt) : null,
            analyticsConfig: profileData.analyticsConfig,
            minimumDataRequirements: profileData.minimumDataRequirements,
            analyticsHealthScore: profileData.analyticsHealthScore || 0,
          };
          this.analyticsProfiles.set(studentId, convertedProfile);
        });
      }
    } catch (error) {
      console.error('Error loading analytics profiles:', error);
    }
  }

  // Save analytics profiles to localStorage
  private saveAnalyticsProfiles(): void {
    try {
      const data: Record<string, StudentAnalyticsProfile> = {};
      this.analyticsProfiles.forEach((profile, studentId) => {
        data[studentId] = profile;
      });
      localStorage.setItem('sensoryTracker_analyticsProfiles', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving analytics profiles:', error);
    }
  }
}

// Export singleton instance
export const analyticsManager = AnalyticsManagerService.getInstance();