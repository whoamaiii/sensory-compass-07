import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type {
  EChartsOption,
  GridComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption
} from "echarts";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type EventsMap = Record<string, (params: unknown) => void>;

export type EChartContainerProps = {
  option: EChartsOption;
  className?: string;
  height?: number | string;
  width?: number | string;
  onEvents?: EventsMap;
  style?: React.CSSProperties;
};

// Emotion-specific colors for autism-friendly visualization
const emotionColors = {
  happy: "hsl(90 70% 65%)",      // Soft green
  calm: "hsl(180 45% 75%)",      // Soft blue
  anxious: "hsl(40 65% 70%)",    // Soft yellow/orange
  sad: "hsl(220 45% 65%)",       // Muted blue
  angry: "hsl(10 70% 65%)",      // Soft red
  excited: "hsl(280 55% 70%)",   // Soft purple
  overwhelmed: "hsl(300 40% 60%)", // Muted magenta
  neutral: "hsl(240 8% 63%)"     // Gray
};

// Sensory-specific colors
const sensoryColors = {
  visual: "hsl(240 60% 70%)",
  auditory: "hsl(300 50% 70%)",
  tactile: "hsl(120 50% 70%)",
  vestibular: "hsl(60 60% 70%)",
  proprioceptive: "hsl(180 55% 70%)"
};

const baseTheme = {
    color: [
      "hsl(var(--primary))",        // Primary purple
      emotionColors.calm,            // Calm blue
      emotionColors.happy,           // Happy green
      emotionColors.anxious,         // Anxious yellow
      emotionColors.sad,             // Sad blue
      emotionColors.excited,         // Excited purple
      emotionColors.overwhelmed,     // Overwhelmed magenta
      emotionColors.neutral          // Neutral gray
    ],
    backgroundColor: "transparent",
    textStyle: {
      color: "hsl(var(--foreground))",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize: 13
    },
    grid: {
      top: 48,
      right: 24,
      bottom: 48,
      left: 56,
      containLabel: true,
      backgroundColor: "rgba(0, 0, 0, 0.02)",
      borderColor: "transparent"
    },
    axisPointer: { 
      lineStyle: { 
        color: "hsl(var(--primary))", 
        width: 2,
        type: 'dashed'
      },
      label: {
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--primary))",
        borderWidth: 1,
        color: "hsl(var(--foreground))",
        fontSize: 12,
        padding: [4, 8]
      }
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--primary) / 0.5)",
      borderWidth: 1,
      textStyle: { 
        color: "hsl(var(--foreground))", 
        fontSize: 14,
        fontWeight: 500
      },
      padding: [12, 16],
      // Tooltip formatter with extra type guards to prevent chart breakage
      formatter: function (params: any) {
        const formatValue = (value: number) => {
          return typeof value === 'number' ? value.toFixed(1) : value;
        };
        const getEmotionIcon = (name: string) => {
          const icons: Record<string, string> = {
            happy: '😊',
            sad: '😢',
            anxious: '😰',
            calm: '😌',
            excited: '🤗',
            angry: '😤',
            overwhelmed: '😵',
            default: '🔵'
          };
          if (typeof name !== "string") return icons.default;
          return icons[name.toLowerCase()] || icons.default;
        };
        // Multi-series (array) tooltips
        if (Array.isArray(params) && params.length > 0 && params[0] && typeof params[0] === "object") {
          const date = params[0]?.axisValueLabel || '';
          let content = `<div style="font-weight: 600; margin-bottom: 8px; color: hsl(var(--foreground))">${date}</div>`;
          params.forEach((p: any) => {
            if (p && typeof p === 'object' && 'seriesName' in p && 'color' in p && 'value' in p) {
              const icon = getEmotionIcon(p.seriesName);
              content += `
                <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                  <span style="font-size: 16px;">${icon}</span>
                  <span style="color: ${p.color}; font-weight: 500;">${p.seriesName}:</span>
                  <span style="font-weight: 600;">${formatValue(p.value)}</span>
                </div>
              `;
            }
          });
          return content;
        }
        // Single-series fallback
        if (params && typeof params === "object" && 'seriesName' in params && 'name' in params && 'color' in params && 'value' in params) {
          const icon = getEmotionIcon(params.seriesName);
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">${icon}</span>
              <span style="color: ${params.color}; font-weight: 500;">${params.seriesName}:</span>
              <span style="font-weight: 600;">${formatValue(params.value)}</span>
            </div>
          `;
        }
        // Fallback in case of unrecognized params shape
        return "";
      },
      extraCssText: "border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); backdrop-filter: blur(10px);"
    },
    xAxis: {
      axisLine: { 
        lineStyle: { 
          color: "hsl(var(--border))",
          width: 2
        } 
      },
      axisTick: { 
        show: true,
        lineStyle: { color: "hsl(var(--border))" }
      },
      axisLabel: { 
        color: "hsl(var(--foreground))", 
        fontSize: 12,
        fontWeight: 500,
        margin: 12
      },
      splitLine: { 
        lineStyle: { 
          color: "hsl(var(--border) / 0.15)",
          type: 'dashed'
        } 
      }
    },
    yAxis: {
      axisLine: { 
        show: true, 
        lineStyle: { 
          color: "hsl(var(--border))",
          width: 2
        } 
      },
      axisTick: { 
        show: true,
        lineStyle: { color: "hsl(var(--border))" }
      },
      axisLabel: { 
        color: "hsl(var(--foreground))", 
        fontSize: 12,
        fontWeight: 500,
        margin: 12
      },
      splitLine: { 
        lineStyle: { 
          color: "hsl(var(--border) / 0.15)",
          type: 'dashed'
        } 
      },
      name: "Intensity",
      nameTextStyle: {
        color: "hsl(var(--muted-foreground))",
        fontSize: 12,
        padding: [0, 0, 8, 0]
      }
    },
    legend: {
      show: true,
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      textStyle: {
        color: "hsl(var(--foreground))",
        fontSize: 14,
        fontWeight: 500
      },
      inactiveColor: "hsl(var(--muted-foreground) / 0.5)",
      pageTextStyle: {
        color: "hsl(var(--foreground))"
      }
    },
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
} as const;

export function EChartContainer({
  option,
  className,
  height = 320,
  width = "100%",
  onEvents,
  style
}: EChartContainerProps) {
  // Defensive: guard against undefined/empty/invalid options
  const safeOption: EChartsOption = useMemo(() => {
    try {
      if (!option || typeof option !== "object") {
        if (import.meta?.env?.DEV) {
          logger.warn("[EChartContainer] Received invalid option, using fallback");
        }
        return { series: [], xAxis: {}, yAxis: {} } as EChartsOption;
    }
      const series = (option as any).series;
      if (series == null) {
        return { ...option, series: [] } as EChartsOption;
      }
      if (Array.isArray(series)) {
        // Ensure each series has a type to avoid echarts throwing
        const normalized = series.map((s) => (s && typeof s === "object" ? s : {}));
        return { ...(option as any), series: normalized } as EChartsOption;
      }
      // Non-array series objects are allowed by echarts, keep as-is
      return option as EChartsOption;
    } catch (e) {
      if (import.meta?.env?.DEV) {
        logger.error("[EChartContainer] Option normalization failed", { error: e });
      }
      return { series: [], xAxis: {}, yAxis: {} } as EChartsOption;
    }
  }, [option]);

  const themed = useMemo(() => {
    try {
      const xAxis = (safeOption as EChartsOption).xAxis as XAXisComponentOption | XAXisComponentOption[] | undefined;
      const yAxis = (safeOption as EChartsOption).yAxis as YAXisComponentOption | YAXisComponentOption[] | undefined;

      const normalizeXAxis = (xa?: XAXisComponentOption | XAXisComponentOption[]) =>
        Array.isArray(xa)
          ? xa.map((x) => ({ ...baseTheme.xAxis, ...x } as XAXisComponentOption))
          : ({ ...baseTheme.xAxis, ...(xa as XAXisComponentOption) } as XAXisComponentOption);

      const normalizeYAxis = (ya?: YAXisComponentOption | YAXisComponentOption[]) =>
        Array.isArray(ya)
          ? ya.map((y) => ({ ...baseTheme.yAxis, ...y } as YAXisComponentOption))
          : ({ ...baseTheme.yAxis, ...(ya as YAXisComponentOption) } as YAXisComponentOption);

      const themedOption: EChartsOption = {
        ...(safeOption as EChartsOption),
        backgroundColor: baseTheme.backgroundColor,
        textStyle: { ...baseTheme.textStyle, ...(safeOption as EChartsOption).textStyle },
        grid: { ...baseTheme.grid, ...(safeOption as EChartsOption).grid } as GridComponentOption,
        xAxis: normalizeXAxis(xAxis),
        yAxis: normalizeYAxis(yAxis),
        color: (safeOption as EChartsOption).color ?? (baseTheme.color as unknown as string[]),
        tooltip: { ...baseTheme.tooltip, ...(safeOption as EChartsOption).tooltip } as TooltipComponentOption,
      };

      return themedOption;
    } catch (e) {
      if (import.meta?.env?.DEV) {
        logger.error("[EChartContainer] Theme merge failed", { 
          error: e,
          optionPreview: (() => {
            try { return JSON.stringify(safeOption, (_k, v) => (v instanceof Date ? v.toISOString() : v)); } catch { return "[unserializable]"; }
          })()
        });
      }
      return { series: [] } as EChartsOption;
    }
  }, [safeOption]);

  // Fail-soft: treat non-array truthy series as having data, but avoid crashing render
  const hasSeries =
    Array.isArray((themed as any).series) ? (themed as any).series.length > 0 : Boolean((themed as any).series);

  return (
    <div className={cn("rounded-xl border bg-card", className)} style={{ overflow: "hidden" }}>
      {hasSeries ? (
        <ReactECharts
          option={themed}
          notMerge={false}
          lazyUpdate
          style={{ height, width, ...style }}
          onEvents={onEvents}
        />
      ) : (
        <div style={{ height, width }} className="flex items-center justify-center text-sm text-muted-foreground">
          No chart data
        </div>
      )}
    </div>
  );
}

