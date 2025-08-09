import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EChartsOption } from "echarts";
import { EChartContainer } from "@/components/charts/EChartContainer";
import { EmotionEntry, SensoryEntry } from "@/types/student";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useProgressiveChartData } from '@/hooks/useProgressiveChartData';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { buildEmotionTrendsOption, TrendRow } from '@/components/charts/ChartKit';

interface DataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  studentName: string;
  showTimeFilter?: boolean;
  selectedRange?: string;
}

const emotionColors = {
  happy: '#10B981',
  calm: '#06B6D4',
  excited: '#8B5CF6',
  sad: '#3B82F6',
  anxious: '#F59E0B',
  angry: '#EF4444',
} as const;

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
            <ErrorBoundary>
              {state.isLoading && !state.steps.emotionTrends ? (
                <div aria-label="Loading emotion trends" className="h-[300px] w-full">
                  <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
                </div>
              ) : (() => {
                // Aggregate daily rows compatible with ChartKit TrendRow
                const byDate = new Map<string, TrendRow & { count: number }>();
                for (const e of emotions) {
                  const d = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
                  if (Number.isNaN(d.getTime())) continue;
                  const key = d.toISOString().slice(0, 10);
                  if (!byDate.has(key)) {
                    byDate.set(key, {
                      date: key,
                      avgEmotionIntensity: 0,
                      positiveEmotions: 0,
                      negativeEmotions: 0,
                      totalSensoryInputs: 0,
                      count: 0,
                    });
                  }
                  const row = byDate.get(key)!;
                  const intensity = typeof e.intensity === 'number' ? e.intensity : Number(e.intensity) || 0;
                  row.avgEmotionIntensity = (row.avgEmotionIntensity * row.count + intensity) / (row.count + 1);
                  row.count += 1;
                  const name = String(e.emotion || '').toLowerCase();
                  if (["happy","calm","focused","excited","proud"].includes(name)) row.positiveEmotions += 1;
                  if (["sad","angry","anxious","frustrated","overwhelmed"].includes(name)) row.negativeEmotions += 1;
                }
                for (const s of sensoryInputs) {
                  const d = s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp);
                  if (Number.isNaN(d.getTime())) continue;
                  const key = d.toISOString().slice(0, 10);
                  if (!byDate.has(key)) {
                    byDate.set(key, {
                      date: key,
                      avgEmotionIntensity: 0,
                      positiveEmotions: 0,
                      negativeEmotions: 0,
                      totalSensoryInputs: 0,
                      count: 0,
                    });
                  }
                  const row = byDate.get(key)!;
                  row.totalSensoryInputs += 1;
                }
                const rows = Array.from(byDate.values())
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(({ count, ...r }) => r);

                const option: EChartsOption = buildEmotionTrendsOption(rows, {
                  title: undefined,
                  showMovingAverage: true,
                  movingAverageWindow: 7,
                  useDualYAxis: true,
                  thresholds: { emotion: 7, sensory: 5 },
                });
                return <EChartContainer option={option} height={300} aria-label="Emotion trends line chart" />;
              })()}
            </ErrorBoundary>
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
              <ErrorBoundary>
                {state.isLoading && !state.steps.emotionDistribution ? (
                  <div aria-label="Loading emotion distribution" className="h-[250px] w-full">
                    <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
                  </div>
                ) : (() => {
                  type PieItemCallbackParam = { name?: string };
                  const option: EChartsOption = {
                    dataset: { source: data.emotionDistribution.map((d) => ({ name: d.name, value: d.value })) },
                    tooltip: { trigger: "item" },
                    legend: { bottom: 0, type: "scroll" },
                    series: [
                      {
                        type: "pie",
                        radius: ["45%", "70%"],
                        label: { formatter: "{b}: {@value} ({d}%)" },
                        encode: { itemName: "name", value: "value" },
                        itemStyle: {
                          color: (params: PieItemCallbackParam) => {
                            const key = (params?.name || "") as keyof typeof emotionColors;
                            return emotionColors[key] || "#8884d8";
                          },
                        },
                      },
                    ],
                  };
                  return <EChartContainer option={option} height={250} aria-label="Emotion distribution donut chart" />;
                })()}
              </ErrorBoundary>
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
              <ErrorBoundary>
                {state.isLoading && !state.steps.sensoryResponses ? (
                  <div aria-label="Loading sensory responses" className="h-[250px] w-full">
                    <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
                  </div>
                ) : (() => {
                  const option: EChartsOption = {
                    dataset: { source: data.sensoryResponses },
                    grid: { top: 24, right: 16, bottom: 32, left: 40 },
                    xAxis: { type: "category", name: "Type", nameGap: 24 },
                    yAxis: { type: "value", name: "Count", nameGap: 28, minInterval: 1 },
                    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                    legend: { top: 0 },
                    series: [
                      { type: "bar", name: "Seeking", encode: { x: "type", y: "seeking" }, itemStyle: { color: "#10B981" } },
                      { type: "bar", name: "Avoiding", encode: { x: "type", y: "avoiding" }, itemStyle: { color: "#EF4444" } },
                      { type: "bar", name: "Neutral", encode: { x: "type", y: "neutral" }, itemStyle: { color: "#6B7280" } },
                    ],
                  };
                  return <EChartContainer option={option} height={250} aria-label="Sensory response patterns stacked bars" />;
                })()}
              </ErrorBoundary>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Re-render only if data actually changed
  return (
    prevProps.studentName === nextProps.studentName &&
    prevProps.selectedRange === nextProps.selectedRange &&
    prevProps.showTimeFilter === nextProps.showTimeFilter &&
    prevProps.emotions.length === nextProps.emotions.length &&
    prevProps.sensoryInputs.length === nextProps.sensoryInputs.length &&
    // Deep check only if lengths are same
    (prevProps.emotions.length === 0 || 
      prevProps.emotions[0]?.timestamp === nextProps.emotions[0]?.timestamp) &&
    (prevProps.sensoryInputs.length === 0 || 
      prevProps.sensoryInputs[0]?.timestamp === nextProps.sensoryInputs[0]?.timestamp)
  );
});

OptimizedDataVisualization.displayName = 'OptimizedDataVisualization';