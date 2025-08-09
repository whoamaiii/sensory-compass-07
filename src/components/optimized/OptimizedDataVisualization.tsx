/**
 * OptimizedDataVisualization
 *
 * Composes three focused chart components with shared presets/constants:
 * - EmotionTrendsChart: time-series of emotions and sensory inputs
 * - EmotionDistributionChart: donut distribution of emotions
 * - SensoryResponsePatternsChart: stacked bars for sensory responses
 *
 * Responsibilities:
 * - Fetch progressive chart data via useProgressiveChartData
 * - Handle loading/empty states and layout
 * - Pass data/flags to sub-components; avoid inline IIFEs and large inline options
 *
 * This structure improves readability, reusability, and testability while keeping
 * visual behavior consistent across the app using shared tooltip/legend presets.
 */
import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmotionEntry, SensoryEntry } from "@/types/student";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useProgressiveChartData } from '@/hooks/useProgressiveChartData';
import { EmotionTrendsChart } from '@/components/optimized/charts/EmotionTrendsChart';
import { EmotionDistributionChart } from '@/components/optimized/charts/EmotionDistributionChart';
import { SensoryResponsePatternsChart } from '@/components/optimized/charts/SensoryResponsePatternsChart';

interface DataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  studentName: string;
  showTimeFilter?: boolean;
  selectedRange?: string;
}

/**
 * Optimized DataVisualization component with React.memo and useMemo for expensive computations
 */
export const OptimizedDataVisualization = memo(({ 
  emotions, 
  sensoryInputs, 
  studentName, 
  showTimeFilter: _showTimeFilter = false, 
  selectedRange 
}: DataVisualizationProps) => {
  
  const { data, state } = useProgressiveChartData({
    emotions,
    sensoryInputs,
    entries: [],
    analyticsResults: null,
  });

  // Early return for empty state
  if (emotions.length === 0 && sensoryInputs.length === 0) {
    return (
      <Card className="font-dyslexia bg-gradient-card border-0">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No data to display yet</p>
            <p className="text-sm">Start tracking emotions and sensory inputs to see visualizations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 font-dyslexia">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Data Insights for {studentName}
        </h2>
        <p className="text-muted-foreground">
          {selectedRange && `${selectedRange} • `}
          Tracking {emotions.length} emotions and {sensoryInputs.length} sensory inputs
        </p>
      </div>

      {/* Emotion Trends */}
      {(state.steps.emotionTrends || data.emotionTrends.length > 0) && (
        <Card className="bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Emotion Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmotionTrendsChart
              emotions={emotions}
              sensoryInputs={sensoryInputs}
              isLoading={state.isLoading}
              stepReady={!!state.steps.emotionTrends}
              height={300}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        {(data.emotionDistribution.length > 0 || state.isLoading) && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Emotion Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmotionDistributionChart
                distribution={data.emotionDistribution}
                isLoading={state.isLoading}
                stepReady={!!state.steps.emotionDistribution}
                height={250}
              />
            </CardContent>
          </Card>
        )}

        {/* Sensory Responses */}
        {(data.sensoryResponses.length > 0 || state.isLoading) && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sensory Response Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SensoryResponsePatternsChart
                responses={data.sensoryResponses}
                isLoading={state.isLoading}
                stepReady={!!state.steps.sensoryResponses}
                height={250}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
});

OptimizedDataVisualization.displayName = 'OptimizedDataVisualization';
