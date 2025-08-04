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

type EventsMap = Record<string, (params: unknown) => void>;

export type EChartContainerProps = {
  option: EChartsOption;
  className?: string;
  height?: number | string;
  width?: number | string;
  onEvents?: EventsMap;
  style?: React.CSSProperties;
};

const baseTheme = {
    color: [
      "hsl(var(--primary))",
      "#22c55e",
      "#eab308",
      "#06b6d4",
      "#a78bfa",
      "#ef4444",
      "#f97316",
      "#14b8a6"
    ],
    backgroundColor: "transparent",
    textStyle: {
      color: "hsl(var(--muted-foreground))",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    },
    grid: {
      top: 24,
      right: 16,
      bottom: 28,
      left: 40,
      containLabel: true
    },
    axisPointer: { lineStyle: { color: "hsl(var(--border))", width: 2 } },
    tooltip: {
      trigger: "axis",
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--primary))",
      textStyle: { color: "hsl(var(--foreground))", fontSize: 12 },
      padding: [10, 15],
      formatter: function (params: any) {
        if (Array.isArray(params)) {
          return params.map((p: any) => `${p.marker} ${p.seriesName}: ${p.value}`).join('<br/>');
        }
        return `${params.marker} ${params.seriesName}: ${params.value}`;
      },
      className: "shadow-xl rounded-md border"
    },
    xAxis: {
      axisLine: { lineStyle: { color: "hsl(var(--primary))" } },
      axisTick: { show: true },
      axisLabel: { color: "hsl(var(--muted-foreground))", fontSize: 10 },
      splitLine: { lineStyle: { color: "hsl(var(--border)/.3)" } }
    },
    yAxis: {
      axisLine: { show: true, lineStyle: { color: "hsl(var(--border))" } },
      axisTick: { show: true },
      axisLabel: { color: "hsl(var(--muted-foreground))", fontSize: 10 },
      splitLine: { lineStyle: { color: "hsl(var(--border)/.3)" } }
    },
    animation: true
} as const;

export function EChartContainer({
  option,
  className,
  height = 320,
  width = "100%",
  onEvents,
  style
}: EChartContainerProps) {
  const themed = useMemo(() => {
    const xAxis = (option as EChartsOption).xAxis as XAXisComponentOption | XAXisComponentOption[] | undefined;
    const yAxis = (option as EChartsOption).yAxis as YAXisComponentOption | YAXisComponentOption[] | undefined;

    const normalizeXAxis = (xa?: XAXisComponentOption | XAXisComponentOption[]) =>
      Array.isArray(xa)
        ? xa.map((x) => ({ ...baseTheme.xAxis, ...x } as XAXisComponentOption))
        : ({ ...baseTheme.xAxis, ...(xa as XAXisComponentOption) } as XAXisComponentOption);

    const normalizeYAxis = (ya?: YAXisComponentOption | YAXisComponentOption[]) =>
      Array.isArray(ya)
        ? ya.map((y) => ({ ...baseTheme.yAxis, ...y } as YAXisComponentOption))
        : ({ ...baseTheme.yAxis, ...(ya as YAXisComponentOption) } as YAXisComponentOption);

    const themedOption: EChartsOption = {
      ...option,
      backgroundColor: baseTheme.backgroundColor,
      textStyle: { ...baseTheme.textStyle, ...(option as EChartsOption).textStyle },
      grid: { ...baseTheme.grid, ...(option as EChartsOption).grid } as GridComponentOption,
      xAxis: normalizeXAxis(xAxis),
      yAxis: normalizeYAxis(yAxis),
      color: (option as EChartsOption).color ?? (baseTheme.color as unknown as string[]),
      tooltip: { ...baseTheme.tooltip, ...(option as EChartsOption).tooltip } as TooltipComponentOption,
    };

    return themedOption;
  }, [option]);

  return (
    <div className={cn("rounded-xl border bg-card", className)} style={{ overflow: "hidden" }}>
      <ReactECharts
        option={themed}
        notMerge={false}
        lazyUpdate
        style={{ height, width, ...style }}
        onEvents={onEvents}
      />
    </div>
  );
}

export default EChartContainer;