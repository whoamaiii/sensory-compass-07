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
import type { EChartsOption } from "echarts";
import { EChartContainer } from "@/components/charts/EChartContainer";
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
import { ChartTooltip } from "./charts/ChartTooltip";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "./ErrorBoundary";

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

const parseTimestamp = (entry: { timestamp: string | Date }): Date | null => {
  if (entry.timestamp instanceof Date) {
    return entry.timestamp;
  }
  if (typeof entry.timestamp === 'string') {
    const date = new Date(entry.timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};
export const InteractiveDataVisualization = ({ 
  emotions: initialEmotions, 
  sensoryInputs: initialSensoryInputs, 
  trackingEntries: initialTrackingEntries, 
  studentName 
}: InteractiveDataVisualizationProps) => {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
const safeInitialEmotions = Array.isArray(initialEmotions) ? initialEmotions : [];
const safeInitialSensoryInputs = Array.isArray(initialSensoryInputs) ? initialSensoryInputs : [];
const safeInitialTracking = Array.isArray(initialTrackingEntries) ? initialTrackingEntries : [];

const availableEmotions = Array.from(
  new Set(safeInitialEmotions.map(e => e.emotion))
);
const [selectedEmotions, setSelectedEmotions] = useState<string[]>(availableEmotions);
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
  const emotions = filterCriteria.realtime ? realtimeData.emotions : safeInitialEmotions;
  const sensoryInputs = filterCriteria.realtime ? realtimeData.sensoryInputs : safeInitialSensoryInputs;
  const trackingEntries = filterCriteria.realtime ? realtimeData.trackingEntries : safeInitialTracking;

  // Apply filters to data
  const filteredData = useMemo(() => {
    try {
      const now = new Date();
      const cutoff = selectedTimeRange === '7d' ? subDays(now, 7) :
                     selectedTimeRange === '30d' ? subDays(now, 30) :
                     selectedTimeRange === '90d' ? subDays(now, 90) : null;
  
      // Apply time range filter first with null-safe guards
      let filteredEmotions = Array.isArray(emotions) ? (cutoff ? emotions.filter(e => {
        const timestamp = parseTimestamp(e);
        return timestamp && timestamp >= cutoff;
      }) : emotions) : [];
      let filteredSensory = Array.isArray(sensoryInputs) ? (cutoff ? sensoryInputs.filter(s => {
        const timestamp = parseTimestamp(s);
        return timestamp && timestamp >= cutoff;
      }) : sensoryInputs) : [];
      let filteredTracking = Array.isArray(trackingEntries) ? (cutoff ? trackingEntries.filter(t => {
        const timestamp = parseTimestamp(t);
        return timestamp && timestamp >= cutoff;
      }) : trackingEntries) : [];
  
      // Apply advanced filters
      filteredEmotions = applyFilters(
        filteredEmotions,
        filterCriteria,
        (e) => e,
        null,
        null
      ) || [];
  
      filteredSensory = applyFilters(
        filteredSensory,
        filterCriteria,
        null,
        (s) => s,
        null
      ) || [];
  
      filteredTracking = applyFilters(
        filteredTracking,
        filterCriteria,
        (t) => t?.emotions?.[0] || null,
        (t) => t?.sensoryInputs?.[0] || null,
        (t) => t?.environmentalData || null
      ) || [];
  
      // Apply highlight filter if active
      if (highlightState.type && highlightState.id) {
        const related = new Set(highlightState.relatedIds);
        filteredEmotions = filteredEmotions.filter(e => e?.id === highlightState.id || related.has(e?.id));
        filteredSensory = filteredSensory.filter(s => s?.id === highlightState.id || related.has(s?.id));
        filteredTracking = filteredTracking.filter(t => t?.id === highlightState.id || related.has(t?.id));
      }
  
      return {
        emotions: filteredEmotions.map(e => ({...e, timestamp: parseTimestamp(e)})),
        sensoryInputs: filteredSensory.map(s => ({...s, timestamp: parseTimestamp(s)})),
        trackingEntries: filteredTracking.map(t => ({...t, timestamp: parseTimestamp(t)}))
      };
    } catch (error) {
      logger.error("InteractiveDataVisualization.filteredData failed", { error });
      return { emotions: [], sensoryInputs: [], trackingEntries: [] };
    }
  }, [emotions, sensoryInputs, trackingEntries, selectedTimeRange, filterCriteria, highlightState]);

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

    try {
      filteredData.emotions.forEach(emotion => {
        if (!emotion?.timestamp) return;
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
        const intensity = typeof (emotion as any).intensity === "number" ? (emotion as any).intensity : 0;
        data.avgEmotionIntensity = ((data.avgEmotionIntensity * (data.emotionCount - 1)) + intensity) / data.emotionCount;
        
        const name = String((emotion as any).emotion || "").toLowerCase();
        if (['happy', 'calm', 'focused', 'excited', 'proud'].includes(name)) {
          data.positiveEmotions++;
        } else if (['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed'].includes(name)) {
          data.negativeEmotions++;
        }
        
        data[(emotion as any).emotion] = (typeof data[(emotion as any).emotion] === "number" ? (data[(emotion as any).emotion] as number) : 0) + intensity;
      });
    } catch (err) {
      logger.error("InteractiveDataVisualization.chartData emotion aggregation failed", { error: err });
    }

    try {
      filteredData.sensoryInputs.forEach(sensory => {
        if (!sensory?.timestamp) return;
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
        
        const response = String((sensory as any).response || "").toLowerCase();
        if (response.includes('seeking')) {
          data.sensorySeekingCount++;
        } else if (response.includes('avoiding')) {
          data.sensoryAvoidingCount++;
        }
      });
    } catch (err) {
      logger.error("InteractiveDataVisualization.chartData sensory aggregation failed", { error: err });
    }

    try {
      return Array.from(dataMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (err) {
      logger.error("InteractiveDataVisualization.chartData sort failed", { error: err });
      return [];
    }
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
        logger.error('Pattern analysis failed', { error });
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
    toast(isPictureInPicture ? 'Exited picture-in-picture mode' : 'Entered picture-in-picture mode');
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
    try {
      if (chartData.length === 0) {
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No data available for selected time range</p>
              <p className="text-xs mt-1">Try expanding the time range or adjusting filters</p>
            </div>
          </div>
        );
      }
  
      const commonProps = {
        dataset: {
          source: chartData
        },
        legend: {
          type: "scroll",
          data: availableEmotions
        },
        margin: { top: 5, right: 30, left: 20, bottom: 5 }
      };
  
      const enhancedTooltip = (params: any) => {
      const p = Array.isArray(params) ? params : [params];
      if (p.length === 0) return "";
      const x = String(p[0].axisValue);
      const dateStr = format(new Date(x), "MMM dd, yyyy");
      const lines = p
        .map((item: any) => {
          const seriesName = String(item.seriesName || "");
          const marker = String(item.marker || "");
          const val = item.value ? item.value : "N/A";
          return `${marker} ${seriesName}: ${val}`;
        })
        .join("\n");
      return `${dateStr}\n${lines}`;
    };

    switch (selectedChartType) {
      case 'area':
        {
          const areaOption: EChartsOption = {
            dataset: { source: chartData },
            legend: {},
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "line" },
              formatter: enhancedTooltip
            },
            xAxis: {
              type: "category",
              axisLabel: {
                formatter: (v: string) => format(new Date(v), "MMM dd"),
              }
            },
            yAxis: [{ type: "value" }],
            series: [
              {
                type: "line",
                name: "Avg Emotion Intensity",
                smooth: true,
                encode: { x: "date", y: "avgEmotionIntensity" },
                areaStyle: {},
                lineStyle: { width: 3 },
                symbol: "none"
              },
              {
                type: "line",
                name: "Positive Emotions",
                smooth: true,
                encode: { x: "date", y: "positiveEmotions" },
                areaStyle: {},
                lineStyle: { width: 2 },
                symbol: "none",
                itemStyle: { color: "hsl(142 76% 36%)" }
              }
            ]
          };
          return <EChartContainer option={areaOption} height={400} />;
        }

      case 'scatter':
        {
          // Build scatter source with numeric axes: x=avgEmotionIntensity, y=totalSensoryInputs
          const scatterOption: EChartsOption = {
            dataset: { source: chartData },
            legend: {},
            tooltip: {
              trigger: "item"
            },
            xAxis: { type: "value", name: "Avg Emotion Intensity" },
            yAxis: { type: "value", name: "Sensory Inputs" },
            series: [
              {
                name: "Daily Data Points",
                type: "scatter",
                encode: { x: "avgEmotionIntensity", y: "totalSensoryInputs" },
                symbolSize: 8,
              }
            ]
          };
          return <EChartContainer option={scatterOption} height={400} />;
        }

      case 'composed':
        {
          const composedOption: EChartsOption = {
            dataset: { source: chartData },
            legend: {},
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "shadow" },
              formatter: enhancedTooltip
            },
            xAxis: {
              type: "category",
              axisLabel: { formatter: (v: string) => format(new Date(v), "MMM dd") }
            },
            yAxis: [{ type: "value" }, { type: "value" }],
            series: [
              {
                type: "bar",
                name: "Positive Emotions",
                encode: { x: "date", y: "positiveEmotions" },
                yAxisIndex: 0,
                itemStyle: { color: "hsl(142 76% 36%)" }
              },
              {
                type: "bar",
                name: "Negative Emotions",
                encode: { x: "date", y: "negativeEmotions" },
                yAxisIndex: 0,
                itemStyle: { color: "hsl(0 72% 51%)" }
              },
              {
                type: "line",
                name: "Avg Intensity",
                encode: { x: "date", y: "avgEmotionIntensity" },
                yAxisIndex: 1,
                smooth: true,
                lineStyle: { width: 3 }
              }
            ]
          };
          return <EChartContainer option={composedOption} height={400} />;
        }

      default: // line fallback
        {
          // Teacher-friendly thresholds
          const emotionThreshold = 7; // Can be configured by teachers
          const sensoryThreshold = 5;
          const trendsOption: EChartsOption = {
            dataset: { source: chartData },
            title: {
              left: 'center',
              top: 0,
              text: `Emotion Trends Over Time`,
              textStyle: {
                fontSize: 16,
                fontWeight: 600,
                color: "hsl(var(--foreground))"
              }
            },
            legend: {
              bottom: 0,
              data: ['Avg Emotion Intensity', 'Positive Emotions', 'Negative Emotions', 'Sensory Inputs'],
              selected: {
                'Avg Emotion Intensity': true,
                'Positive Emotions': true,
                'Negative Emotions': true,
                'Sensory Inputs': false // Default hidden, toggle available
              }
            },
            tooltip: {
              trigger: "axis",
              confine: true,
              formatter: (params: any) => {
                const p = Array.isArray(params) ? params : [params];
                if (p.length === 0) return "";
                
                const date = p[0].axisValue;
                const dateStr = format(new Date(date), "EEEE, MMM dd, yyyy");
                
                const violations = p.filter((item: any) => {
                  const value = item.value || item.data?.[item.encode?.y?.[0]];
                  return (item.seriesName === 'Avg Emotion Intensity' && value > emotionThreshold) ||
                         (item.seriesName === 'Sensory Inputs' && value > sensoryThreshold);
                });
                
                let content = `<div style="font-weight: 600; margin-bottom: 8px;">${dateStr}</div>`;
                if (violations.length > 0) {
                  content += `
                    <div style="background: rgba(239, 68, 68, 0.1); 
                                border: 1px solid rgba(239, 68, 68, 0.3); 
                                padding: 4px 8px; 
                                border-radius: 4px; 
                                margin-bottom: 8px;
                                font-size: 12px;
                                color: #ef4444;">
                      ⚠️ Threshold exceeded
                    </div>
                  `;
                }
                
                p.forEach((item: any) => {
                  const value = item.value || item.data?.[item.encode?.y?.[0]];
                  const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                  const isOverThreshold = violations.includes(item);
                  
                  content += `
                    <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                      ${item.marker}
                      <span style="color: ${item.color}; font-weight: 500;">${item.seriesName}:</span>
                      <span style="font-weight: 600; ${isOverThreshold ? 'color: #ef4444;' : ''}">
                        ${formattedValue}
                      </span>
                    </div>
                  `;
                });
                
                content += `
                  <div style="margin-top: 8px; 
                              padding-top: 8px; 
                              border-top: 1px solid rgba(255,255,255,0.1);
                              font-size: 11px;
                              color: hsl(var(--muted-foreground));">
                    💡 Click to add a note
                  </div>
                `;
                
                return content;
              }
            },
            toolbox: {
              show: true,
              right: 16,
              top: 16,
              feature: {
                dataZoom: {
                  yAxisIndex: 'none',
                  title: { zoom: 'Zoom', back: 'Reset' }
                },
                restore: { title: 'Reset' },
                saveAsImage: { 
                  title: 'Save',
                  pixelRatio: 2
                }
              }
            },
            dataZoom: [
              {
                type: 'inside',
                start: 0,
                end: 100,
                minValueSpan: 7 
              },
              {
                show: true,
                type: 'slider',
                bottom: 50,
                start: 0,
                end: 100,
                height: 20,
                borderColor: 'hsl(var(--border))',
                fillerColor: 'hsl(var(--primary) / 0.3)',
                handleStyle: {
                  color: 'hsl(var(--primary))'
                }
              }
            ],
            xAxis: {
              type: "category",
              axisLabel: {
                formatter: (v: string) => format(new Date(v), "MMM dd"),
                interval: 'auto'
              },
              boundaryGap: false
            },
            yAxis: [{ 
              type: "value",
              max: 10,
              min: 0,
              interval: 2
            }],
            series: [
              {
                type: "line",
                name: "Avg Emotion Intensity",
                smooth: true,
                encode: { x: "date", y: "avgEmotionIntensity" },
                lineStyle: { width: 3, color: 'hsl(var(--primary))' },
                showSymbol: false,
                emphasis: {
                  focus: 'series',
                  lineStyle: { width: 4 }
                },
                markLine: {
                  silent: true,
                  data: [
                    {
                      yAxis: emotionThreshold,
                      label: {
                        position: 'end',
                        formatter: 'Emotion Threshold',
                        color: 'hsl(var(--destructive))'
                      },
                      lineStyle: {
                        color: 'hsl(var(--destructive))',
                        type: 'dashed',
                        width: 2
                      }
                    }
                  ]
                }
              },
              {
                type: "line",
                name: "Positive Emotions",
                smooth: true,
                encode: { x: "date", y: "positiveEmotions" },
                lineStyle: { width: 2, color: "hsl(142 76% 36%)" },
                showSymbol: false,
                itemStyle: { color: "hsl(142 76% 36%)" },
                emphasis: {
                  focus: 'series'
                }
              },
              {
                type: "line",
                name: "Negative Emotions",
                smooth: true,
                encode: { x: "date", y: "negativeEmotions" },
                lineStyle: { width: 2, color: "hsl(0 72% 51%)" },
                showSymbol: false,
                itemStyle: { color: "hsl(0 72% 51%)" },
                emphasis: {
                  focus: 'series'
                }
              },
              {
                type: "line",
                name: "Sensory Inputs",
                smooth: true,
                encode: { x: "date", y: "totalSensoryInputs" },
                lineStyle: { width: 2, type: "dashed", color: "hsl(199 89% 48%)" },
                showSymbol: false,
                itemStyle: { color: "hsl(199 89% 48%)" },
                emphasis: {
                  focus: 'series'
                },
                markLine: {
                  silent: true,
                  data: [
                    {
                      yAxis: sensoryThreshold,
                      label: {
                        position: 'end',
                        formatter: 'Sensory Threshold',
                        color: 'hsl(40 65% 70%)'
                      },
                      lineStyle: {
                        color: 'hsl(40 65% 70%)',
                        type: 'dashed',
                        width: 2
                      }
                    }
                  ]
                }
              }
            ],
            grid: {
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }
          };
          return <EChartContainer option={trendsOption} height={400} />;
        }
    }
  } catch (error) {
    logger.error("InteractiveDataVisualization.renderChart failed", { error });
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Could not render chart</p>
          <p className="text-xs mt-1">An internal error occurred while building the chart</p>
        </div>
      </div>
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
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-label="Retry correlation analysis"
                title="Retry correlation analysis"
                onClick={async () => {
                  // Re-run the analysis pipeline to attempt to populate correlations
                  setIsAnalyzing(true);
                  try {
                    const emotionPatterns = patternAnalysis.analyzeEmotionPatterns(filteredData.emotions);
                    const sensoryPatterns = patternAnalysis.analyzeSensoryPatterns(filteredData.sensoryInputs);
                    setPatterns([...emotionPatterns, ...sensoryPatterns]);
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
                    if (filteredData.trackingEntries.length >= 10) {
                      const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(filteredData.trackingEntries);
                      setCorrelationMatrix(matrix);
                      toast.success('Correlation analysis completed');
                    } else {
                      toast('Need at least 10 tracking entries for correlation analysis');
                    }
                  } catch (e) {
                    logger.error('Retry correlation analysis failed', { error: e });
                    toast.error('Failed to re-run correlation analysis');
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
              >
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Show all time range"
                title="Show all time range"
                onClick={() => setSelectedTimeRange('all')}
              >
                Show all time
              </Button>
            </div>
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
      logger.error('Export failed', { error });
      toast.error('Failed to export interactive analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  const renderPatternAnalysis = () => {
    if (isAnalyzing) {
      return (
        <div aria-label="Loading chart data" className="h-[400px] w-full">
          <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
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
    <ErrorBoundary>
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
          <div className="flex items-center gap-2" aria-label="Visualization controls">
            {/* Filter Toggle */}
            <Sheet open={showFilterPanel} onOpenChange={setShowFilterPanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Open filters panel" title="Open filters panel">
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
                <Button variant="outline" size="sm" aria-label="Select layout mode" title="Select layout mode">
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
                <Button variant="outline" size="sm" aria-label="View options" title="View options">
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
                <Button variant="outline" size="sm" disabled={isExporting} aria-label="Export analytics" title="Export analytics">
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

            {/* Emotion Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Emotions</label>
              <Select value={selectedEmotions} onValueChange={(value: string[]) => setSelectedEmotions(value)} multiple>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Pick emotions..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEmotions.map(emotion => (
                    <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                  ))}
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
          <TabsList className="grid w-full grid-cols-5" aria-label="Visualization tabs">
            <TabsTrigger
              value="trends"
              className="flex items-center gap-2"
              aria-label="Open trends charts"
              title="Open trends charts"
            >
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger
              value="correlations"
              className="flex items-center gap-2"
              aria-label="Open correlation heatmap"
              title="Open correlation heatmap"
            >
              <Target className="h-4 w-4" />
              Correlations
            </TabsTrigger>
            <TabsTrigger
              value="patterns"
              className="flex items-center gap-2"
              aria-label="Open AI pattern recognition"
              title="Open AI pattern recognition"
            >
              <Zap className="h-4 w-4" />
              Patterns
            </TabsTrigger>
            <TabsTrigger
              value="3d"
              className="flex items-center gap-2"
              aria-label="Open 3D visualization"
              title="Open 3D visualization"
            >
              <Eye className="h-4 w-4" />
              3D View
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="flex items-center gap-2"
              aria-label="Open timeline visualization"
              title="Open timeline visualization"
            >
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
    </ErrorBoundary>
  );
};
