import { EmotionEntry, SensoryEntry, EnvironmentalEntry, TrackingEntry } from "@/types/student";
import { isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { analyticsConfig, AnalyticsConfiguration } from "@/lib/analyticsConfig";

export interface PatternResult {
  type: 'emotion' | 'sensory' | 'environmental' | 'correlation';
  pattern: string;
  confidence: number; // 0-1
  frequency: number;
  description: string;
  recommendations?: string[];
  dataPoints: number;
  timeframe: string;
}

export interface CorrelationResult {
  factor1: string;
  factor2: string;
  correlation: number; // -1 to 1
  significance: 'low' | 'moderate' | 'high';
  description: string;
  recommendations?: string[];
}

export interface TriggerAlert {
  id: string;
  type: 'concern' | 'improvement' | 'pattern';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendations: string[];
  timestamp: Date;
  studentId: string;
  dataPoints: number;
}

class PatternAnalysisEngine {
  private config: AnalyticsConfiguration;

  constructor() {
    this.config = analyticsConfig.getConfig();
    
    // Subscribe to configuration changes
    analyticsConfig.subscribe((newConfig) => {
      this.config = newConfig;
    });
  }

  analyzeEmotionPatterns(emotions: EmotionEntry[], timeframeDays?: number): PatternResult[] {
    const actualTimeframe = timeframeDays || this.config.timeWindows.defaultAnalysisDays;
    
    if (emotions.length < this.config.patternAnalysis.minDataPoints) return [];

    const patterns: PatternResult[] = [];
    const cutoffDate = subDays(new Date(), actualTimeframe);
    const recentEmotions = emotions.filter(e => e.timestamp >= cutoffDate);

    // Apply sensitivity multipliers based on alert sensitivity level
    const intensityThreshold = this.config.patternAnalysis.highIntensityThreshold *
      (1 / this.config.alertSensitivity.emotionIntensityMultiplier);
    const frequencyThreshold = this.config.patternAnalysis.concernFrequencyThreshold *
      (1 / this.config.alertSensitivity.frequencyMultiplier);

    // Analyze high-intensity negative emotions
    const highIntensityNegative = recentEmotions.filter(e =>
      e.intensity >= intensityThreshold &&
      ['anxious', 'frustrated', 'angry', 'overwhelmed', 'sad'].includes(e.emotion.toLowerCase())
    );

    // Also analyze moderate intensity patterns for better detection
    const moderateIntensityNegative = recentEmotions.filter(e =>
      e.intensity >= 3 &&
      ['anxious', 'frustrated', 'angry', 'overwhelmed', 'sad'].includes(e.emotion.toLowerCase())
    );

    if (highIntensityNegative.length / recentEmotions.length > frequencyThreshold) {
      patterns.push({
        type: 'emotion',
        pattern: 'high-intensity-negative',
        confidence: Math.min(highIntensityNegative.length / recentEmotions.length, 1),
        frequency: highIntensityNegative.length,
        description: `High-intensity negative emotions detected in ${Math.round((highIntensityNegative.length / recentEmotions.length) * 100)}% of recent sessions`,
        recommendations: [
          'Consider implementing calming strategies before intense activities',
          'Monitor environmental triggers that may contribute to stress',
          'Discuss coping mechanisms with student'
        ],
        dataPoints: recentEmotions.length,
        timeframe: `${actualTimeframe} days`
      });
    }

    // Analyze emotion consistency
    const emotionCounts = recentEmotions.reduce((acc, e) => {
      acc[e.emotion.toLowerCase()] = (acc[e.emotion.toLowerCase()] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (dominantEmotion && dominantEmotion[1] / recentEmotions.length > this.config.patternAnalysis.emotionConsistencyThreshold) {
      patterns.push({
        type: 'emotion',
        pattern: 'consistent-emotion',
        confidence: dominantEmotion[1] / recentEmotions.length,
        frequency: dominantEmotion[1],
        description: `Consistent ${dominantEmotion[0]} emotion pattern detected`,
        recommendations: this.getEmotionRecommendations(dominantEmotion[0]),
        dataPoints: recentEmotions.length,
        timeframe: `${actualTimeframe} days`
      });
    }

    // Add moderate negative emotion pattern if high intensity doesn't trigger
    if (highIntensityNegative.length === 0 && moderateIntensityNegative.length / recentEmotions.length > this.config.patternAnalysis.moderateNegativeThreshold) {
      patterns.push({
        type: 'emotion',
        pattern: 'moderate-negative-trend',
        confidence: moderateIntensityNegative.length / recentEmotions.length,
        frequency: moderateIntensityNegative.length,
        description: `Moderate negative emotions detected in ${Math.round((moderateIntensityNegative.length / recentEmotions.length) * 100)}% of recent sessions`,
        recommendations: [
          'Monitor for potential stress escalation',
          'Implement preventive calming strategies',
          'Consider environmental adjustments'
        ],
        dataPoints: recentEmotions.length,
        timeframe: `${actualTimeframe} days`
      });
    }

    return patterns;
  }

  analyzeSensoryPatterns(sensoryInputs: SensoryEntry[], timeframeDays?: number): PatternResult[] {
    const actualTimeframe = timeframeDays || this.config.timeWindows.defaultAnalysisDays;
    
    if (sensoryInputs.length < this.config.patternAnalysis.minDataPoints) return [];

    const patterns: PatternResult[] = [];
    const cutoffDate = subDays(new Date(), actualTimeframe);
    const recentSensory = sensoryInputs.filter(s => s.timestamp >= cutoffDate);

    // Analyze sensory seeking vs avoiding patterns
    const seekingBehaviors = recentSensory.filter(s => 
      s.response.toLowerCase().includes('seeking') || 
      s.response.toLowerCase().includes('craving')
    );

    const avoidingBehaviors = recentSensory.filter(s => 
      s.response.toLowerCase().includes('avoiding') || 
      s.response.toLowerCase().includes('covering')
    );

    if (seekingBehaviors.length > avoidingBehaviors.length * 2) {
      patterns.push({
        type: 'sensory',
        pattern: 'sensory-seeking',
        confidence: seekingBehaviors.length / recentSensory.length,
        frequency: seekingBehaviors.length,
        description: 'Strong sensory-seeking pattern identified',
        recommendations: [
          'Provide scheduled sensory breaks',
          'Offer fidget tools and movement opportunities',
          'Consider sensory-rich learning activities'
        ],
        dataPoints: recentSensory.length,
        timeframe: `${actualTimeframe} days`
      });
    } else if (avoidingBehaviors.length > seekingBehaviors.length * 2) {
      patterns.push({
        type: 'sensory',
        pattern: 'sensory-avoiding',
        confidence: avoidingBehaviors.length / recentSensory.length,
        frequency: avoidingBehaviors.length,
        description: 'Strong sensory-avoiding pattern identified',
        recommendations: [
          'Provide quiet, low-stimulation spaces',
          'Use noise-canceling headphones when appropriate',
          'Gradually introduce sensory experiences'
        ],
        dataPoints: recentSensory.length,
        timeframe: `${actualTimeframe} days`
      });
    }

    return patterns;
  }

  analyzeEnvironmentalCorrelations(trackingEntries: TrackingEntry[]): CorrelationResult[] {
    if (trackingEntries.length < this.config.patternAnalysis.minDataPoints) return [];

    const correlations: CorrelationResult[] = [];

    // Analyze noise level vs emotion intensity correlation
    const noiseEmotionData = trackingEntries
      .filter(entry => entry.environmentalData?.roomConditions?.noiseLevel && entry.emotions.length > 0)
      .map(entry => ({
        noise: entry.environmentalData!.roomConditions!.noiseLevel,
        avgEmotionIntensity: entry.emotions.reduce((sum, e) => sum + e.intensity, 0) / entry.emotions.length
      }));

    if (noiseEmotionData.length >= this.config.patternAnalysis.minDataPoints) {
      const correlation = this.calculateCorrelation(
        noiseEmotionData.map(d => d.noise),
        noiseEmotionData.map(d => d.avgEmotionIntensity)
      );

      if (Math.abs(correlation) > this.config.patternAnalysis.correlationThreshold) {
        correlations.push({
          factor1: 'Noise Level',
          factor2: 'Emotion Intensity',
          correlation,
          significance: this.getSignificance(Math.abs(correlation)),
          description: correlation > 0 
            ? 'Higher noise levels correlate with more intense emotions'
            : 'Lower noise levels correlate with more intense emotions',
          recommendations: correlation > 0 
            ? ['Consider noise reduction strategies', 'Provide quiet spaces during intense activities']
            : ['Monitor for overstimulation in quiet environments']
        });
      }
    }

    // Analyze lighting vs positive emotions
    const lightingEmotionData = trackingEntries
      .filter(entry => entry.environmentalData?.roomConditions?.lighting && entry.emotions.length > 0)
      .map(entry => ({
        lighting: entry.environmentalData!.roomConditions!.lighting,
        positiveEmotions: entry.emotions.filter(e => 
          ['happy', 'calm', 'focused', 'excited', 'content'].includes(e.emotion.toLowerCase())
        ).length / entry.emotions.length
      }));

    // Group lighting data for analysis
    const lightingGroups = lightingEmotionData.reduce((acc, d) => {
      if (!acc[d.lighting]) acc[d.lighting] = [];
      acc[d.lighting].push(d.positiveEmotions);
      return acc;
    }, {} as Record<string, number[]>);

    // Find best lighting condition
    const lightingAverages = Object.entries(lightingGroups)
      .map(([lighting, values]) => ({
        lighting,
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        count: values.length
      }))
      .filter(l => l.count >= 3)
      .sort((a, b) => b.average - a.average);

    if (lightingAverages.length > 1) {
      const best = lightingAverages[0];
      const worst = lightingAverages[lightingAverages.length - 1];
      
      if (best.average - worst.average > 0.2) {
        correlations.push({
          factor1: 'Lighting Conditions',
          factor2: 'Positive Emotions',
          correlation: 0.5, // Categorical correlation estimate
          significance: 'moderate',
          description: `${best.lighting} lighting shows highest positive emotion rates (${Math.round(best.average * 100)}%)`,
          recommendations: [
            `Optimize for ${best.lighting} lighting when possible`,
            `Minimize exposure to ${worst.lighting} lighting during challenging activities`
          ]
        });
      }
    }

    return correlations;
  }

  generateTriggerAlerts(
    emotions: EmotionEntry[], 
    sensoryInputs: SensoryEntry[], 
    trackingEntries: TrackingEntry[],
    studentId: string
  ): TriggerAlert[] {
    const alerts: TriggerAlert[] = [];

    // Check for recent concerning patterns
    const recentCutoff = subDays(new Date(), this.config.timeWindows.recentDataDays);
    const recentEmotions = emotions.filter(e => e.timestamp >= recentCutoff);
    const recentEntries = trackingEntries.filter(e => e.timestamp >= recentCutoff);

    // Apply sensitivity multipliers
    const intensityThreshold = this.config.patternAnalysis.highIntensityThreshold *
      (1 / this.config.alertSensitivity.emotionIntensityMultiplier);

    // High stress pattern alert
    const highStressEmotions = recentEmotions.filter(e =>
      e.intensity >= intensityThreshold &&
      ['anxious', 'frustrated', 'overwhelmed', 'angry'].includes(e.emotion.toLowerCase())
    );

    if (highStressEmotions.length >= 2) {
      alerts.push({
        id: ((globalThis as unknown as { crypto?: { randomUUID?: () => string } })?.crypto?.randomUUID?.()) ||
            `alert-${Math.random().toString(36).slice(2)}-${Date.now()}`,
        type: 'concern',
        severity: 'high',
        title: 'High Stress Pattern Detected',
        description: `${highStressEmotions.length} high-intensity stress responses recorded in the past week`,
        recommendations: [
          'Schedule a check-in with the student',
          'Review current stressors and triggers',
          'Implement additional calming strategies',
          'Consider environmental modifications'
        ],
        timestamp: new Date(),
        studentId,
        dataPoints: recentEmotions.length
      });
    }

    // Positive progress alert - fixed for 1-5 scale
    const positiveEmotions = recentEmotions.filter(e => 
      ['happy', 'calm', 'focused', 'proud', 'content'].includes(e.emotion.toLowerCase()) &&
      e.intensity >= 4
    );

    if (positiveEmotions.length >= 3 && recentEmotions.length >= 5) {
      alerts.push({
        id: ((globalThis as unknown as { crypto?: { randomUUID?: () => string } })?.crypto?.randomUUID?.()) ||
            `alert-${Math.random().toString(36).slice(2)}-${Date.now()}`,
        type: 'improvement',
        severity: 'low',
        title: 'Positive Progress Noted',
        description: `Strong positive emotional responses observed in ${Math.round((positiveEmotions.length / recentEmotions.length) * 100)}% of recent sessions`,
        recommendations: [
          'Continue current successful strategies',
          'Document what is working well',
          'Consider sharing success with student and family'
        ],
        timestamp: new Date(),
        studentId,
        dataPoints: recentEmotions.length
      });
    }

    // Environmental pattern alert
    const environmentalPatterns = this.analyzeEnvironmentalCorrelations(recentEntries);
    environmentalPatterns.forEach(pattern => {
      if (pattern.significance === 'high' && Math.abs(pattern.correlation) > 0.6) {
        alerts.push({
          id: ((globalThis as unknown as { crypto?: { randomUUID?: () => string } })?.crypto?.randomUUID?.()) ||
              `alert-${Math.random().toString(36).slice(2)}-${Date.now()}`,
          type: 'pattern',
          severity: 'medium',
          title: 'Environmental Pattern Identified',
          description: pattern.description,
          recommendations: pattern.recommendations || [],
          timestamp: new Date(),
          studentId,
          dataPoints: recentEntries.length
        });
      }
    });

    return alerts;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0 || n !== y.length) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    const sumYY = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getSignificance(correlation: number): 'low' | 'moderate' | 'high' {
    // Adjust thresholds based on configuration
    const lowThreshold = this.config.patternAnalysis.correlationThreshold;
    const highThreshold = this.config.patternAnalysis.correlationThreshold * 2;
    
    if (correlation < lowThreshold) return 'low';
    if (correlation < highThreshold) return 'moderate';
    return 'high';
  }

  private getEmotionRecommendations(emotion: string): string[] {
    const recommendations: Record<string, string[]> = {
      'anxious': [
        'Introduce mindfulness and breathing exercises',
        'Create predictable routines and schedules',
        'Provide advance notice of changes'
      ],
      'frustrated': [
        'Break tasks into smaller, manageable steps',
        'Offer choice and control opportunities',
        'Teach problem-solving strategies'
      ],
      'happy': [
        'Continue activities that promote positive engagement',
        'Document successful strategies for future use',
        'Build on current strengths'
      ],
      'calm': [
        'Maintain current supportive environment',
        'Use as a baseline for comparison',
        'Gradually introduce new challenges'
      ]
    };

    return recommendations[emotion.toLowerCase()] || [
      'Monitor patterns and adjust strategies as needed',
      'Consult with support team for specialized approaches'
    ];
  }
}

export const patternAnalysis = new PatternAnalysisEngine();