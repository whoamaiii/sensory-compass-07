import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { EmotionEntry, SensoryEntry, TrackingEntry, Student } from "@/types/student";
import { enhancedPatternAnalysis, CorrelationMatrix, PredictiveInsight, AnomalyDetection } from "@/lib/enhancedPatternAnalysis";
import { patternAnalysis, PatternResult } from "@/lib/patternAnalysis";
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { DetailedConfidenceExplanation } from '@/components/DetailedConfidenceExplanation';
import { differenceInDays } from 'date-fns';
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
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Maximize2,
  Grid3x3,
  Focus,
  Columns,
  PictureInPicture2,
  Filter,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff
} from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";
import { analyticsExport, ExportFormat, AnalyticsExportData } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Import new components
import { Visualization3D } from './Visualization3D';
import { TimelineVisualization } from './TimelineVisualization';
import { AdvancedFilterPanel, FilterCriteria, applyFilters } from './AdvancedFilterPanel';
import { useRealtimeData, RealtimeDataReturn } from '@/hooks/useRealtimeData';

interface InteractiveDataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  studentName: string;
}

type ChartType = 'line' | 'area' | 'scatter' | 'composed';
type TimeRange = '7d' | '30d' | '90d' | 'all';
type LayoutMode = 'grid' | 'focus' | 'comparison' | 'dashboard';
type VisualizationType = 'trends' | 'correlations' | 'patterns' | '3d' | 'timeline';

interface HighlightState {
  type: 'emotion' | 'sensory' | 'tracking' | 'anomaly' | null;
  id: string | null;
  relatedIds: string[];
}

export const InteractiveDataVisualization = ({ 
  emotions: initialEmotions, 
  sensoryInputs: initialSensoryInputs, 
  trackingEntries: initialTrackingEntries, 
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
  const [isExporting, setIsExporting] = useState(false);
  
  // New state for advanced features
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dashboard');
  const [focusedVisualization, setFocusedVisualization] = useState<VisualizationType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [highlightState, setHighlightState] = useState<HighlightState>({ type: null, id: null, relatedIds: [] });
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    dateRange: { start: null, end: null },
    emotions: { types: [], intensityRange: [0, 10], includeTriggers: [], excludeTriggers: [] },
    sensory: { types: [], responses: [], intensityRange: [0, 10] },
    environmental: {
      locations: [],
      activities: [],
      conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
      weather: [],
      timeOfDay: []
    },
    patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
    realtime: false
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedVisualizations, setSelectedVisualizations] = useState<VisualizationType[]>(['trends', 'patterns']);
  
  // Refs for chart elements
  const containerRef = useRef<HTMLDivElement>(null);
  const trendsChartRef = useRef<HTMLDivElement>(null);
  const correlationChartRef = useRef<HTMLDivElement>(null);
  const patternsChartRef = useRef<HTMLDivElement>(null);

  // Real-time data hook
  const realtimeData = useRealtimeData(
    {
      emotions: initialEmotions,
      sensoryInputs: initialSensoryInputs,
      trackingEntries: initialTrackingEntries
    },
    {
      enabled: filterCriteria.realtime,
      windowSize: selectedTimeRange === '7d' ? 7 * 24 * 60 : 
                  selectedTimeRange === '30d' ? 30 * 24 * 60 : 
                  selectedTimeRange === '90d' ? 90 * 24 * 60 : 0,
      updateInterval: 1000,
      smoothTransitions: true,
      simulateData: true // For demo purposes
    }
  );

  // Use real-time data if enabled, otherwise use initial data
  const emotions = filterCriteria.realtime ? realtimeData.emotions : initialEmotions;
  const sensoryInputs = filterCriteria.realtime ? realtimeData.sensoryInputs : initialSensoryInputs;
  const trackingEntries = filterCriteria.realtime ? realtimeData.trackingEntries : initialTrackingEntries;

  // Apply filters to data
  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoff = selectedTimeRange === '7d' ? subDays(now, 7) :
                   selectedTimeRange === '30d' ? subDays(now, 30) :
                   selectedTimeRange === '90d' ? subDays(now, 90) : null;

    // Apply time range filter first
    let filteredEmotions = cutoff ? emotions.filter(e => e.timestamp >= cutoff) : emotions;
    let filteredSensory = cutoff ? sensoryInputs.filter(s => s.timestamp >= cutoff) : sensoryInputs;
    let filteredTracking = cutoff ? trackingEntries.filter(t => t.timestamp >= cutoff) : trackingEntries;

    // Apply advanced filters
    filteredEmotions = applyFilters(
      filteredEmotions,
      filterCriteria,
      (e) => e,
      null,
      null
    );

    filteredSensory = applyFilters(
      filteredSensory,
      filterCriteria,
      null,
      (s) => s,
      null
    );

    filteredTracking = applyFilters(
      filteredTracking,
      filterCriteria,
      (t) => t.emotions?.[0] || null,
      (t) => t.sensoryInputs?.[0] || null,
      (t) => t.environmentalData || null
    );

    // Apply highlight filter if active
    if (highlightState.type && highlightState.id) {
      // Filter to show only highlighted items and related items
      filteredEmotions = filteredEmotions.filter(e => 
        e.id === highlightState.id || highlightState.relatedIds.includes(e.id)
      );
      filteredSensory = filteredSensory.filter(s => 
        s.id === highlightState.id || highlightState.relatedIds.includes(s.id)
      );
      filteredTracking = filteredTracking.filter(t => 
        t.id === highlightState.id || highlightState.relatedIds.includes(t.id)
      );
    }

    return {
      emotions: filteredEmotions,
      sensoryInputs: filteredSensory,
      trackingEntries: filteredTracking
    };
  }, [emotions, sensoryInputs, trackingEntries, selectedTimeRange, filterCriteria, highlightState]);

  // Process data for charts
  const chartData = useMemo(() => {
    interface ChartDataPoint {
      date: string;
      timestamp: Date;
      emotionCount: number;
      avgEmotionIntensity: number;
      positiveEmotions: number;
      negativeEmotions: number;
      sensorySeekingCount: number;
      sensoryAvoidingCount: number;
      totalSensoryInputs: number;
      [key: string]: string | number | Date;
    }
    const dataMap = new Map<string, ChartDataPoint>();

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
      
      const data = dataMap.get(date)!;
      data.emotionCount++;
      data.avgEmotionIntensity = ((data.avgEmotionIntensity * (data.emotionCount - 1)) + emotion.intensity) / data.emotionCount;
      
      if (['happy', 'calm', 'focused', 'excited', 'proud'].includes(emotion.emotion.toLowerCase())) {
        data.positiveEmotions++;
      } else if (['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed'].includes(emotion.emotion.toLowerCase())) {
        data.negativeEmotions++;
      }
      
      data[emotion.emotion] = ((data[emotion.emotion] as number) || 0) + emotion.intensity;
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
      
      const data = dataMap.get(date)!;
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
          const insights = await enhancedPatternAnalysis.generatePredictiveInsights(
            filteredData.emotions,
            filteredData.sensoryInputs,
            filteredData.trackingEntries,
            []
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

  // Cross-highlighting functions
  const handleHighlight = useCallback((type: HighlightState['type'], id: string) => {
    if (highlightState.id === id) {
      // Clear highlight if clicking the same item
      setHighlightState({ type: null, id: null, relatedIds: [] });
      return;
    }

    // Find related items based on temporal proximity
    const relatedIds: string[] = [];
    const targetItem = type === 'emotion' 
      ? filteredData.emotions.find(e => e.id === id)
      : type === 'sensory'
      ? filteredData.sensoryInputs.find(s => s.id === id)
      : filteredData.trackingEntries.find(t => t.id === id);

    if (targetItem) {
      const targetTime = targetItem.timestamp.getTime();
      const timeWindow = 60 * 60 * 1000; // 1 hour window

      // Find related emotions
      filteredData.emotions.forEach(e => {
        if (e.id !== id && Math.abs(e.timestamp.getTime() - targetTime) < timeWindow) {
          relatedIds.push(e.id);
        }
      });

      // Find related sensory inputs
      filteredData.sensoryInputs.forEach(s => {
        if (s.id !== id && Math.abs(s.timestamp.getTime() - targetTime) < timeWindow) {
          relatedIds.push(s.id);
        }
      });

      // Find related tracking entries
      filteredData.trackingEntries.forEach(t => {
        if (t.id !== id && Math.abs(t.timestamp.getTime() - targetTime) < timeWindow) {
          relatedIds.push(t.id);
        }
      });
    }

    setHighlightState({ type, id, relatedIds });
  }, [filteredData, highlightState.id]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Picture-in-picture simulation (would need actual implementation)
  const togglePictureInPicture = useCallback(() => {
    setIsPictureInPicture(!isPictureInPicture);
    toast.info(isPictureInPicture ? 'Exited picture-in-picture mode' : 'Entered picture-in-picture mode');
  }, [isPictureInPicture]);

  // Layout grid configuration
  const getLayoutClasses = useCallback(() => {
    switch (layoutMode) {
      case 'grid':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      case 'focus':
        return 'space-y-6';
      case 'comparison':
        return 'grid grid-cols-1 xl:grid-cols-2 gap-6';
      case 'dashboard':
      default:
        return 'space-y-6';
    }
  }, [layoutMode]);

  // Render chart based on type
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

  // Export handler
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      // Calculate date range from filtered data
      const allTimestamps = [
        ...filteredData.emotions.map(e => e.timestamp),
        ...filteredData.sensoryInputs.map(s => s.timestamp),
        ...filteredData.trackingEntries.map(t => t.timestamp)
      ].filter(t => t);

      const dateRange = allTimestamps.length > 0 ? {
        start: new Date(Math.min(...allTimestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...allTimestamps.map(t => t.getTime())))
      } : {
        start: new Date(),
        end: new Date()
      };

      // Prepare student data (minimal as we don't have full student object)
      const studentData: Student = {
        id: 'current-student',
        name: studentName,
        grade: '',
        createdAt: new Date(),
        baselineData: {
          emotionalRegulation: {
            averageIntensity: 5,
            mostCommonEmotion: 'neutral',
            triggerFrequency: {}
          },
          sensoryProcessing: {
            seekingBehaviors: {},
            avoidingBehaviors: {},
            preferredSensoryInput: []
          },
          environmentalFactors: {
            optimalConditions: {},
            challengingConditions: []
          },
          collectedDate: new Date(),
          collectedBy: 'System'
        }
      };

      // Prepare export data
      const exportData: AnalyticsExportData = {
        student: studentData,
        dateRange,
        data: {
          entries: filteredData.trackingEntries,
          emotions: filteredData.emotions,
          sensoryInputs: filteredData.sensoryInputs
        },
        analytics: {
          patterns,
          correlations: correlationMatrix?.significantPairs.map(pair => ({
            id: crypto.randomUUID(),
            factor1: pair.factor1,
            factor2: pair.factor2,
            correlation: pair.correlation,
            significance: pair.significance,
            description: `${pair.correlation > 0 ? 'Positive' : 'Negative'} correlation between ${pair.factor1} and ${pair.factor2}`,
            dataPoints: filteredData.trackingEntries.length,
            recommendations: []
          })) || [],
          insights: patterns.map(p => p.description),
          predictiveInsights,
          anomalies
        }
      };

      // Add charts for PDF export
      if (format === 'pdf') {
        const charts: { element: HTMLElement; title: string }[] = [];
        
        if (trendsChartRef.current) {
          charts.push({
            element: trendsChartRef.current,
            title: 'Emotion & Sensory Trends'
          });
        }
        
        if (correlationChartRef.current) {
          charts.push({
            element: correlationChartRef.current,
            title: 'Correlation Heatmap'
          });
        }
        
        if (patternsChartRef.current) {
          charts.push({
            element: patternsChartRef.current,
            title: 'AI Pattern Recognition'
          });
        }
        
        exportData.charts = charts;
      }

      // Execute export
      switch (format) {
        case 'pdf':
          await analyticsExport.exportToPDF(exportData);
          toast.success('Interactive analytics PDF exported successfully');
          break;
        case 'csv':
          analyticsExport.exportToCSV(exportData);
          toast.success('Interactive analytics CSV exported successfully');
          break;
        case 'json':
          analyticsExport.exportToJSON(exportData);
          toast.success('Interactive analytics JSON exported successfully');
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export interactive analytics data');
    } finally {
      setIsExporting(false);
    }
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
                <Card 
                  key={index} 
                  className={cn(
                    "bg-gradient-card cursor-pointer transition-all",
                    highlightState.type === 'emotion' && pattern.type === 'emotion' && "ring-2 ring-primary"
                  )}
                  onClick={() => handleHighlight('emotion', `pattern-${index}`)}
                >
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
                              <ConfidenceIndicator 
                                confidence={insight.prediction.accuracy}
                                dataPoints={filteredData.emotions.length + filteredData.sensoryInputs.length}
                                timeSpanDays={filteredData.emotions.length > 0 && filteredData.emotions[0] ? 
                                  Math.abs(differenceInDays(new Date(), filteredData.emotions[0].timestamp)) : 0}
                                rSquared={insight.prediction.accuracy}
                                className="ml-1"
                              />
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
                <Card 
                  key={index} 
                  className={cn(
                    "bg-gradient-card border-orange-200 cursor-pointer",
                    highlightState.type === 'anomaly' && highlightState.id === `anomaly-${index}` && "ring-2 ring-orange-500"
                  )}
                  onClick={() => handleHighlight('anomaly', `anomaly-${index}`)}
                >
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

  // Render visualization based on type and layout
  const renderVisualization = (type: VisualizationType) => {
    switch (type) {
      case 'trends':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Emotion & Sensory Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={trendsChartRef}>
                {renderChart()}
              </div>
            </CardContent>
          </Card>
        );

      case 'correlations':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Correlation Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Relationships between emotional, sensory, and environmental factors
              </p>
            </CardHeader>
            <CardContent>
              <div ref={correlationChartRef}>
                {renderCorrelationHeatmap()}
              </div>
            </CardContent>
          </Card>
        );

      case 'patterns':
        return (
          <Card>
            <CardHeader>
              <CardTitle>AI Pattern Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={patternsChartRef}>
                {renderPatternAnalysis()}
              </div>
            </CardContent>
          </Card>
        );

      case '3d':
        return (
          <Visualization3D
            emotions={filteredData.emotions}
            sensoryInputs={filteredData.sensoryInputs}
            trackingEntries={filteredData.trackingEntries}
          />
        );

      case 'timeline':
        return (
          <TimelineVisualization
            emotions={filteredData.emotions}
            sensoryInputs={filteredData.sensoryInputs}
            trackingEntries={filteredData.trackingEntries}
            anomalies={anomalies.map(a => ({
              timestamp: a.timestamp,
              type: a.type,
              severity: a.severity
            }))}
            onTimeRangeChange={(start, end) => {
              setFilterCriteria(prev => ({
                ...prev,
                dateRange: { start, end }
              }));
            }}
            realtime={filterCriteria.realtime}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 font-dyslexia">
      {/* Main Controls Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Interactive Data Analysis - {studentName}
            {filterCriteria.realtime && (
              <Badge variant="default" className="animate-pulse ml-2">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <Sheet open={showFilterPanel} onOpenChange={setShowFilterPanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {Object.keys(filterCriteria).filter(k => 
                    JSON.stringify(filterCriteria[k as keyof FilterCriteria]) !== 
                    JSON.stringify({
                      dateRange: { start: null, end: null },
                      emotions: { types: [], intensityRange: [0, 10], includeTriggers: [], excludeTriggers: [] },
                      sensory: { types: [], responses: [], intensityRange: [0, 10] },
                      environmental: {
                        locations: [],
                        activities: [],
                        conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
                        weather: [],
                        timeOfDay: []
                      },
                      patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
                      realtime: false
                    }[k as keyof FilterCriteria])
                  ).length > 0 && (
                    <Badge variant="default" className="ml-1">
                      Active
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Advanced Filters</SheetTitle>
                  <SheetDescription>
                    Configure multi-dimensional filters for your data analysis
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <AdvancedFilterPanel
                    emotions={emotions}
                    sensoryInputs={sensoryInputs}
                    trackingEntries={trackingEntries}
                    onFilterChange={setFilterCriteria}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Layout Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {layoutMode === 'grid' && <Grid3x3 className="h-4 w-4 mr-2" />}
                  {layoutMode === 'focus' && <Focus className="h-4 w-4 mr-2" />}
                  {layoutMode === 'comparison' && <Columns className="h-4 w-4 mr-2" />}
                  {layoutMode === 'dashboard' && <Activity className="h-4 w-4 mr-2" />}
                  Layout
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLayoutMode('dashboard')}>
                  <Activity className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('grid')}>
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('focus')}>
                  <Focus className="h-4 w-4 mr-2" />
                  Focus Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('comparison')}>
                  <Columns className="h-4 w-4 mr-2" />
                  Comparison
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleFullscreen}>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={togglePictureInPicture}>
                  <PictureInPicture2 className="h-4 w-4 mr-2" />
                  Picture-in-Picture
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setHighlightState({ type: null, id: null, relatedIds: [] });
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Highlights
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Controls */}
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
              {filterCriteria.realtime && (
                <Badge variant="default" className="bg-orange-500">
                  {realtimeData.newDataCount} new
                </Badge>
              )}
            </div>
          </div>

          {/* Visualization Selection for Focus Mode */}
          {layoutMode === 'focus' && (
            <div className="mt-4 flex gap-2">
              {(['trends', 'correlations', 'patterns', '3d', 'timeline'] as VisualizationType[]).map(type => (
                <Toggle
                  key={type}
                  size="sm"
                  pressed={focusedVisualization === type}
                  onPressedChange={() => setFocusedVisualization(focusedVisualization === type ? null : type)}
                  className="capitalize"
                >
                  {type === '3d' ? '3D View' : type}
                </Toggle>
              ))}
            </div>
          )}

          {/* Multi-select for Grid/Comparison modes */}
          {(layoutMode === 'grid' || layoutMode === 'comparison') && (
            <div className="mt-4 flex gap-2">
              {(['trends', 'correlations', 'patterns', '3d', 'timeline'] as VisualizationType[]).map(type => (
                <Toggle
                  key={type}
                  size="sm"
                  pressed={selectedVisualizations.includes(type)}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      setSelectedVisualizations([...selectedVisualizations, type]);
                    } else {
                      setSelectedVisualizations(selectedVisualizations.filter(v => v !== type));
                    }
                  }}
                  className="capitalize"
                >
                  {type === '3d' ? '3D View' : type}
                </Toggle>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Connection Status */}
      {filterCriteria.realtime && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  realtimeData.connectionStatus === 'connected' ? "bg-green-500 animate-pulse" :
                  realtimeData.connectionStatus === 'connecting' ? "bg-yellow-500" :
                  realtimeData.connectionStatus === 'error' ? "bg-red-500" :
                  "bg-gray-500"
                )} />
                <span className="text-sm font-medium">
                  {realtimeData.connectionStatus === 'connected' ? 'Live Data Stream' :
                   realtimeData.connectionStatus === 'connecting' ? 'Connecting...' :
                   realtimeData.connectionStatus === 'error' ? 'Connection Error' :
                   'Disconnected'}
                </span>
                {realtimeData.lastUpdate && (
                  <span className="text-xs text-muted-foreground">
                    Last update: {format(realtimeData.lastUpdate, 'HH:mm:ss')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {realtimeData.newDataCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => realtimeData.clearNewDataIndicator()}
                  >
                    Clear {realtimeData.newDataCount} new
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => realtimeData.getHistoricalData(60)}
                >
                  Load History
                </Button>
                {realtimeData.isLive ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => realtimeData.stopStream()}
                  >
                    <WifiOff className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => realtimeData.startStream()}
                  >
                    <Wifi className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Visualization Area */}
      {layoutMode === 'dashboard' ? (
        // Dashboard Layout with Tabs
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="3d" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              3D View
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            {renderVisualization('trends')}
            
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
            {renderVisualization('correlations')}
            
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
            {/* Detailed Confidence Analysis for Teachers */}
            <DetailedConfidenceExplanation
              confidence={predictiveInsights.length > 0 ? predictiveInsights[0].confidence : 
                        patterns.length > 0 ? patterns[0].confidence : 0.03}
              dataPoints={filteredData.emotions.length + filteredData.sensoryInputs.length + filteredData.trackingEntries.length}
              timeSpanDays={filteredData.emotions.length > 0 && filteredData.emotions[0] ? 
                Math.abs(differenceInDays(new Date(), filteredData.emotions[0].timestamp)) : 0}
              rSquared={predictiveInsights.length > 0 && predictiveInsights[0].prediction ? 
                predictiveInsights[0].prediction.accuracy : 
                patterns.length > 0 ? patterns[0].confidence : 0.03}
            />
            
            {renderVisualization('patterns')}
          </TabsContent>

          <TabsContent value="3d">
            {renderVisualization('3d')}
          </TabsContent>

          <TabsContent value="timeline">
            {renderVisualization('timeline')}
          </TabsContent>
        </Tabs>
      ) : layoutMode === 'focus' ? (
        // Focus Mode - Single visualization
        <div className="space-y-6">
          {focusedVisualization ? (
            renderVisualization(focusedVisualization)
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <Focus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a visualization to focus on</p>
                  <p className="text-sm">Choose from the options above</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Grid or Comparison Layout
        <div className={getLayoutClasses()}>
          {selectedVisualizations.map(type => (
            <div key={type}>{renderVisualization(type)}</div>
          ))}
          {selectedVisualizations.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <Grid3x3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select visualizations to display</p>
                  <p className="text-sm">Choose from the options above</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};