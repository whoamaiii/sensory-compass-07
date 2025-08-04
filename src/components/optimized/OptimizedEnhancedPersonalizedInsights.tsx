import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EmotionEntry, SensoryEntry, TrackingEntry, Student } from '@/types/student';
import { enhancedPatternAnalysis, PredictiveInsight, AnomalyDetection as Anomaly } from '@/lib/enhancedPatternAnalysis';
import { patternAnalysis, PatternResult as Pattern } from '@/lib/patternAnalysis';
import { differenceInDays, format, subDays } from 'date-fns';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Eye,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Heart,
  Shield
} from 'lucide-react';
import { useOptimizedMemo, useAsyncMemo } from '@/hooks/useOptimizedMemo';
import { OptimizedAnimatedCounter } from './OptimizedAnimatedCounter';

const useDashboardMetrics = (filteredData) => {
  return useOptimizedMemo(() => {
    const totalDays = differenceInDays(new Date(), filteredData.emotions[0]?.timestamp || new Date());
    const avgDailyEmotions = filteredData.emotions.length / Math.max(1, totalDays);
    const avgEmotionIntensity = filteredData.emotions.reduce((sum, e) => sum + e.intensity, 0) / Math.max(1, filteredData.emotions.length);
    const recentWeek = filteredData.emotions.filter(e => e.timestamp >= subDays(new Date(), 7));
    const recentAvgIntensity = recentWeek.reduce((sum, e) => sum + e.intensity, 0) / Math.max(1, recentWeek.length);
    const intensityTrend = recentAvgIntensity - avgEmotionIntensity;
    return {
      dataConsistency: Math.min(100, (avgDailyEmotions / 3) * 100),
      emotionalStability: Math.max(0, 100 - (avgEmotionIntensity * 20)),
      intensityTrend,
      totalDataPoints: filteredData.emotions.length + filteredData.sensoryInputs.length
    };
  }, [filteredData], 'progressMetrics');
};

interface EnhancedPersonalizedInsightsProps {
  student: Student;
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
}

export const OptimizedEnhancedPersonalizedInsights: React.FC<EnhancedPersonalizedInsightsProps> = ({
  student,
  emotions,
  sensoryInputs,
  trackingEntries
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const filteredData = useOptimizedMemo(() => {
    const cutoff = subDays(new Date(), selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90);
    return {
      emotions: emotions.filter(e => e.timestamp >= cutoff),
      sensoryInputs: sensoryInputs.filter(s => s.timestamp >= cutoff),
      trackingEntries: trackingEntries.filter(t => t.timestamp >= cutoff)
    };
  }, [emotions, sensoryInputs, trackingEntries, selectedTimeframe], 'filteredData');

  const { data: insights, loading: insightsLoading } = useAsyncMemo<{
    predictiveInsights: PredictiveInsight[];
    anomalies: Anomaly[];
    emotionPatterns: Pattern[];
    sensoryPatterns: Pattern[];
  } | null>(async () => {
    if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) {
      return null;
    }
    const [predictiveInsights, anomalies] = await Promise.all([
      enhancedPatternAnalysis.generatePredictiveInsights(filteredData.emotions, filteredData.sensoryInputs, filteredData.trackingEntries),
      enhancedPatternAnalysis.detectAnomalies(filteredData.emotions, filteredData.sensoryInputs, filteredData.trackingEntries)
    ]);
    return {
      predictiveInsights,
      anomalies,
      emotionPatterns: patternAnalysis.analyzeEmotionPatterns(filteredData.emotions),
      sensoryPatterns: patternAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs)
    };
  }, [filteredData], null);
  
  const personalStrengths = useOptimizedMemo(() => {
    const strengths = [];
    const positiveEmotions = filteredData.emotions.filter(e =>
      ['happy', 'calm', 'focused', 'proud', 'excited'].includes(e.emotion.toLowerCase())
    );
    if (positiveEmotions.length > filteredData.emotions.length * 0.6) {
      strengths.push({
        title: 'Emotional Resilience',
        description: `${student.name} maintains positive emotions ${Math.round(positiveEmotions.length / filteredData.emotions.length * 100)}% of the time`,
        icon: Heart,
        confidence: 0.8
      });
    }
    const consistentSensory = filteredData.sensoryInputs.filter(s =>
      s.response.toLowerCase().includes('appropriate') ||
      s.response.toLowerCase().includes('comfortable')
    );
    if (consistentSensory.length > filteredData.sensoryInputs.length * 0.5) {
      strengths.push({
        title: 'Sensory Self-Regulation',
        description: `Shows good sensory processing in ${Math.round(consistentSensory.length / filteredData.sensoryInputs.length * 100)}% of situations`,
        icon: Shield,
        confidence: 0.7
      });
    }
    return strengths;
  }, [filteredData, student.name], 'personalStrengths');

  const growthOpportunities = useOptimizedMemo(() => {
    const opportunities = [];
    const challengingEmotions = filteredData.emotions.filter(e =>
      e.intensity >= 4 && ['anxious', 'frustrated', 'overwhelmed'].includes(e.emotion.toLowerCase())
    );
    if (challengingEmotions.length > 0) {
      opportunities.push({
        title: 'Stress Management',
        description: `Opportunities to develop coping strategies for high-intensity emotions`,
        recommendations: [
          'Practice deep breathing exercises',
          'Implement sensory breaks',
          'Create calm-down strategies'
        ],
        priority: 'high'
      });
    }
    const sensorySeekingCount = filteredData.sensoryInputs.filter(s =>
      s.response.toLowerCase().includes('seeking')
    ).length;
    if (sensorySeekingCount > filteredData.sensoryInputs.length * 0.7) {
      opportunities.push({
        title: 'Sensory Regulation',
        description: `High sensory seeking behavior suggests need for structured sensory input`,
        recommendations: [
          'Schedule regular sensory breaks',
          'Provide fidget tools',
          'Create sensory-rich learning activities'
        ],
        priority: 'medium'
      });
    }
    return opportunities;
  }, [filteredData], 'growthOpportunities');

  const progressMetrics = useDashboardMetrics(filteredData);
  
  if (insightsLoading) {
    return <div>Loading insights...</div>
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Personalized Insights for {student.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Activity className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">Start tracking emotions and sensory inputs to generate personalized insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Personalized Insights for {student.name}
            </CardTitle>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((timeframe) => (
                <Button
                  key={timeframe}
                  variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe)}
                >
                  {timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary"><OptimizedAnimatedCounter value={progressMetrics.totalDataPoints} /></div>
              <div className="text-sm text-muted-foreground">Total Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary"><OptimizedAnimatedCounter value={Math.round(progressMetrics.dataConsistency)} />%</div>
              <div className="text-sm text-muted-foreground">Data Consistency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary"><OptimizedAnimatedCounter value={Math.round(progressMetrics.emotionalStability)} />%</div>
              <div className="text-sm text-muted-foreground">Emotional Stability</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-primary">
                  {progressMetrics.intensityTrend > 0 ? '+' : ''}{progressMetrics.intensityTrend.toFixed(1)}
                </span>
                {progressMetrics.intensityTrend > 0 ? 
                  <TrendingUp className="h-4 w-4 text-red-500" /> : 
                  <TrendingDown className="h-4 w-4 text-green-500" />
                }
              </div>
              <div className="text-sm text-muted-foreground">Intensity Trend</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="growth">Growth Areas</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="anomalies">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights.predictiveInsights.length > 0 ? (
            insights.predictiveInsights.map((insight, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        {insight.type === 'prediction' ? <Target className="h-4 w-4 text-primary" /> :
                         insight.type === 'trend' ? <TrendingUp className="h-4 w-4 text-primary" /> :
                         insight.type === 'risk' ? <AlertTriangle className="h-4 w-4 text-orange-500" /> :
                         <Lightbulb className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                        {insight.prediction && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                            <div className="text-sm font-medium">
                              Forecast: {insight.prediction.value.toFixed(1)} 
                              <Badge variant="outline" className="ml-2">
                                {insight.prediction.trend}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {insight.recommendations.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {insight.recommendations.map((rec, recIndex) => (
                                <li key={recIndex} className="flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={insight.confidence > 0.7 ? 'default' : 'outline'}
                        className={
                          insight.confidence > 0.7 ? 'bg-green-100 text-green-800' :
                          insight.confidence > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                       <OptimizedAnimatedCounter value={Math.round(insight.confidence * 100)} />% confidence
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {insight.timeframe}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Continue collecting data to generate predictive insights</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="strengths" className="space-y-4">
          {personalStrengths.length > 0 ? (
            personalStrengths.map((strength, index) => (
              <Card key={index} className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <strength.icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{strength.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{strength.description}</p>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Strength Level:</span>
                          <Progress value={strength.confidence * 100} className="w-24 h-2" />
                          <span className="text-xs font-medium"><OptimizedAnimatedCounter value={Math.round(strength.confidence * 100)} />%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Strengths will be identified as patterns emerge from data collection</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          {growthOpportunities.length > 0 ? (
            growthOpportunities.map((opportunity, index) => (
              <Card key={index} className={`border-l-4 ${
                opportunity.priority === 'high' ? 'border-l-orange-500' :
                opportunity.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      opportunity.priority === 'high' ? 'bg-orange-100' :
                      opportunity.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <Target className={`h-4 w-4 ${
                        opportunity.priority === 'high' ? 'text-orange-600' :
                        opportunity.priority === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{opportunity.title}</h4>
                        <Badge variant={
                          opportunity.priority === 'high' ? 'destructive' :
                          opportunity.priority === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {opportunity.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{opportunity.description}</p>
                      {opportunity.recommendations.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-2">Action Steps:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {opportunity.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Growth opportunities will be identified based on data patterns</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {(insights.emotionPatterns.length > 0 || insights.sensoryPatterns.length > 0) ? (
            <>
              {insights.emotionPatterns.map((pattern, index) => (
                <Card key={`emotion-${index}`} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold">Emotional Pattern: {pattern.pattern.replace('-', ' ')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">
                           <OptimizedAnimatedCounter value={Math.round(pattern.confidence * 100)} />% confidence
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pattern.dataPoints} data points
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {insights.sensoryPatterns.map((pattern, index) => (
                <Card key={`sensory-${index}`} className="border-l-4 border-l-cyan-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-cyan-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold">Sensory Pattern: {pattern.pattern.replace('-', ' ')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">
                           <OptimizedAnimatedCounter value={Math.round(pattern.confidence * 100)} />% confidence
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pattern.dataPoints} data points
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Patterns will emerge as more data is collected</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {insights.anomalies.length > 0 ? (
            insights.anomalies.map((anomaly, index) => (
              <Card key={index} className={`border-l-4 ${
                anomaly.severity === 'high' ? 'border-l-red-500' :
                anomaly.severity === 'medium' ? 'border-l-orange-500' :
                'border-l-yellow-500'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      anomaly.severity === 'high' ? 'text-red-500' :
                      anomaly.severity === 'medium' ? 'text-orange-500' :
                      'text-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{anomaly.description}</h4>
                        <Badge variant={
                          anomaly.severity === 'high' ? 'destructive' :
                          anomaly.severity === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {anomaly.severity} severity
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(anomaly.timestamp, 'MMM dd, yyyy - HH:mm')}
                      </p>
                      {anomaly.recommendations.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {anomaly.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No significant anomalies detected in recent data</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};