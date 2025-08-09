export interface AnalyticsStatus {
  studentId: string;
  studentName: string;
  isInitialized: boolean;
  lastAnalyzed: Date | null;
  healthScore: number;
  hasMinimumData: boolean;
}