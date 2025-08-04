import { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from "@/types/student";
import { isWithinInterval, subDays, format, differenceInDays } from "date-fns";
import { analyticsConfig, AnalyticsConfiguration } from "@/lib/analyticsConfig";
import { mlModels, EmotionPrediction, SensoryPrediction, BaselineCluster } from "@/lib/mlModels";
import { logger } from '@/lib/logger';

export interface PredictiveInsight {
  type: 'prediction' | 'trend' | 'recommendation' | 'risk';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  prediction?: {
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    accuracy: number;
  };
  recommendations: string[];
  severity?: 'low' | 'medium' | 'high';
  source?: 'statistical' | 'ml' | 'hybrid';
  mlPrediction?: EmotionPrediction[] | SensoryPrediction;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // change per day
  significance: number; // 0-1
  confidence: number;
  forecast: {
    next7Days: number;
    next30Days: number;
    confidence: number;
  };
}

export interface AnomalyDetection {
  timestamp: Date;
  type: 'emotion' | 'sensory' | 'environmental';
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviationScore: number;
  recommendations: string[];
}

export interface CorrelationMatrix {
  factors: string[];
  matrix: number[][];
  significantPairs: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    pValue: number;
    significance: 'low' | 'moderate' | 'high';
  }>;
}

class EnhancedPatternAnalysisEngine {
  private config: AnalyticsConfiguration;
  private mlModelsInitialized: boolean = false;

  constructor() {
    this.config = analyticsConfig.getConfig();
    
    // Subscribe to configuration changes
    analyticsConfig.subscribe((newConfig) => {
      this.config = newConfig;
    });

    // Initialize ML models
    this.initializeMLModels();
  }

  private async initializeMLModels(): Promise<void> {
    try {
      await mlModels.init();
      this.mlModelsInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize ML models:', error);
      this.mlModelsInitialized = false;
    }
  }

  // Predictive Analytics with ML Integration
  async generatePredictiveInsights(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[],
    goals: Goal[] = []
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Statistical emotional well-being prediction
    const emotionTrend = this.analyzeEmotionTrend(emotions);
    if (emotionTrend && emotionTrend.significance >= this.config.enhancedAnalysis.predictionConfidenceThreshold) {
      const statisticalInsight: PredictiveInsight = {
        type: 'prediction',
        title: 'Emotional Well-being Forecast (Statistical)',
        description: `Based on current trends, emotional intensity is ${emotionTrend.direction}`,
        confidence: emotionTrend.significance,
        timeframe: '7-day forecast',
        prediction: {
          value: emotionTrend.forecast.next7Days,
          trend: emotionTrend.direction,
          accuracy: emotionTrend.confidence
        },
        recommendations: this.getEmotionTrendRecommendations(emotionTrend),
        severity: this.getTrendSeverity(emotionTrend),
        source: 'statistical'
      };
      insights.push(statisticalInsight);
    }

    // ML emotional prediction if available
    if (this.mlModelsInitialized && trackingEntries.length >= 7) {
      try {
        const modelStatus = await mlModels.getModelStatus();
        if (modelStatus.get('emotion-prediction')) {
          const mlEmotionPredictions = await mlModels.predictEmotions(
            trackingEntries.slice(-14), // Use last 14 days for better context
            7
          );

          if (mlEmotionPredictions.length > 0) {
            // Calculate overall trend from ML predictions
            const avgPredictedIntensity = mlEmotionPredictions.reduce((sum, pred) => {
              const emotionSum = Object.values(pred.emotions).reduce((s, v) => s + v, 0);
              return sum + emotionSum / Object.keys(pred.emotions).length;
            }, 0) / mlEmotionPredictions.length;

            const currentAvgIntensity = emotions.slice(-7).reduce((sum, e) => sum + e.intensity, 0) /
              Math.max(emotions.slice(-7).length, 1);

            const mlTrend = avgPredictedIntensity > currentAvgIntensity * 1.1 ? 'increasing' :
                           avgPredictedIntensity < currentAvgIntensity * 0.9 ? 'decreasing' : 'stable';

            insights.push({
              type: 'prediction',
              title: 'Emotional Well-being Forecast (ML)',
              description: `Machine learning predicts emotional patterns will be ${mlTrend}`,
              confidence: mlEmotionPredictions[0].confidence,
              timeframe: '7-day forecast',
              prediction: {
                value: avgPredictedIntensity,
                trend: mlTrend,
                accuracy: mlEmotionPredictions[0].confidence
              },
              recommendations: this.getMLEmotionRecommendations(mlEmotionPredictions, mlTrend),
              severity: mlTrend === 'increasing' && avgPredictedIntensity > 3.5 ? 'high' :
                       mlTrend === 'decreasing' && avgPredictedIntensity < 2 ? 'medium' : 'low',
              source: 'ml',
              mlPrediction: mlEmotionPredictions
            });
          }
        }
      } catch (error) {
        logger.error('ML emotion prediction failed:', error);
      }
    }

    // Statistical sensory regulation prediction
    const sensoryTrend = this.analyzeSensoryTrend(sensoryInputs);
    if (sensoryTrend && sensoryTrend.significance >= this.config.enhancedAnalysis.predictionConfidenceThreshold) {
      insights.push({
        type: 'prediction',
        title: 'Sensory Regulation Forecast (Statistical)',
        description: `Sensory seeking/avoiding patterns show ${sensoryTrend.direction} trend`,
        confidence: sensoryTrend.significance,
        timeframe: '14-day forecast',
        prediction: {
          value: sensoryTrend.forecast.next7Days,
          trend: sensoryTrend.direction,
          accuracy: sensoryTrend.confidence
        },
        recommendations: this.getSensoryTrendRecommendations(sensoryTrend),
        severity: this.getTrendSeverity(sensoryTrend),
        source: 'statistical'
      });
    }

    // ML sensory prediction if available
    if (this.mlModelsInitialized && trackingEntries.length > 0) {
      try {
        const modelStatus = await mlModels.getModelStatus();
        if (modelStatus.get('sensory-response') && trackingEntries[trackingEntries.length - 1].environmentalData) {
          const latestEnvironment = {
            lighting: trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.lighting as 'bright' | 'dim' | 'moderate' || 'moderate',
            noise: (trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.noiseLevel &&
                   trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.noiseLevel > 70 ? 'loud' :
                   trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.noiseLevel &&
                   trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.noiseLevel < 40 ? 'quiet' : 'moderate') as 'loud' | 'moderate' | 'quiet',
            temperature: (trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.temperature &&
                        trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.temperature > 26 ? 'hot' :
                        trackingEntries[trackingEntries.length - 1].environmentalData?.roomConditions?.temperature &&
                        trackingEntries[trackingEntries.length - 1].environmentalData.roomConditions.temperature < 18 ? 'cold' : 'comfortable') as 'hot' | 'cold' | 'comfortable',
            crowded: 'moderate' as const,
            smells: false,
            textures: false
          };

          const mlSensoryPrediction = await mlModels.predictSensoryResponse(
            latestEnvironment,
            new Date()
          );

          if (mlSensoryPrediction) {
            insights.push({
              type: 'prediction',
              title: 'Sensory Response Prediction (ML)',
              description: `Machine learning predicts sensory responses based on current environment`,
              confidence: mlSensoryPrediction.confidence,
              timeframe: 'Current environment',
              recommendations: this.getMLSensoryRecommendations(mlSensoryPrediction),
              severity: mlSensoryPrediction.environmentalTriggers.length > 2 ? 'high' :
                       mlSensoryPrediction.environmentalTriggers.length > 0 ? 'medium' : 'low',
              source: 'ml',
              mlPrediction: mlSensoryPrediction
            });
          }
        }
      } catch (error) {
        logger.error('ML sensory prediction failed:', error);
      }
    }

    // Goal achievement prediction
    goals.forEach(goal => {
      const goalPrediction = this.predictGoalAchievement(goal);
      if (goalPrediction) {
        insights.push(goalPrediction);
      }
    });

    // Risk assessment
    const riskInsights = this.assessRisks(emotions, sensoryInputs, trackingEntries);
    insights.push(...riskInsights);

    return insights;
  }

  // Enhanced Trend Analysis with Statistical Significance
  analyzeTrendsWithStatistics(data: { value: number; timestamp: Date }[]): TrendAnalysis | null {
    if (data.length < this.config.enhancedAnalysis.minSampleSize) return null;

    // Sort by timestamp
    const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate linear regression
    const n = sortedData.length;
    const x = sortedData.map((_, i) => i);
    const y = sortedData.map(d => d.value);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for significance
    const yMean = sumY / n;
    const yPred = x.map(xi => (Number.isFinite(slope) ? slope * xi + intercept : intercept));
    const ssRes = y.map((yi, i) => Math.pow(yi - yPred[i], 2)).reduce((a, b) => a + b, 0);
    const ssTot = y.map(yi => Math.pow(yi - yMean, 2)).reduce((a, b) => a + b, 0);
    const rSquared = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - (ssRes / ssTot)));

    // Enhanced confidence calculation
    const timeSpanDays = differenceInDays(
      sortedData[sortedData.length - 1].timestamp,
      sortedData[0].timestamp
    );

    // Guard against zero/negative timespan to avoid NaN/Infinity
    const safeTimeSpanDays = Math.max(1, timeSpanDays || 0);
    const dailyRate = Number.isFinite(slope) ? slope * (n / safeTimeSpanDays) : 0;
    
    // Multi-factor confidence calculation
    const dataQuality = Math.min(1, n / 30); // Better with more data points
    const timeSpanQuality = Math.min(1, timeSpanDays / 21); // Better with longer timespan
    const patternStrength = Math.max(0, rSquared); // R-squared strength
    const enhancedConfidence = (dataQuality * 0.3 + timeSpanQuality * 0.3 + patternStrength * 0.4);

    const direction = Math.abs(dailyRate) < this.config.enhancedAnalysis.trendThreshold ? 'stable' :
                     dailyRate > 0 ? 'increasing' : 'decreasing';

    return {
      metric: 'Overall Trend',
      direction,
      rate: Number.isFinite(dailyRate) ? dailyRate : 0,
      significance: Number.isFinite(rSquared) ? rSquared : 0,
      confidence: Number.isFinite(enhancedConfidence) ? enhancedConfidence : 0,
      forecast: {
        next7Days: (yPred[yPred.length - 1] ?? 0) + ((Number.isFinite(slope) ? slope : 0) * 7),
        next30Days: (yPred[yPred.length - 1] ?? 0) + ((Number.isFinite(slope) ? slope : 0) * 30),
        confidence: Number.isFinite(enhancedConfidence) ? enhancedConfidence : 0
      }
    };
  }

  // Generate confidence explanation
  generateConfidenceExplanation(
    dataPoints: number,
    timeSpanDays: number,
    rSquared: number,
    confidence: number
  ): { level: 'low' | 'medium' | 'high'; explanation: string; factors: string[] } {
    const factors: string[] = [];
    let explanation = '';
    let level: 'low' | 'medium' | 'high' = 'low';

    if (dataPoints < 10) {
      factors.push(`insufficientData:${dataPoints}:${this.config.enhancedAnalysis.minSampleSize}`);
    }
    
    if (timeSpanDays < 14) {
      factors.push(`shortTimespan:${timeSpanDays}:21`);
    }
    
    if (rSquared < 0.3) {
      factors.push(`weakPattern:${rSquared.toFixed(3)}`);
    } else if (rSquared > 0.7) {
      factors.push(`strongPattern:${rSquared.toFixed(3)}`);
    } else {
      factors.push('moderatePattern');
    }

    // Determine overall level and explanation
    if (confidence >= 0.7) {
      level = 'high';
      explanation = rSquared > 0.8 ? 'excellentData' : 'reliableInsight';
    } else if (confidence >= 0.4) {
      level = 'medium';
      explanation = 'emergingTrend';
    } else {
      level = 'low';
      explanation = 'needMoreData';
    }

    return { level, explanation, factors };
  }

  // Anomaly Detection using Statistical Methods
  detectAnomalies(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Emotion intensity anomalies
    const emotionIntensities = emotions.map(e => e.intensity);
    const emotionMean = emotionIntensities.reduce((a, b) => a + b, 0) / emotionIntensities.length;
    const emotionStd = Math.sqrt(
      emotionIntensities.map(x => Math.pow(x - emotionMean, 2)).reduce((a, b) => a + b, 0) / emotionIntensities.length
    );

    // Apply anomaly sensitivity multiplier
    const anomalyThreshold = this.config.enhancedAnalysis.anomalyThreshold *
      (1 / this.config.alertSensitivity.anomalyMultiplier);

    emotions.forEach(emotion => {
      const zScore = Math.abs((emotion.intensity - emotionMean) / emotionStd);
      if (zScore > anomalyThreshold) {
        anomalies.push({
          timestamp: emotion.timestamp,
          type: 'emotion',
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          description: `Unusual ${emotion.emotion} intensity detected (${emotion.intensity}/5)`,
          deviationScore: zScore,
          recommendations: this.getAnomalyRecommendations('emotion', emotion.emotion, zScore)
        });
      }
    });

    // Sensory frequency anomalies
    const dailySensoryCounts = this.groupSensoryByDay(sensoryInputs);
    const counts = Object.values(dailySensoryCounts);
    if (counts.length > 0) {
      const countMean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const countStd = Math.sqrt(
        counts.map(x => Math.pow(x - countMean, 2)).reduce((a, b) => a + b, 0) / counts.length
      );

      Object.entries(dailySensoryCounts).forEach(([date, count]) => {
        const zScore = Math.abs((count - countMean) / countStd);
        if (zScore > anomalyThreshold) {
          anomalies.push({
            timestamp: new Date(date),
            type: 'sensory',
            severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
            description: `Unusual sensory activity level detected (${count} inputs)`,
            deviationScore: zScore,
            recommendations: this.getAnomalyRecommendations('sensory', 'frequency', zScore)
          });
        }
      });
    }

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Comprehensive Correlation Matrix
  generateCorrelationMatrix(trackingEntries: TrackingEntry[]): CorrelationMatrix {
    const factors = [
      'avgEmotionIntensity',
      'positiveEmotionRatio',
      'sensorySeekingRatio',
      'noiseLevel',
      'temperature',
      'lightingQuality'
    ];

    const dataPoints = trackingEntries.map(entry => ({
      avgEmotionIntensity: entry.emotions.length > 0 
        ? entry.emotions.reduce((sum, e) => sum + e.intensity, 0) / entry.emotions.length 
        : 0,
      positiveEmotionRatio: entry.emotions.length > 0
        ? entry.emotions.filter(e => ['happy', 'calm', 'focused', 'excited'].includes(e.emotion.toLowerCase())).length / entry.emotions.length
        : 0,
      sensorySeekingRatio: entry.sensoryInputs.length > 0
        ? entry.sensoryInputs.filter(s => s.response.toLowerCase().includes('seeking')).length / entry.sensoryInputs.length
        : 0,
      noiseLevel: entry.environmentalData?.roomConditions?.noiseLevel || 0,
      temperature: entry.environmentalData?.roomConditions?.temperature || 0,
      lightingQuality: this.convertLightingToNumeric(entry.environmentalData?.roomConditions?.lighting)
    }));

    const matrix: number[][] = [];
    const significantPairs: CorrelationMatrix['significantPairs'] = [];

    factors.forEach((factor1, i) => {
      matrix[i] = [];
      factors.forEach((factor2, j) => {
        const values1 = dataPoints.map(d => d[factor1 as keyof typeof d]).filter(v => v !== undefined);
        const values2 = dataPoints.map(d => d[factor2 as keyof typeof d]).filter(v => v !== undefined);
        
        const correlation = this.calculatePearsonCorrelation(values1, values2);
        matrix[i][j] = correlation;

        if (i < j && Math.abs(correlation) > 0.3 && values1.length >= this.config.enhancedAnalysis.minSampleSize) {
          const pValue = this.calculatePValue(correlation, values1.length);
          significantPairs.push({
            factor1,
            factor2,
            correlation,
            pValue,
            significance: Math.abs(correlation) > 0.7 ? 'high' : 
                         Math.abs(correlation) > 0.5 ? 'moderate' : 'low'
          });
        }
      });
    });

    return {
      factors,
      matrix,
      significantPairs: significantPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    };
  }

  // Helper Methods
  private analyzeEmotionTrend(emotions: EmotionEntry[]): TrendAnalysis | null {
    const emotionData = emotions.map(e => ({
      value: e.intensity,
      timestamp: e.timestamp
    }));

    return this.analyzeTrendsWithStatistics(emotionData);
  }

  private analyzeSensoryTrend(sensoryInputs: SensoryEntry[]): TrendAnalysis | null {
    // Convert sensory responses to numeric values for trend analysis
    const sensoryData = sensoryInputs.map(s => ({
      value: s.response.toLowerCase().includes('seeking') ? 1 : 
             s.response.toLowerCase().includes('avoiding') ? -1 : 0,
      timestamp: s.timestamp
    }));

    return this.analyzeTrendsWithStatistics(sensoryData);
  }

  private predictGoalAchievement(goal: Goal): PredictiveInsight | null {
    if (!goal.dataPoints || goal.dataPoints.length < 3) return null;

    const progressData = goal.dataPoints.map(dp => ({
      value: dp.value,
      timestamp: dp.timestamp
    }));

    const trend = this.analyzeTrendsWithStatistics(progressData);
    if (!trend) return null;

    const currentProgress = goal.dataPoints[goal.dataPoints.length - 1].value;
    const targetValue = goal.targetValue;
    const remainingProgress = targetValue - currentProgress;
    const estimatedDays = trend.rate > 0 ? remainingProgress / trend.rate : -1;

    return {
      type: 'prediction',
      title: `Goal Achievement Forecast: ${goal.title}`,
      description: estimatedDays > 0 
        ? `Estimated ${Math.ceil(estimatedDays)} days to achieve goal at current pace`
        : 'Goal may require strategy adjustment based on current trend',
      confidence: trend.significance,
      timeframe: 'Goal completion forecast',
      prediction: {
        value: targetValue,
        trend: trend.direction,
        accuracy: trend.significance
      },
      recommendations: this.getGoalRecommendations(goal, trend, estimatedDays),
      severity: estimatedDays < 0 ? 'high' : estimatedDays > 60 ? 'medium' : 'low'
    };
  }

  private assessRisks(
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): PredictiveInsight[] {
    const risks: PredictiveInsight[] = [];
    const recentData = {
      emotions: emotions.filter(e => e.timestamp >= subDays(new Date(), this.config.timeWindows.shortTermDays)),
      sensoryInputs: sensoryInputs.filter(s => s.timestamp >= subDays(new Date(), this.config.timeWindows.shortTermDays)),
      trackingEntries: trackingEntries.filter(t => t.timestamp >= subDays(new Date(), this.config.timeWindows.shortTermDays))
    };

    // Apply sensitivity multiplier for risk assessment
    const riskThreshold = this.config.enhancedAnalysis.riskAssessmentThreshold *
      (1 / this.config.alertSensitivity.emotionIntensityMultiplier);

    // High stress accumulation risk - fixed for 1-5 scale
    const highStressCount = recentData.emotions.filter(e =>
      e.intensity >= 4 && ['anxious', 'frustrated', 'overwhelmed', 'angry'].includes(e.emotion.toLowerCase())
    ).length;

    if (highStressCount >= Math.floor(riskThreshold)) {
      risks.push({
        type: 'risk',
        title: 'Stress Accumulation Risk',
        description: `${highStressCount} high-stress incidents in the past 2 weeks`,
        confidence: 0.8,
        timeframe: 'Immediate attention needed',
        recommendations: [
          'Implement immediate stress reduction strategies',
          'Review and adjust current interventions',
          'Consider environmental modifications',
          'Schedule additional support sessions'
        ],
        severity: 'high'
      });
    }

    return risks;
  }

  private groupSensoryByDay(sensoryInputs: SensoryEntry[]): Record<string, number> {
    return sensoryInputs.reduce((acc, input) => {
      const date = format(input.timestamp, 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private convertLightingToNumeric(lighting?: string): number {
    const lightingMap: Record<string, number> = {
      'dim': 1,
      'normal': 2,
      'bright': 3,
      'fluorescent': 2.5,
      'natural': 3.5
    };
    return lightingMap[lighting?.toLowerCase() || ''] || 2;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    const sumYY = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculatePValue(correlation: number, sampleSize: number): number {
    // Simplified p-value calculation for correlation
    if (!Number.isFinite(correlation) || sampleSize <= 2 || !Number.isFinite(sampleSize)) {
      return 1; // non-significant
    }
    const denom = (1 - correlation * correlation);
    if (denom <= 0) return 0; // maximal correlation
    const t = correlation * Math.sqrt((sampleSize - 2) / denom);
    if (!Number.isFinite(t)) return 1;
    const val = 2 * (1 - this.studentTCDF(Math.abs(t), sampleSize - 2));
    return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 1;
  }

  private studentTCDF(t: number, df: number): number {
    // Simplified student's t-distribution CDF approximation
    if (!Number.isFinite(t) || df <= 0) return 0.5;
    const x = df / (df + t * t);
    const ib = this.incompleteBeta(Math.max(1e-8, df / 2), 0.5, Math.max(1e-8, Math.min(1 - 1e-8, x)));
    const res = 0.5 + 0.5 * Math.sign(t) * ib;
    return Number.isFinite(res) ? Math.max(0, Math.min(1, res)) : 0.5;
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    // Simplified incomplete beta function approximation with guards
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(x)) return 0;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const num = Math.pow(x, a) * Math.pow(1 - x, b);
    const den = a * this.beta(a, b);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
    return num / den;
  }

  private beta(a: number, b: number): number {
    // Simplified beta function approximation
    const ga = this.gamma(a);
    const gb = this.gamma(b);
    const gab = this.gamma(a + b);
    if (!Number.isFinite(ga) || !Number.isFinite(gb) || !Number.isFinite(gab) || gab === 0) return 1;
    return (ga * gb) / gab;
  }

  private gamma(z: number): number {
    // Simplified gamma function approximation using Stirling's approximation with guards
    if (!Number.isFinite(z)) return 1;
    if (z <= 0) return 1;
    if (z < 1) return this.gamma(z + 1) / z;
    const v = Math.sqrt(2 * Math.PI / z) * Math.pow(z / Math.E, z);
    return Number.isFinite(v) ? v : 1;
  }

  private getEmotionTrendRecommendations(trend: TrendAnalysis): string[] {
    if (trend.direction === 'decreasing') {
      return [
        'Increase positive reinforcement strategies',
        'Review environmental factors that may be contributing to stress',
        'Consider additional sensory support tools',
        'Schedule more frequent check-ins'
      ];
    } else if (trend.direction === 'increasing') {
      return [
        'Continue current successful strategies',
        'Document what is working well',
        'Gradually introduce new challenges',
        'Share progress with student and family'
      ];
    }
    return [
      'Monitor for changes in patterns',
      'Maintain current support level',
      'Be prepared to adjust strategies as needed'
    ];
  }

  private getSensoryTrendRecommendations(trend: TrendAnalysis): string[] {
    if (trend.rate > 0) { // Increasing seeking
      return [
        'Provide more structured sensory breaks',
        'Introduce additional sensory tools',
        'Consider sensory diet adjustments',
        'Monitor for overstimulation'
      ];
    } else if (trend.rate < 0) { // Increasing avoiding
      return [
        'Reduce environmental stimuli',
        'Provide more quiet spaces',
        'Gradually reintroduce sensory experiences',
        'Focus on calming strategies'
      ];
    }
    return [
      'Maintain current sensory support level',
      'Continue monitoring sensory preferences',
      'Be responsive to daily variations'
    ];
  }

  private getGoalRecommendations(goal: Goal, trend: TrendAnalysis, estimatedDays: number): string[] {
    if (estimatedDays < 0) {
      return [
        'Review and adjust goal strategies',
        'Break goal into smaller milestones',
        'Identify and address barriers',
        'Consider modifying timeline or approach'
      ];
    } else if (estimatedDays > 90) {
      return [
        'Increase intervention frequency',
        'Add additional support strategies',
        'Review goal expectations',
        'Provide more immediate reinforcement'
      ];
    }
    return [
      'Continue current approach',
      'Monitor progress regularly',
      'Celebrate milestones reached',
      'Maintain consistent support'
    ];
  }

  private getAnomalyRecommendations(type: string, context: string, severity: number): string[] {
    if (type === 'emotion') {
      return [
        'Investigate potential triggers for this emotional spike',
        'Provide immediate support and coping strategies',
        'Monitor closely for additional unusual patterns',
        'Consider environmental or schedule changes'
      ];
    } else if (type === 'sensory') {
      return [
        'Review sensory environment for unusual factors',
        'Check for changes in routine or schedule',
        'Provide additional sensory regulation support',
        'Monitor for illness or other physical factors'
      ];
    }
    return [
      'Investigate potential causes',
      'Provide additional support',
      'Monitor closely',
      'Document and track patterns'
    ];
  }

  private getTrendSeverity(trend: TrendAnalysis): 'low' | 'medium' | 'high' {
    if (trend.direction === 'decreasing' && trend.significance > 0.7) return 'high';
    if (trend.direction === 'decreasing' && trend.significance > 0.4) return 'medium';
    return 'low';
  }

  private getMLEmotionRecommendations(predictions: EmotionPrediction[], trend: string): string[] {
    const highAnxietyDays = predictions.filter(p => p.emotions.anxious > 7).length;
    const lowPositiveDays = predictions.filter(p => p.emotions.happy < 3 && p.emotions.calm < 3).length;

    const recommendations: string[] = [];

    if (highAnxietyDays >= 3) {
      recommendations.push('ML predicts elevated anxiety - implement proactive calming strategies');
      recommendations.push('Schedule additional check-ins on high-anxiety days');
    }

    if (lowPositiveDays >= 4) {
      recommendations.push('ML indicates low positive emotions upcoming - increase engagement activities');
      recommendations.push('Prepare mood-boosting interventions');
    }

    if (trend === 'increasing') {
      recommendations.push('ML shows increasing emotional intensity - monitor for triggers');
    } else if (trend === 'decreasing') {
      recommendations.push('ML shows decreasing emotional engagement - check for withdrawal signs');
    }

    recommendations.push('Compare ML predictions with actual outcomes to refine models');

    return recommendations;
  }

  private getMLSensoryRecommendations(prediction: SensoryPrediction): string[] {
    const recommendations: string[] = [];

    // Check each sensory modality
    Object.entries(prediction.sensoryResponse).forEach(([sense, response]) => {
      if (response.avoiding > 0.7) {
        recommendations.push(`High ${sense} avoidance predicted - minimize ${sense} stimuli`);
      } else if (response.seeking > 0.7) {
        recommendations.push(`High ${sense} seeking predicted - provide ${sense} input opportunities`);
      }
    });

    // Environmental trigger recommendations
    prediction.environmentalTriggers.forEach(trigger => {
      if (trigger.probability > 0.7) {
        recommendations.push(`High probability of reaction to ${trigger.trigger} - prepare alternatives`);
      }
    });

    return recommendations;
  }

  // Baseline analysis using ML clustering
  async analyzeBaseline(trackingEntries: TrackingEntry[]): Promise<BaselineCluster[]> {
    if (!this.mlModelsInitialized || trackingEntries.length < 10) {
      return [];
    }

    try {
      const clusters = await mlModels.performBaselineClustering(trackingEntries, 3);
      return clusters;
    } catch (error) {
      logger.error('Baseline clustering failed:', error);
      return [];
    }
  }
}

export const enhancedPatternAnalysis = new EnhancedPatternAnalysisEngine();