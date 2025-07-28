import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertManager } from "@/components/AlertManager";
import { DataVisualization } from "@/components/DataVisualization";
import { DateRangeSelector, TimeRange } from "@/components/DateRangeSelector";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Brain,
  Eye,
  Clock,
  BarChart3
} from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { patternAnalysis, PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { alertSystem } from "@/lib/alertSystem";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { startOfDay, endOfDay, subDays } from "date-fns";

interface AnalyticsDashboardProps {
  student: Student;
  trackingEntries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
}

export const AnalyticsDashboard = ({ 
  student, 
  trackingEntries, 
  emotions, 
  sensoryInputs 
}: AnalyticsDashboardProps) => {
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { selectedRange, filteredData, handleRangeChange } = useDataFiltering(
    trackingEntries,
    emotions,
    sensoryInputs
  );

  useEffect(() => {
    analyzePatterns();
  }, [filteredData]);

  const analyzePatterns = async () => {
    setIsAnalyzing(true);
    
    try {
      // Analyze emotion patterns
      const emotionPatterns = patternAnalysis.analyzeEmotionPatterns(
        filteredData.emotions,
        30
      );

      // Analyze sensory patterns
      const sensoryPatterns = patternAnalysis.analyzeSensoryPatterns(
        filteredData.sensoryInputs,
        30
      );

      // Analyze environmental correlations
      const environmentalCorrelations = patternAnalysis.analyzeEnvironmentalCorrelations(
        filteredData.entries
      );

      // Generate insights
      const generatedInsights = generateInsights(
        emotionPatterns,
        sensoryPatterns,
        environmentalCorrelations,
        filteredData
      );

      setPatterns([...emotionPatterns, ...sensoryPatterns]);
      setCorrelations(environmentalCorrelations);
      setInsights(generatedInsights);

      // Generate alerts for the student
      alertSystem.generateAlertsForStudent(
        student,
        filteredData.emotions,
        filteredData.sensoryInputs,
        filteredData.entries
      );

    } catch (error) {
      console.error('Error analyzing patterns:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateInsights = (
    emotionPatterns: PatternResult[],
    sensoryPatterns: PatternResult[],
    correlations: CorrelationResult[],
    data: any
  ): string[] => {
    const insights: string[] = [];

    // Data availability insight
    if (data.entries.length < 5) {
      insights.push(
        `Limited data available (${data.entries.length} sessions). Consider collecting more tracking sessions for better pattern analysis.`
      );
    }

    // Emotion insights
    const highConfidenceEmotionPatterns = emotionPatterns.filter(p => p.confidence > 0.7);
    if (highConfidenceEmotionPatterns.length > 0) {
      const pattern = highConfidenceEmotionPatterns[0];
      insights.push(
        `Strong ${pattern.pattern.replace('-', ' ')} pattern detected with ${Math.round(pattern.confidence * 100)}% confidence.`
      );
    }

    // Sensory insights
    const highConfidenceSensoryPatterns = sensoryPatterns.filter(p => p.confidence > 0.6);
    if (highConfidenceSensoryPatterns.length > 0) {
      const pattern = highConfidenceSensoryPatterns[0];
      insights.push(
        `${pattern.description} - consider implementing the recommended strategies.`
      );
    }

    // Correlation insights
    const strongCorrelations = correlations.filter(c => c.significance === 'high');
    if (strongCorrelations.length > 0) {
      strongCorrelations.forEach(correlation => {
        insights.push(
          `Strong correlation found: ${correlation.description}`
        );
      });
    }

    // Progress insights
    const recentEmotions = data.emotions.filter((e: EmotionEntry) => 
      e.timestamp >= subDays(new Date(), 7)
    );
    const positiveEmotions = recentEmotions.filter((e: EmotionEntry) => 
      ['happy', 'calm', 'focused', 'proud', 'content'].includes(e.emotion.toLowerCase())
    );

    if (recentEmotions.length > 0) {
      const positiveRate = positiveEmotions.length / recentEmotions.length;
      if (positiveRate > 0.6) {
        insights.push(
          `Positive trend: ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`
        );
      } else if (positiveRate < 0.3) {
        insights.push(
          `Consider reviewing current strategies - only ${Math.round(positiveRate * 100)}% of recent emotions have been positive.`
        );
      }
    }

    return insights.length > 0 ? insights : [
      'Continue collecting data to identify meaningful patterns and insights.'
    ];
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'emotion':
        return <Brain className="h-4 w-4" />;
      case 'sensory':
        return <Eye className="h-4 w-4" />;
      case 'environmental':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.4) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard - {student.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeSelector
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{filteredData.entries.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emotions Tracked</p>
                <p className="text-2xl font-bold">{filteredData.emotions.length}</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sensory Inputs</p>
                <p className="text-2xl font-bold">{filteredData.sensoryInputs.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patterns Found</p>
                <p className="text-2xl font-bold">{patterns.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="visualizations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visualizations">Charts</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizations" className="space-y-6">
          <DataVisualization
            emotions={filteredData.emotions}
            sensoryInputs={filteredData.sensoryInputs}
            studentName={student.name}
          />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Behavioral Patterns</CardTitle>
              <Button 
                variant="outline" 
                onClick={analyzePatterns}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant patterns detected yet.</p>
                  <p className="text-sm">More data may be needed for pattern analysis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patterns.map((pattern, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getPatternIcon(pattern.type)}
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">
                                {pattern.pattern.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {pattern.description}
                              </p>
                              {pattern.recommendations && (
                                <div className="mt-3">
                                  <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {pattern.recommendations.map((rec, recIndex) => (
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
                          <div className="text-right">
                            <Badge variant="outline" className={getConfidenceColor(pattern.confidence)}>
                              {Math.round(pattern.confidence * 100)}% confidence
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {pattern.dataPoints} data points
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights Section */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <p className="text-muted-foreground">No insights available yet.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground">{insight}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environmental Correlations</CardTitle>
            </CardHeader>
            <CardContent>
              {correlations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant correlations found.</p>
                  <p className="text-sm">Environmental data may be needed for correlation analysis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {correlations.map((correlation, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {correlation.factor1} ↔ {correlation.factor2}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {correlation.description}
                            </p>
                            {correlation.recommendations && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {correlation.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex} className="flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={correlation.significance === 'high' ? 'default' : 'outline'}
                            >
                              {correlation.significance} significance
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              r = {correlation.correlation.toFixed(3)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertManager studentId={student.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};