import type { EChartsOption, SeriesOption } from 'echarts';
import type { CorrelationMatrix } from '@/lib/enhancedPatternAnalysis';

/**
 * ChartKit – option builders
 *
 * These helpers produce ECharts options using a stable schema and
 * explicitly disable hover-dimming on series. We set emphasis.disabled,
 * focus: 'none', and a fully opaque blur state to improve readability
 * and avoid the visual effect of lines "disappearing" when hovering.
 */

/**
 * Strongly-typed input row for trend charts. Keep this flat and numeric so the
 * chart layer is deterministic and tooltips never receive object-shaped values.
 */
export interface TrendRow {
  date: string; // yyyy-MM-dd (displayed on x-axis)
  avgEmotionIntensity: number;
  positiveEmotions: number;
  negativeEmotions: number;
  totalSensoryInputs: number;
}

/** Configuration for the emotion trends chart. */
export interface EmotionTrendsConfig {
  title?: string;
  showMovingAverage: boolean;
  movingAverageWindow: number; // e.g., 7 for 7d MA
  useDualYAxis: boolean; // sensory on right axis
  thresholds?: { emotion?: number; sensory?: number };
}

/**
 * Compute a simple moving average array for a numeric series.
 */
function computeMovingAverage(values: number[], window: number): number[] {
  if (!Number.isFinite(window) || window <= 1) return values.slice();
  const ma: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    const outIndex = i - window;
    if (outIndex >= 0) sum -= values[outIndex] ?? 0;
    const denom = Math.min(i + 1, window);
    ma[i] = Number((sum / denom).toFixed(2));
  }
  return ma;
}

/** Ensure numbers are finite; coerce invalid values to 0 for stable visuals. */
function toFiniteNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build an ECharts option for the main Emotion & Sensory trends chart.
 * Pure function – safe to unit test.
 */
export function buildEmotionTrendsOption(rows: TrendRow[], config: EmotionTrendsConfig): EChartsOption {
  const dates = rows.map(r => r.date);
  const avg = rows.map(r => toFiniteNumber(r.avgEmotionIntensity));
  const pos = rows.map(r => toFiniteNumber(r.positiveEmotions));
  const neg = rows.map(r => toFiniteNumber(r.negativeEmotions));
  const sensory = rows.map(r => toFiniteNumber(r.totalSensoryInputs));

  const avgMA = config.showMovingAverage
    ? computeMovingAverage(avg, Math.max(2, config.movingAverageWindow))
    : [];

  const series: SeriesOption[] = [
    {
      type: 'line',
      name: 'Avg Emotion Intensity',
      data: avg,
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 3 },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
      markLine: config.thresholds?.emotion
        ? {
            silent: true,
            data: [
              {
                yAxis: config.thresholds.emotion,
                label: { position: 'end', formatter: 'Emotion Threshold' },
                lineStyle: { type: 'dashed', width: 2 },
              },
            ],
          }
        : undefined,
    },
    ...(config.showMovingAverage
      ? ([
          {
            type: 'line',
            name: `Avg Intensity (${config.movingAverageWindow}d MA)`,
            data: avgMA,
            smooth: true,
            showSymbol: false,
            sampling: 'lttb',
            lineStyle: { width: 2 },
            emphasis: { focus: 'none', disabled: true },
            blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
          },
        ] as SeriesOption[])
      : []),
    {
      type: 'line',
      name: 'Positive Emotions',
      data: pos,
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 2 },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
    },
    {
      type: 'line',
      name: 'Negative Emotions',
      data: neg,
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 2 },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
    },
    {
      type: 'line',
      name: 'Sensory Inputs',
      data: sensory,
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 2, type: 'dashed' },
      emphasis: { focus: 'none', disabled: true },
      blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 } },
      yAxisIndex: config.useDualYAxis ? 1 : 0,
      markLine: config.thresholds?.sensory
        ? {
            silent: true,
            data: [
              {
                yAxis: config.thresholds.sensory,
                label: { position: 'end', formatter: 'Sensory Threshold' },
                lineStyle: { type: 'dashed', width: 2 },
              },
            ],
          }
        : undefined,
    },
  ];

  const option: EChartsOption = {
    title: config.title
      ? { left: 'center', top: 0, text: config.title }
      : undefined,
    legend: {
      hoverLink: false,
      bottom: 0,
      data: [
        'Avg Emotion Intensity',
        ...(config.showMovingAverage ? [`Avg Intensity (${config.movingAverageWindow}d MA)`] : []),
        'Positive Emotions',
        'Negative Emotions',
        'Sensory Inputs',
      ],
      selected: {
        'Avg Emotion Intensity': true,
        ...(config.showMovingAverage ? { [`Avg Intensity (${config.movingAverageWindow}d MA)`]: true } : {}),
        'Positive Emotions': true,
        'Negative Emotions': true,
        'Sensory Inputs': false,
      },
    },
    tooltip: { trigger: 'axis', confine: true },
    toolbox: {
      show: true,
      right: 16,
      top: 16,
      feature: {
        dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom', back: 'Reset' } },
        restore: { title: 'Reset' },
        saveAsImage: { title: 'Save', pixelRatio: 2 },
      },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100, minValueSpan: 7 },
      {
        show: true,
        type: 'slider',
        bottom: 50,
        start: 0,
        end: 100,
        height: 20,
      },
    ],
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: config.useDualYAxis
      ? [
          { type: 'value', max: 10, min: 0, interval: 2, name: 'Intensity' },
          { type: 'value', name: 'Sensory Inputs', alignTicks: true, min: 'dataMin' },
        ]
      : [{ type: 'value', max: 10, min: 0, interval: 2, name: 'Intensity' }],
    series,
    grid: { bottom: 72 },
  };

  return option;
}

/** Simpler area option builder using the same TrendRow type. */
export function buildAreaOption(rows: TrendRow[]): EChartsOption {
  const dates = rows.map(r => r.date);
  return {
    tooltip: { trigger: 'axis' },
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: [{ type: 'value' }],
    series: [
      {
        type: 'line',
        name: 'Avg Emotion Intensity',
        data: rows.map(r => toFiniteNumber(r.avgEmotionIntensity)),
        smooth: true,
        showSymbol: false,
        areaStyle: {},
        lineStyle: { width: 3 },
        emphasis: { focus: 'none' },
      },
      {
        type: 'line',
        name: 'Positive Emotions',
        data: rows.map(r => toFiniteNumber(r.positiveEmotions)),
        smooth: true,
        showSymbol: false,
        areaStyle: {},
        lineStyle: { width: 2 },
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Scatter option with numeric axes for correlation-like view. */
export function buildScatterOption(rows: TrendRow[]): EChartsOption {
  return {
    tooltip: { trigger: 'item' },
    legend: {},
    xAxis: { type: 'value', name: 'Avg Emotion Intensity' },
    yAxis: { type: 'value', name: 'Sensory Inputs' },
    series: [
      {
        name: 'Daily Data Points',
        type: 'scatter',
        data: rows.map(r => [toFiniteNumber(r.avgEmotionIntensity), toFiniteNumber(r.totalSensoryInputs)]),
        symbolSize: 8,
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Composed bar+line option builder using the same rows. */
export function buildComposedOption(rows: TrendRow[]): EChartsOption {
  const dates = rows.map(r => r.date);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: [{ type: 'value' }, { type: 'value' }],
    series: [
      {
        type: 'bar',
        name: 'Positive Emotions',
        data: rows.map(r => toFiniteNumber(r.positiveEmotions)),
        yAxisIndex: 0,
        emphasis: { focus: 'none' },
      },
      {
        type: 'bar',
        name: 'Negative Emotions',
        data: rows.map(r => toFiniteNumber(r.negativeEmotions)),
        yAxisIndex: 0,
        emphasis: { focus: 'none' },
      },
      {
        type: 'line',
        name: 'Avg Intensity',
        data: rows.map(r => toFiniteNumber(r.avgEmotionIntensity)),
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 3 },
        showSymbol: false,
        emphasis: { focus: 'none' },
      },
    ],
  } as EChartsOption;
}

/** Correlation heatmap option builder (ECharts). */
export function buildCorrelationHeatmapOption(matrix: CorrelationMatrix): EChartsOption {
  const factors = matrix.factors ?? [];
  const values: Array<[number, number, number]> = [];
  for (let i = 0; i < matrix.matrix.length; i++) {
    const row = matrix.matrix[i] || [];
    for (let j = 0; j < row.length; j++) {
      const vRaw = row[j];
      const v = typeof vRaw === 'number' && Number.isFinite(vRaw) ? vRaw : 0;
      values.push([j, i, Number(v.toFixed(2))]);
    }
  }

  // Map for quick significance lookup in tooltip
  const significanceMap = new Map<string, { significance: string; correlation: number }>();
  for (const p of matrix.significantPairs || []) {
    const key1 = `${p.factor1}__${p.factor2}`;
    const key2 = `${p.factor2}__${p.factor1}`;
    significanceMap.set(key1, { significance: p.significance, correlation: p.correlation });
    significanceMap.set(key2, { significance: p.significance, correlation: p.correlation });
  }

  const option: EChartsOption = {
    grid: { top: 80, left: 120, right: 64, bottom: 60, containLabel: true },
    xAxis: {
      type: 'category',
      data: factors,
      axisLabel: { rotate: 40, margin: 16 },
    },
    yAxis: {
      type: 'category',
      data: factors,
      axisLabel: { margin: 12 },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: true,
      formatter: (p: any) => {
        const i = p?.value?.[1];
        const j = p?.value?.[0];
        const f1 = factors[i] ?? '';
        const f2 = factors[j] ?? '';
        const key = `${f1}__${f2}`;
        const sig = significanceMap.get(key)?.significance;
        const corr = typeof p?.value?.[2] === 'number' ? p.value[2] : Number(p.value?.[2]) || 0;
        const sign = corr > 0 ? 'Positive' : corr < 0 ? 'Negative' : 'Neutral';
        return `<div style="font-weight:600;margin-bottom:6px">${f1} ↔ ${f2}</div>
                <div>Correlation: <b>${corr.toFixed(2)}</b> (${sign})</div>
                ${sig ? `<div>Significance: <b>${sig}</b></div>` : ''}`;
      }
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'vertical',
      right: 8,
      top: 40,
      text: ['Positiv', 'Negativ'],
      inRange: {
        // Diverging palette: red (neg) → gray (0) → green (pos)
        color: ['#ef4444', '#f3f4f6', '#10b981']
      },
      itemWidth: 12,
      itemHeight: 100,
      textStyle: { color: 'hsl(var(--muted-foreground))' },
    },
    series: [
      {
        type: 'heatmap',
        data: values,
        label: {
          show: true,
          formatter: (params: any) => {
            const v = typeof params?.value?.[2] === 'number' ? params.value[2] : Number(params?.value?.[2]) || 0;
            // Only label moderate/strong correlations to reduce clutter
            return Math.abs(v) >= 0.25 ? v.toFixed(2) : '';
          },
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: '#374151' // Tailwind gray-700 for better contrast on dark backgrounds
        },
        emphasis: { disabled: true, focus: 'none' },
        progressive: 0,
        // Larger cells for readability
        // ECharts sizes cells automatically based on grid/category count
      },
    ],
  };

  return option;
}

