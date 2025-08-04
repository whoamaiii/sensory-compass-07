import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmotionEntry, SensoryEntry } from "@/types/student";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, AlertCircle } from "lucide-react";
import EChartContainer from "@/components/charts/EChartContainer";
import type { EChartsOption } from "echarts";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface DataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  studentName: string;
  showTimeFilter?: boolean;
  selectedRange?: string;
}

// Safe chart wrapper to handle chart rendering errors
const SafeChart = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <ErrorBoundary 
    showToast={false}
    fallback={
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Unable to render {title}</p>
          <p className="text-xs mt-1">Chart data may be invalid or unavailable</p>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const DataVisualization = memo(({ emotions, sensoryInputs, studentName, showTimeFilter = false, selectedRange }: DataVisualizationProps) => {
  // Memoize emotion data processing for performance
  const emotionData = useMemo(() => {
    type EmotionRow = { date: string; count: number; [k: string]: number | string };
    return emotions.reduce<EmotionRow[]>((acc, emotion) => {
      const timestamp = emotion.timestamp instanceof Date ? emotion.timestamp : new Date(emotion.timestamp as unknown as string);
      const date = isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing[emotion.emotion] = (Number(existing[emotion.emotion] || 0) as number) + emotion.intensity;
        existing.count = (Number(existing.count || 0) as number) + 1;
      } else {
        acc.push({
          date,
          [emotion.emotion]: emotion.intensity,
          count: 1
        });
      }
      return acc;
    }, []);
  }, [emotions]);

  // Memoize sensory data processing for performance
  const sensoryData = useMemo(() => {
    type SensoryRow = { type: string; total: number; [k: string]: number | string };
    return sensoryInputs.reduce<SensoryRow[]>((acc, sensory) => {
      const key = sensory.sensoryType;
      const existing = acc.find(item => item.type === key);
      if (existing) {
        existing[sensory.response] = (Number(existing[sensory.response] || 0) as number) + 1;
        existing.total = (Number(existing.total || 0) as number) + 1;
      } else {
        acc.push({
          type: key,
          [sensory.response]: 1,
          total: 1
        });
      }
      return acc;
    }, []);
  }, [sensoryInputs]);

  // Memoize emotion distribution for pie chart
  const pieData = useMemo(() => {
    const emotionDistribution = emotions.reduce((acc, emotion) => {
      acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(emotionDistribution).map(([emotion, count]) => ({
      name: emotion,
      value: count,
    }));
  }, [emotions]);

  const emotionColors = {
    happy: '#10B981',
    calm: '#06B6D4',
    excited: '#8B5CF6',
    sad: '#3B82F6',
    anxious: '#F59E0B',
    angry: '#EF4444',
  };

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

  // Build ECharts options
  const trendsOption: EChartsOption = {
    dataset: { source: emotionData },
    xAxis: { type: "category" },
    yAxis: { type: "value" },
    tooltip: { trigger: "axis" },
    legend: {},
    series: Object.keys(emotionColors).map((emotion) => ({
      name: emotion,
      type: "line",
      smooth: true,
      showSymbol: false,
      emphasis: { focus: "series" },
      lineStyle: { width: 2 },
      data: undefined,
      encode: { x: "date", y: emotion }
    }))
  };

  const pieOption: EChartsOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        name: "Emotions",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "hsl(var(--background))", borderWidth: 2 },
        label: { show: true, formatter: "{b} {d}%" },
        data: pieData.map((p) => ({
          name: p.name,
          value: p.value,
          itemStyle: { color: (emotionColors as Record<string, string>)[p.name] || "#8884d8" }
        }))
      }
    ]
  };

  const sensoryOption: EChartsOption = {
    dataset: { source: sensoryData },
    tooltip: { trigger: "axis" },
    legend: {},
    xAxis: { type: "category" },
    yAxis: { type: "value" },
    series: [
      { type: "bar", name: "Seeking", encode: { x: "type", y: "seeking" } },
      { type: "bar", name: "Avoiding", encode: { x: "type", y: "avoiding" } },
      { type: "bar", name: "Neutral", encode: { x: "type", y: "neutral" } }
    ]
  };

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
      {emotions.length > 0 && (
        <Card className="bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Emotion Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeChart title="emotion trends">
              <EChartContainer option={trendsOption} height={300} />
            </SafeChart>
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
              <SafeChart title="emotion distribution">
                <EChartContainer option={pieOption} height={250} />
              </SafeChart>
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
              <SafeChart title="sensory patterns">
                <EChartContainer option={sensoryOption} height={250} />
              </SafeChart>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.studentName === nextProps.studentName &&
    prevProps.selectedRange === nextProps.selectedRange &&
    prevProps.showTimeFilter === nextProps.showTimeFilter &&
    prevProps.emotions.length === nextProps.emotions.length &&
    prevProps.sensoryInputs.length === nextProps.sensoryInputs.length &&
    // Deep check only if lengths are same
    (prevProps.emotions.length === 0 || 
      (() => {
        try {
          const prevTimestamp = prevProps.emotions[0]?.timestamp;
          const nextTimestamp = nextProps.emotions[0]?.timestamp;
          const prevTime = prevTimestamp instanceof Date ? prevTimestamp.getTime() : 
                           typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number' ? new Date(prevTimestamp).getTime() : 0;
          const nextTime = nextTimestamp instanceof Date ? nextTimestamp.getTime() : 
                           typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number' ? new Date(nextTimestamp).getTime() : 0;
          return prevTime === nextTime;
        } catch {
          return false;
        }
      })()) &&
    (prevProps.sensoryInputs.length === 0 || 
      (() => {
        try {
          const prevTimestamp = prevProps.sensoryInputs[0]?.timestamp;
          const nextTimestamp = nextProps.sensoryInputs[0]?.timestamp;
          const prevTime = prevTimestamp instanceof Date ? prevTimestamp.getTime() : 
                           typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number' ? new Date(prevTimestamp).getTime() : 0;
          const nextTime = nextTimestamp instanceof Date ? nextTimestamp.getTime() : 
                           typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number' ? new Date(nextTimestamp).getTime() : 0;
          return prevTime === nextTime;
        } catch {
          return false;
        }
      })())
  );
});

DataVisualization.displayName = 'DataVisualization';
