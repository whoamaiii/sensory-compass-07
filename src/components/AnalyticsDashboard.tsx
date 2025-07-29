import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertManager } from "@/components/AlertManager";
import { DataVisualization } from "@/components/DataVisualization";
import { 
  TrendingUp, 
  Brain,
  Eye,
  Clock,
  BarChart3
} from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { PatternResult, CorrelationResult } from "@/lib/patternAnalysis";
import { useAnalyticsWorker } from "@/hooks/useAnalyticsWorker";
import { analyticsManager } from "@/lib/analyticsManager";
import { useTranslation } from "@/hooks/useTranslation";

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
export const AnalyticsDashboard = ({ 
  student, 
  filteredData
}: AnalyticsDashboardProps) => {
  const { tStudent } = useTranslation();
  const { results, isAnalyzing, error, runAnalysis } = useAnalyticsWorker();

  // Effect to trigger the analysis in the worker whenever the filtered data changes.
  useEffect(() => {
    runAnalysis(filteredData);
    // This call remains to ensure student-specific analytics settings are initialized.
    analyticsManager.initializeStudentAnalytics(student.id);
  }, [student.id, filteredData, runAnalysis]);

  // useMemo hooks to prevent re-calculating derived data on every render.
  const patterns = useMemo(() => results?.patterns || [], [results]);
  const correlations = useMemo(() => results?.correlations || [], [results]);
  const insights = useMemo(() => results?.insights || [], [results]);

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
      {/* Header card, displays the student's name. */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard - {student.name}</CardTitle>
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

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environmental Correlations</CardTitle>
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
              {!isAnalyzing && !error && correlations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant correlations found.</p>
                  <p className="text-sm">Environmental data may be needed for correlation analysis.</p>
                </div>
              )}
              {!isAnalyzing && !error && correlations.length > 0 && (
                <div className="space-y-4">
                  {correlations.map((correlation: CorrelationResult, index) => (
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