import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertManager } from "@/components/AlertManager";
import { InteractiveDataVisualization as DataVisualization } from "@/components/InteractiveDataVisualization";
import { AnalyticsSettings } from "@/components/AnalyticsSettings";
import {
  TrendingUp,
  Brain,
  Eye,
  Clock,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Settings,
  Info
} from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { EChartContainer } from "@/components/charts/EChartContainer";
import { buildCorrelationHeatmapOption } from "@/components/charts/ChartKit";
import { enhancedPatternAnalysis } from "@/lib/enhancedPatternAnalysis";
import type { EChartsOption } from "echarts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useAnalyticsWorker } from "@/hooks/useAnalyticsWorker";
import { analyticsManager } from "@/lib/analyticsManager";
import { useTranslation } from "@/hooks/useTranslation";
import { analyticsExport, ExportFormat } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { diagnostics } from "@/lib/diagnostics";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * @interface AnalyticsDashboardProps
 * Props for the AnalyticsDashboard component.
 * @property {Student} student - The student object for context.
 * @property {object} filteredData - The pre-filtered data to be analyzed.
 */
interface AnalyticsDashboardProps {
  student: Student;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
}

/**
 * @component AnalyticsDashboard
 * 
 * A dashboard component responsible for displaying the results of a student's data analysis.
 * 
 * This component has been refactored to be primarily presentational. It offloads all
 * heavy computation to a web worker via the `useAnalyticsWorker` hook. This ensures
 * the UI remains responsive, even when analyzing large datasets.
 * 
 * It no longer handles its own data filtering; instead, it receives `filteredData`
 * as a prop from a parent component, ensuring a single source of truth.
 */
export const AnalyticsDashboard = memo(({
  student,
  filteredData = { entries: [], emotions: [], sensoryInputs: [] },
}: AnalyticsDashboardProps) => {
  // All hooks must be called at the top level, not inside try-catch
  const { tStudent } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  
  // Always call hook at top level - hooks cannot be inside try-catch
  const { results, isAnalyzing, error, runAnalysis, invalidateCacheForStudent } = useAnalyticsWorker();

  // Effect to trigger the analysis in the worker whenever the filtered data changes.
  useEffect(() => {
    // Normalize incoming filteredData timestamps to Date instances for charts/UI safety
    const normalize = (d: typeof filteredData) => {
      const coerce = (v: unknown): Date => {
        try {
          if (v instanceof Date && !isNaN(v.getTime())) return v;
          if (typeof v === 'string' || typeof v === 'number') {
            const dt = new Date(v);
            return isNaN(dt.getTime()) ? new Date() : dt;
          }
          return new Date();
        } catch (error) {
          logger.error('Error coercing timestamp:', v, error);
          return new Date();
        }
      };
      
      try {
        return {
          entries: (d.entries || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
          emotions: (d.emotions || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
          sensoryInputs: (d.sensoryInputs || []).map(s => ({ ...s, timestamp: coerce(s.timestamp) })),
        };
      } catch (error) {
        logger.error('Error normalizing filteredData:', error);
        return {
          entries: [],
          emotions: [],
          sensoryInputs: []
        };
      }
    };
    
    if (filteredData && filteredData.entries) {
      runAnalysis(normalize(filteredData));
    }
    // Ensure student analytics exists for all students, including new and mock
    analyticsManager.initializeStudentAnalytics(student.id);
  }, [student.id, filteredData, runAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Component cleanup
    };
  }, []);

  // useMemo hooks to prevent re-calculating derived data on every render.
  const patterns = useMemo(() => results?.patterns || [], [results]);
  const correlations = useMemo(() => results?.correlations || [], [results]);
  const environmentalCorrelations = useMemo(() => results?.environmentalCorrelations || results?.correlations || [], [results]);
  const insights = useMemo(() => results?.insights || [], [results]);

  // Decouple visualization rendering from worker readiness to avoid spinners.
  // Charts render immediately using filteredData while analysis updates other tabs.

  // Export handler with useCallback for performance
  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const dateRange = {
        start: filteredData.entries.length > 0
          ? filteredData.entries.reduce((min, entry) => {
              const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
              const minTime = min instanceof Date ? min : new Date(min);
              return entryTime < minTime ? entryTime : minTime;
            }, filteredData.entries[0].timestamp)
          : new Date(),
        end: filteredData.entries.length > 0
          ? filteredData.entries.reduce((max, entry) => {
              const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
              const maxTime = max instanceof Date ? max : new Date(max);
              return entryTime > maxTime ? entryTime : maxTime;
            }, filteredData.entries[0].timestamp)
          : new Date()
      };

      const exportData = {
        student,
        dateRange,
        data: filteredData,
        analytics: {
          patterns,
          correlations,
          insights,
          predictiveInsights: results?.predictiveInsights || [],
          anomalies: results?.anomalies || []
        },
        charts: format === 'pdf' && visualizationRef.current
          ? [{
              element: visualizationRef.current,
              title: 'Emotion & Sensory Trends'
            }]
          : undefined
      };

      switch (format) {
        case 'pdf':
          await analyticsExport.exportToPDF(exportData);
          toast.success('PDF report exported successfully');
          break;
        case 'csv':
          analyticsExport.exportToCSV(exportData);
          toast.success('CSV data exported successfully');
          break;
        case 'json':
          analyticsExport.exportToJSON(exportData);
          toast.success('JSON data exported successfully');
          break;
      }
    } catch (error) {
      logger.error('Export failed:', error);
      toast.error('Failed to export analytics data');
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, student, patterns, correlations, insights, results]);

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
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Header card, displays the student's name and export options. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Analytics Dashboard - {student.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
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
      </Card>

      {/* Summary cards providing a quick overview of the data volume. */}
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
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.emotionsTracked'))}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.sensoryInputs'))}</p>
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

      {/* Main tabbed interface for displaying detailed analysis results. */}
      <Tabs defaultValue="visualizations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visualizations">Charts</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="correlations" data-testid="dashboard-correlations-tab">Correlations</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizations" className="space-y-6">
          <div ref={visualizationRef}>
            <DataVisualization
              emotions={filteredData.emotions}
              sensoryInputs={filteredData.sensoryInputs}
              trackingEntries={filteredData.entries}
              studentName={student.name}
            />
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6" forceMount>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Behavioral Patterns</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => runAnalysis(filteredData)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Conditional rendering based on the worker's state (analyzing, error, or results). */}
              {isAnalyzing && (
                 <div className="text-center py-8 text-muted-foreground">
                   <Clock className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                   <p>Analyzing data...</p>
                 </div>
              )}
              {!isAnalyzing && error && (
                <div className="text-center py-8 text-destructive">
                  <p>{error}</p>
                </div>
              )}
              {!isAnalyzing && !error && patterns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant patterns detected yet.</p>
                  <p className="text-sm">More data may be needed for pattern analysis.</p>
                </div>
              )}
              {!isAnalyzing && !error && patterns.length > 0 && (
                <div className="space-y-4">
                  {patterns.map((pattern: PatternResult, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getPatternIcon(pattern.type)}
                            <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">
                                {String((pattern as PatternResult & {pattern?: string; name?: string}).pattern ?? (pattern as PatternResult & {pattern?: string; name?: string}).name ?? 'Pattern')
                                  .replace('-', ' ')
                                  .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </h4>
                              <HoverCard openDelay={100} closeDelay={80}>
                                <HoverCardTrigger asChild>
                                  <button
                                    aria-label="Vis forklaringen"
                                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-none text-muted-foreground hover:bg-accent/40"
                                  >
                                    <Info className="h-3 w-3" />
                                    Vis forklaringen
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 text-sm leading-relaxed">
                                  <p className="mb-1 font-medium">Hva betyr dette mønsteret?</p>
                                  <p className="text-muted-foreground">
                                    {String((pattern as PatternResult & {description?: string}).description ?? 'Systemet har funnet et gjentakende mønster i dataene for denne perioden.')} 
                                  </p>
                                  <p className="mt-2 text-xs text-muted-foreground/80">
                                    Tolk alltid sammen med kontekst og pedagogisk vurdering.
                                  </p>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {String((pattern as PatternResult & {description?: string}).description ?? '')}
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
              {isAnalyzing && <p className="text-muted-foreground">Generating insights...</p>}
              {!isAnalyzing && insights.length === 0 && (
                <p className="text-muted-foreground">No insights available yet.</p>
              )}
              {!isAnalyzing && insights.length > 0 && (
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

        <TabsContent value="correlations" forceMount className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex items-start justify-between gap-3">
              <div>
                <CardTitle data-testid="environmental-correlations-title">Correlation Heatmap</CardTitle>
                <p className="text-sm text-muted-foreground">Strength of relationships between tracked factors (−1 to 1)</p>
              </div>
              <HoverCard openDelay={150} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button aria-label="Hvordan lese varmekartet" className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-accent/30">
                    <Info className="h-4 w-4" />
                    Hvordan lese varmekartet
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 text-sm leading-relaxed">
                  <p>
                    Farger viser korrelasjon: grønn = positiv sammenheng, rød = negativ. Tall nær 1 eller −1 betyr sterkere samband.
                    Akser viser faktorer. Hold musepekeren over en celle for detaljer og signifikans.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </CardHeader>
            <CardContent>
              {isAnalyzing && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                  <p>Analyzing correlations...</p>
                </div>
              )}
              {!isAnalyzing && error && (
                <div className="text-center py-8 text-destructive">
                  <p>{error}</p>
                </div>
              )}
              {(() => {
                const hasEnoughData = (filteredData.entries?.length ?? 0) >= 10;
                if (hasEnoughData) {
                  try {
                    const matrix = enhancedPatternAnalysis.generateCorrelationMatrix(filteredData.entries);
                    const option: EChartsOption = buildCorrelationHeatmapOption(matrix);
                    return (
                      <>
                        <div className="rounded-xl border bg-card">
                          <EChartContainer option={option} height={420} />
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Negativ</span>
                          <span className="h-3 w-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                          <span>0</span>
                          <span className="h-3 w-3 rounded border" style={{ backgroundColor: '#f3f4f6' }} />
                          <span>Positiv</span>
                          <span className="h-3 w-3 rounded" style={{ backgroundColor: '#10b981' }} />
                        </div>
                      </>
                    );
                  } catch {
                    /* fall through to list */
                  }
                }
                if (!isAnalyzing && !error && environmentalCorrelations.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No significant correlations found.</p>
                      <p className="text-sm">More varied environmental data may be needed.</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {environmentalCorrelations.map((correlation: CorrelationResult, index) => (
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
                            </div>
                            <div className="text-right">
                              <Badge variant={correlation.significance === 'high' ? 'default' : 'outline'}>
                                {correlation.significance} significance
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                r = {typeof (correlation as CorrelationResult & {correlation?: number}).correlation === 'number'
                                  ? (correlation as CorrelationResult & {correlation?: number}).correlation.toFixed(3)
                                  : '0.000'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertManager studentId={student.id} />
        </TabsContent>
      </Tabs>

      {/* Analytics Settings Dialog */}
      {showSettings && (
        <AnalyticsSettings
          onConfigChange={() => {
            // Invalidate cache for this student when config changes
            invalidateCacheForStudent(student.id);
            // Re-run analysis with new configuration
            runAnalysis(filteredData);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.student.name === nextProps.student.name &&
    prevProps.filteredData.entries.length === nextProps.filteredData.entries.length &&
    prevProps.filteredData.emotions.length === nextProps.filteredData.emotions.length &&
    prevProps.filteredData.sensoryInputs.length === nextProps.filteredData.sensoryInputs.length &&
    // Check timestamp of first entry to detect data changes
    (prevProps.filteredData.entries.length === 0 || 
     nextProps.filteredData.entries.length === 0 ||
     (() => {
       try {
         const prevTimestamp = prevProps.filteredData.entries[0]?.timestamp;
         const nextTimestamp = nextProps.filteredData.entries[0]?.timestamp;
         
         // Handle various timestamp formats
         const prevTime = prevTimestamp instanceof Date ? prevTimestamp.getTime() : 
                          typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number' ? new Date(prevTimestamp).getTime() : 0;
         const nextTime = nextTimestamp instanceof Date ? nextTimestamp.getTime() : 
                          typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number' ? new Date(nextTimestamp).getTime() : 0;
         
         return prevTime === nextTime;
       } catch (error) {
         logger.error('Error comparing timestamps in AnalyticsDashboard memo:', error);
         return false;
       }
     })())
  );
});
