import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EChartsOption } from "echarts";
import { EChartContainer } from "@/components/charts/EChartContainer";
import { EmotionEntry, SensoryEntry } from "@/types/student";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

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
  showTimeFilter = false, 
  selectedRange 
}: DataVisualizationProps) => {
  
  // Memoize emotion data processing
  const emotionData = useMemo(() => {
    interface EmotionDataPoint {
      date: string;
      count: number;
      [emotion: string]: number | string;
    }

    // Determine the full set of emotions present to enforce consistent columns
    const allEmotions = Array.from(new Set(emotions.map(e => e.emotion)));

    const dataMap = new Map<string, EmotionDataPoint>();

    emotions.forEach(emotion => {
      const date = emotion.timestamp.toLocaleDateString();
      if (!dataMap.has(date)) {
        // initialize row with all emotions set to 0
        const base: EmotionDataPoint = { date, count: 0 };
        allEmotions.forEach(name => {
          base[name] = 0;
        });
        dataMap.set(date, base);
      }
      const row = dataMap.get(date)!;
      const currentValue = row[emotion.emotion];
      row[emotion.emotion] = (typeof currentValue === 'number' ? currentValue : 0) + emotion.intensity;
      row.count = (row.count || 0) + 1;
    });

    // Ensure rows exist even for dates that only appear in sensory data (optional future)
    // Sort by date ascending (convert locale date string to Date safely)
    const toDate = (d: string) => new Date(d);
    const rows = Array.from(dataMap.values()).sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());

    return rows;
  }, [emotions]);

  // Memoize sensory data processing
  const sensoryData = useMemo(() => {
    interface SensoryDataPoint {
      type: string;
      total: number;
      [response: string]: number | string;
    }
    
    const dataMap = new Map<string, SensoryDataPoint>();
    
    sensoryInputs.forEach(sensory => {
      const existing = dataMap.get(sensory.sensoryType);
      
      if (existing) {
        const currentValue = existing[sensory.response];
        existing[sensory.response] = (typeof currentValue === 'number' ? currentValue : 0) + 1;
        existing.total = (existing.total || 0) + 1;
      } else {
        dataMap.set(sensory.sensoryType, {
          type: sensory.sensoryType,
          [sensory.response]: 1,
          total: 1
        });
      }
    });
    
    return Array.from(dataMap.values());
  }, [sensoryInputs]);

  // Memoize emotion distribution for pie chart
  const pieData = useMemo(() => {
    const distribution = new Map<string, number>();
    
    emotions.forEach(emotion => {
      distribution.set(emotion.emotion, (distribution.get(emotion.emotion) || 0) + 1);
    });
    
    return Array.from(distribution.entries()).map(([emotion, count]) => ({
      name: emotion,
      value: count,
    }));
  }, [emotions]);

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
      {emotionData.length > 0 && (
        <Card className="bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Emotion Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Normalize source: ensure every row has all emotion keys so all lines can render together
              const allEmotionKeys = Array.from(
                new Set([
                  ...Object.keys(emotionColors),
                  ...emotions.map(e => e.emotion)
                ])
              );
              const normalizedSource = emotionData.map(row => {
                const base: Record<string, number | string> = { ...row };
                allEmotionKeys.forEach(k => {
                  if (typeof base[k] !== 'number') base[k] = 0;
                });
                return base;
              });
              // Series for every known emotion (consistent order and colors)
              const allSeries = allEmotionKeys.map((emotion) => {
                const color = (emotionColors as Record<string, string>)[emotion];
                return {
                  type: "line" as const,
                  smooth: true,
                  showSymbol: true,
                  symbolSize: 6,
                  encode: { x: "date", y: emotion },
                  name: emotion,
                  itemStyle: color ? { color } : undefined,
                  lineStyle: { width: 2 }
                };
              });
              // Explicitly select all lines by default
              const selectedMap = allEmotionKeys.reduce<Record<string, boolean>>((acc, k) => {
                acc[k] = true;
                return acc;
              }, {});
              const option: EChartsOption = {
                dataset: { source: normalizedSource },
                grid: { top: 32, right: 24, bottom: 40, left: 48 },
                xAxis: { type: "category", name: "Date", nameGap: 24 },
                yAxis: { type: "value", name: "Intensity", nameGap: 28, min: 0 },
                tooltip: { trigger: "axis", axisPointer: { type: "line" } },
                legend: { top: 0, selected: selectedMap },
                series: allSeries,
              };
              return <EChartContainer option={option} height={300} aria-label="Emotion trends line chart" />;
            })()}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        {pieData.length > 0 && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Emotion Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                type PieItemCallbackParam = { name?: string };
                const option: EChartsOption = {
                  dataset: { source: pieData.map((d) => ({ name: d.name, value: d.value })) },
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
            </CardContent>
          </Card>
        )}

        {/* Sensory Responses */}
        {sensoryData.length > 0 && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sensory Response Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const option: EChartsOption = {
                  dataset: { source: sensoryData },
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