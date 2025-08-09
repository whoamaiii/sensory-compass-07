export interface ProgressiveChartData {
  // For line charts (emotion trends over time)
  // Rows with columns: date, count, and each emotion key as number
  emotionTrends: Array<Record<string, number | string>>;
  // For pie charts
  emotionDistribution: Array<{ name: string; value: number }>;
  // For bar charts (sensory responses per type)
  sensoryResponses: Array<{ type: string; total: number; [key: string]: string | number }>;
}

export interface ProgressiveChartDataState {
  isLoading: boolean;
  steps: {
    emotionDistribution: boolean;
    sensoryResponses: boolean;
    emotionTrends: boolean;
  };
  error: Error | null;
}

