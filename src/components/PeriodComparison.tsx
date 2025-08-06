import { useState, useMemo } from "react";
import { format, subDays, subWeeks, subMonths, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmotionEntry, SensoryEntry } from "@/types/student";
import { TimeRange } from "./DateRangeSelector";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface PeriodComparisonProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  currentRange: TimeRange;
  className?: string;
}

interface PeriodStats {
  emotionsCount: number;
  sensoryCount: number;
  avgEmotionIntensity: number;
  mostCommonEmotion: string;
  seekingRatio: number;
  period: string;
}

export const PeriodComparison = ({ emotions, sensoryInputs, currentRange, className }: PeriodComparisonProps) => {
  const { tAnalytics, tStudent } = useTranslation();
  const [comparisonPeriod, setComparisonPeriod] = useState<"previous" | "same-last-month" | "same-last-year">("previous");

  const getComparisonRange = (): TimeRange => {
    const startTime = currentRange.start.getTime();
    const endTime = currentRange.end.getTime();
    const duration = endTime - startTime;
    
    switch (comparisonPeriod) {
      case "previous":
        return {
          start: new Date(startTime - duration),
          end: new Date(startTime - 1),
          label: "Previous period"
        };
      case "same-last-month":
        return {
          start: subMonths(currentRange.start, 1),
          end: subMonths(currentRange.end, 1),
          label: "Same period last month"
        };
      case "same-last-year":
        return {
          start: new Date(currentRange.start.getFullYear() - 1, currentRange.start.getMonth(), currentRange.start.getDate()),
          end: new Date(currentRange.end.getFullYear() - 1, currentRange.end.getMonth(), currentRange.end.getDate()),
          label: "Same period last year"
        };
      default:
        return currentRange;
    }
  };

  const calculatePeriodStats = (emotions: EmotionEntry[], sensoryInputs: SensoryEntry[], range: TimeRange): PeriodStats => {
    const filteredEmotions = emotions.filter(e => 
      isWithinInterval(e.timestamp, { start: range.start, end: range.end })
    );
    const filteredSensory = sensoryInputs.filter(s => 
      isWithinInterval(s.timestamp, { start: range.start, end: range.end })
    );

    const avgIntensity = filteredEmotions.length > 0 
      ? filteredEmotions.reduce((sum, e) => sum + e.intensity, 0) / filteredEmotions.length 
      : 0;

    const emotionCounts = filteredEmotions.reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

    const seekingCount = filteredSensory.filter(s => s.response === 'seeking').length;
    const seekingRatio = filteredSensory.length > 0 ? seekingCount / filteredSensory.length : 0;

    return {
      emotionsCount: filteredEmotions.length,
      sensoryCount: filteredSensory.length,
      avgEmotionIntensity: avgIntensity,
      mostCommonEmotion: mostCommon,
      seekingRatio,
      period: range.label
    };
  };

  const comparisonRange = getComparisonRange();
  const currentStats = calculatePeriodStats(emotions, sensoryInputs, currentRange);
  const comparisonStats = calculatePeriodStats(emotions, sensoryInputs, comparisonRange);

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-emerald-600";
    if (current < previous) return "text-red-600";
    return "text-muted-foreground";
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const comparisonMetrics = [
    {
      label: String(tAnalytics('interface.totalEmotions')),
      current: currentStats.emotionsCount,
      previous: comparisonStats.emotionsCount,
    },
    {
      label: String(tStudent('interface.sensoryInputs')),
      current: currentStats.sensoryCount,
      previous: comparisonStats.sensoryCount,
    },
    {
      label: String(tAnalytics('interface.avgIntensity')),
      current: currentStats.avgEmotionIntensity,
      previous: comparisonStats.avgEmotionIntensity,
      format: (val: number) => val.toFixed(1)
    },
    {
      label: String(tAnalytics('interface.seekingRatio')),
      current: currentStats.seekingRatio,
      previous: comparisonStats.seekingRatio,
      format: (val: number) => `${(val * 100).toFixed(1)}%`
    }
  ];

  return (
    <Card className={cn("bg-gradient-card border-0 shadow-soft font-dyslexia", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {String(tAnalytics('interface.periodComparison'))}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={comparisonPeriod === "previous" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonPeriod("previous")}
              className="text-xs"
            >
              {String(tAnalytics('interface.previous'))}
            </Button>
            <Button
              variant={comparisonPeriod === "same-last-month" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonPeriod("same-last-month")}
              className="text-xs"
            >
              {String(tAnalytics('interface.lastMonth'))}
            </Button>
            <Button
              variant={comparisonPeriod === "same-last-year" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonPeriod("same-last-year")}
              className="text-xs"
            >
              {String(tAnalytics('interface.lastYear'))}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{currentRange.label}</span>
          <span>vs</span>
          <span>{comparisonRange.label}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {comparisonMetrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-semibold">
                  {metric.format ? metric.format(metric.current) : metric.current}
                </span>
                {getTrendIcon(metric.current, metric.previous)}
              </div>
              <div className={cn("text-xs font-medium", getTrendColor(metric.current, metric.previous))}>
                {getPercentageChange(metric.current, metric.previous)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                vs {metric.format ? metric.format(metric.previous) : metric.previous}
              </div>
            </div>
          ))}
        </div>

        {/* Key Changes */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3">{String(tAnalytics('interface.keyChanges'))}</h4>
          <div className="space-y-2">
            {currentStats.mostCommonEmotion !== comparisonStats.mostCommonEmotion && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Emotion</Badge>
                <span className="text-muted-foreground">
                  Most common changed from <span className="font-medium">{comparisonStats.mostCommonEmotion}</span> to{" "}
                  <span className="font-medium">{currentStats.mostCommonEmotion}</span>
                </span>
              </div>
            )}
            
            {Math.abs(currentStats.avgEmotionIntensity - comparisonStats.avgEmotionIntensity) > 0.5 && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Intensity</Badge>
                <span className="text-muted-foreground">
                  Average intensity{" "}
                  {currentStats.avgEmotionIntensity > comparisonStats.avgEmotionIntensity ? "increased" : "decreased"} by{" "}
                  <span className="font-medium">
                    {Math.abs(currentStats.avgEmotionIntensity - comparisonStats.avgEmotionIntensity).toFixed(1)} points
                  </span>
                </span>
              </div>
            )}

            {Math.abs(currentStats.seekingRatio - comparisonStats.seekingRatio) > 0.1 && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Sensory</Badge>
                <span className="text-muted-foreground">
                  Sensory seeking behavior{" "}
                  {currentStats.seekingRatio > comparisonStats.seekingRatio ? "increased" : "decreased"} by{" "}
                  <span className="font-medium">
                    {Math.abs((currentStats.seekingRatio - comparisonStats.seekingRatio) * 100).toFixed(1)}%
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};