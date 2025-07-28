import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  ScatterChart,
  Scatter,
  Cell,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { EmotionEntry, SensoryEntry, TrackingEntry } from "@/types/student";
import { enhancedPatternAnalysis, CorrelationMatrix, PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import { patternAnalysis, PatternResult } from "@/lib/patternAnalysis";
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Zap,
  Target,
  Eye,
  Brain,
  Thermometer,
  Volume2,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Lightbulb,
  Shield,
  Clock
} from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";

interface InteractiveDataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  studentName: string;
}

type ChartType = 'line' | 'area' | 'scatter' | 'composed';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export const InteractiveDataVisualization = ({ 
  emotions, 
  sensoryInputs, 
  trackingEntries, 
  studentName 
}: InteractiveDataVisualizationProps) => {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(['all']);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoff = selectedTimeRange === '7d' ? subDays(now, 7) :
                   selectedTimeRange === '30d' ? subDays(now, 30) :
                   selectedTimeRange === '90d' ? subDays(now, 90) : null;

    return {
      emotions: cutoff ? emotions.filter(e => e.timestamp >= cutoff) : emotions,
      sensoryInputs: cutoff ? sensoryInputs.filter(s => s.timestamp >= cutoff) : sensoryInputs,
      trackingEntries: cutoff ? trackingEntries.filter(t => t.timestamp >= cutoff) : trackingEntries
    };
  }, [emotions, sensoryInputs, trackingEntries, selectedTimeRange]);

  // Process data for charts
  const chartData = useMemo(() => {
    const dataMap = new Map<string, any>();

    // Process emotions
    filteredData.emotions.forEach(emotion => {
      const date = format(emotion.timestamp, 'yyyy-MM-dd');
      if (!dataMap.has(date)) {
        dataMap.set(date, { 
          date, 
          timestamp: emotion.timestamp,
          emotionCount: 0,
          avgEmotionIntensity: 0,
          positiveEmotions: 0,
          negativeEmotions: 0,
          sensorySeekingCount: 0,
          sensoryAvoidingCount: 0,
          totalSensoryInputs: 0
        });
      }
      
      const data = dataMap.get(date);
      data.emotionCount++;
      data.avgEmotionIntensity = ((data.avgEmotionIntensity * (data.emotionCount - 1)) + emotion.intensity) / data.emotionCount;
      
      if (['happy', 'calm', 'focused', 'excited', 'proud'].includes(emotion.emotion.toLowerCase())) {
        data.positiveEmotions++;
      } else if (['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed'].includes(emotion.emotion.toLowerCase())) {
        data.negativeEmotions++;
      }
      
      data[emotion.emotion] = (data[emotion.emotion] || 0) + emotion.intensity;
    });

    // Process sensory inputs
    filteredData.sensoryInputs.forEach(sensory => {
      const date = format(sensory.timestamp, 'yyyy-MM-dd');
      if (!dataMap.has(date)) {
        dataMap.set(date, { 
          date, 
          timestamp: sensory.timestamp,
          emotionCount: 0,
          avgEmotionIntensity: 0,
          positiveEmotions: 0,
          negativeEmotions: 0,
          sensorySeekingCount: 0,
          sensoryAvoidingCount: 0,
          totalSensoryInputs: 0
        });
      }
      
      const data = dataMap.get(date);
      data.totalSensoryInputs++;
      
      if (sensory.response.toLowerCase().includes('seeking')) {
        data.sensorySeekingCount++;
      } else if (sensory.response.toLowerCase().includes('avoiding')) {
        data.sensoryAvoidingCount++;
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredData]);

  // Pattern analysis effect
  useEffect(() => {
    const analyzePatterns = async () => {
      if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0) return;
      
      setIsAnalyzing(true);
      
      try {
        // Basic pattern analysis
        const emotionPatterns = patternAnalysis.analyzeEmotionPatterns(filteredData.emotions);
        const sensoryPatterns = patternAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs);
        const allPatterns = [...emotionPatterns, ...sensoryPatterns];
        setPatterns(allPatterns);

        // Enhanced pattern analysis
        if (filteredData.trackingEntries.length >= 5) {
          const insights = enhancedPatternAnalysis.generatePredictiveInsights(
            filteredData.emotions,
            filteredData.sensoryInputs,
            filteredData.trackingEntries,
            [] // No goals for now
          );
          setPredictiveInsights(insights);

          const detectedAnomalies = enhancedPatternAnalysis.detectAnomalies(
            filteredData.emotions,
            filteredData.sensoryInputs,
            filteredData.trackingEntries
          );
          setAnomalies(detectedAnomalies);
        }

        // Generate correlation matrix
        if (filteredData.trackingEntries.length >= 10) {
          const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(filteredData.trackingEntries);
          setCorrelationMatrix(matrix);
        }
      } catch (error) {
        console.error('Pattern analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzePatterns();
  }, [filteredData]);

  // Get unique emotions for filter
  const uniqueEmotions = useMemo(() => {
    const emotions = [...new Set(filteredData.emotions.map(e => e.emotion))];
    return ['all', ...emotions];
  }, [filteredData.emotions]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No data available for selected time range</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (selectedChartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              <Area 
                type="monotone" 
                dataKey="avgEmotionIntensity" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)"
                name="Avg Emotion Intensity"
              />
              <Area 
                type="monotone" 
                dataKey="positiveEmotions" 
                stroke="hsl(142 76% 36%)" 
                fill="hsl(142 76% 36% / 0.2)"
                name="Positive Emotions"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number"
                dataKey="avgEmotionIntensity" 
                name="Avg Emotion Intensity"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="number"
                dataKey="totalSensoryInputs" 
                name="Sensory Inputs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter 
                name="Daily Data Points" 
                dataKey="totalSensoryInputs" 
                fill="hsl(var(--primary))"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              <Bar 
                yAxisId="left"
                dataKey="positiveEmotions" 
                fill="hsl(142 76% 36%)" 
                name="Positive Emotions"
              />
              <Bar 
                yAxisId="left"
                dataKey="negativeEmotions" 
                fill="hsl(0 72% 51%)" 
                name="Negative Emotions"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgEmotionIntensity" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Avg Intensity"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              <Line 
                type="monotone" 
                dataKey="avgEmotionIntensity" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Avg Emotion Intensity"
              />
              <Line 
                type="monotone" 
                dataKey="positiveEmotions" 
                stroke="hsl(142 76% 36%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Positive Emotions"
              />
              <Line 
                type="monotone" 
                dataKey="negativeEmotions" 
                stroke="hsl(0 72% 51%)" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Negative Emotions"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderCorrelationHeatmap = () => {
    if (!correlationMatrix) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Insufficient data for correlation analysis</p>
            <p className="text-sm">At least 10 tracking entries needed</p>
          </div>
        </div>
      );
    }

    const cellSize = 40;
    const padding = 100;

    return (
      <div className="overflow-x-auto">
        <svg 
          width={correlationMatrix.factors.length * cellSize + padding * 2} 
          height={correlationMatrix.factors.length * cellSize + padding * 2}
          className="font-dyslexia"
        >
          {/* Factor labels - Y axis */}
          {correlationMatrix.factors.map((factor, i) => (
            <text
              key={`y-${factor}`}
              x={padding - 10}
              y={padding + i * cellSize + cellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-foreground"
            >
              {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </text>
          ))}

          {/* Factor labels - X axis */}
          {correlationMatrix.factors.map((factor, i) => (
            <text
              key={`x-${factor}`}
              x={padding + i * cellSize + cellSize / 2}
              y={padding - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-foreground"
              transform={`rotate(-45 ${padding + i * cellSize + cellSize / 2} ${padding - 10})`}
            >
              {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </text>
          ))}

          {/* Correlation cells */}
          {correlationMatrix.matrix.map((row, i) =>
            row.map((correlation, j) => {
              const intensity = Math.abs(correlation);
              const isPositive = correlation > 0;
              const opacity = intensity;
              
              return (
                <g key={`cell-${i}-${j}`}>
                  <rect
                    x={padding + j * cellSize}
                    y={padding + i * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={isPositive ? 'hsl(142 76% 36%)' : 'hsl(0 72% 51%)'}
                    fillOpacity={opacity}
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  <text
                    x={padding + j * cellSize + cellSize / 2}
                    y={padding + i * cellSize + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-foreground font-medium"
                  >
                    {correlation.toFixed(2)}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    );
  };

  const getPatternIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'emotion': return <Brain className="h-4 w-4" />;
      case 'sensory': return <Eye className="h-4 w-4" />;
      case 'environmental': return <Thermometer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const renderPatternAnalysis = () => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Activity className="h-16 w-16 mx-auto animate-pulse text-primary" />
            <p>Analyzing patterns...</p>
            <Progress value={66} className="w-48" />
          </div>
        </div>
      );
    }

    if (patterns.length === 0 && predictiveInsights.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No patterns detected yet</p>
            <p className="text-sm">Need more data for pattern analysis</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Detected Patterns */}
        {patterns.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Detected Patterns ({patterns.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pattern, index) => (
                <Card key={index} className="bg-gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getPatternIcon(pattern.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{pattern.type} Pattern</h4>
                          <Badge className={getConfidenceColor(pattern.confidence)}>
                            {Math.round(pattern.confidence * 100)}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Frequency: {pattern.frequency} occurrences
                        </p>
                        {pattern.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Recommendations:</p>
                            {pattern.recommendations.slice(0, 2).map((rec, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {rec}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Predictive Insights */}
        {predictiveInsights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Predictive Insights ({predictiveInsights.length})
            </h3>
            <div className="space-y-4">
              {predictiveInsights.map((insight, index) => (
                <Card key={index} className="bg-gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        {insight.severity === 'high' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : insight.severity === 'medium' ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="outline">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>

                        {insight.prediction && (
                          <div className="mb-2">
                            <p className="text-sm font-medium mb-1">Prediction:</p>
                            <div className="flex items-center gap-2 text-sm">
                              {insight.prediction.trend === 'increasing' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : insight.prediction.trend === 'decreasing' ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <Activity className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="capitalize">{insight.prediction.trend}</span>
                              <span className="text-muted-foreground">
                                (Accuracy: {Math.round(insight.prediction.accuracy * 100)}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {insight.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Recommendations:</p>
                            {insight.recommendations.slice(0, 3).map((rec, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {rec}
                              </p>
                            ))}
                          </div>
                        )}

                        {insight.severity && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Severity: <span className="font-medium capitalize">{insight.severity}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detected Anomalies ({anomalies.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anomalies.map((anomaly, index) => (
                <Card key={index} className="bg-gradient-card border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{anomaly.type} Anomaly</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Severity: <span className="font-medium capitalize">{anomaly.severity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(anomaly.timestamp, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-dyslexia">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Interactive Data Analysis - {studentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select value={selectedChartType} onValueChange={(value: ChartType) => setSelectedChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                  <SelectItem value="composed">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={selectedTimeRange} onValueChange={(value: TimeRange) => setSelectedTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-8">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {filteredData.emotions.length} emotions
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {filteredData.sensoryInputs.length} sensory inputs
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {filteredData.trackingEntries.length} sessions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="correlations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Correlations
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emotion & Sensory Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Emotion Intensity</p>
                    <p className="text-2xl font-bold">
                      {filteredData.emotions.length > 0 
                        ? (filteredData.emotions.reduce((sum, e) => sum + e.intensity, 0) / filteredData.emotions.length).toFixed(1)
                        : '0'
                      }
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Positive Emotion Rate</p>
                    <p className="text-2xl font-bold">
                      {filteredData.emotions.length > 0 
                        ? Math.round((filteredData.emotions.filter(e => 
                            ['happy', 'calm', 'focused', 'excited', 'proud'].includes(e.emotion.toLowerCase())
                          ).length / filteredData.emotions.length) * 100)
                        : 0
                      }%
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sensory Seeking Rate</p>
                    <p className="text-2xl font-bold">
                      {filteredData.sensoryInputs.length > 0 
                        ? Math.round((filteredData.sensoryInputs.filter(s => 
                            s.response.toLowerCase().includes('seeking')
                          ).length / filteredData.sensoryInputs.length) * 100)
                        : 0
                      }%
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Relationships between emotional, sensory, and environmental factors
              </p>
            </CardHeader>
            <CardContent>
              {renderCorrelationHeatmap()}
            </CardContent>
          </Card>

          {/* Significant Correlations */}
          {correlationMatrix && correlationMatrix.significantPairs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Significant Correlations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {correlationMatrix.significantPairs.slice(0, 5).map((pair, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">
                          {pair.factor1.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ↔{' '}
                          {pair.factor2.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pair.correlation > 0 ? 'Positive' : 'Negative'} correlation (r = {pair.correlation.toFixed(3)})
                        </p>
                      </div>
                      <Badge variant={pair.significance === 'high' ? 'default' : 'outline'}>
                        {pair.significance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Pattern Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPatternAnalysis()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};