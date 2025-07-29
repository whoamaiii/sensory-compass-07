import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { useTranslation } from "@/hooks/useTranslation";
import {
// ... existing code ...
  selectedRange: TimeRange;
  onRangeChange: (newRange: TimeRange) => void;
  insights: any;
  isLoadingInsights: boolean;
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({
// ... existing code ...
  selectedRange,
  onRangeChange,
  insights,
  isLoadingInsights,
}) => {
  const { tDashboard } = useTranslation();
// ... existing code ...
      </div>

      {isLoadingInsights ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : insights ? (
        <ErrorBoundary>
          <InteractiveDataVisualization
// ... existing code ...

import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { useTranslation } from "@/hooks/useTranslation";

type AnalyticsSectionProps = {
  student: Student;
  trackingEntries: TrackingEntry[];
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  insights: any;
  isLoadingInsights: boolean;
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  student,
  trackingEntries,
  filteredData,
  insights,
  isLoadingInsights,
}) => {
  const { tAnalytics } = useTranslation();
  const { getCorrelationMatrix, getAnomalies } = useOptimizedInsights(
// ... existing code ...
    </Card>
  );

  const renderContent = () => {
    if (isLoadingInsights) {
      return (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
// ... existing code ...
