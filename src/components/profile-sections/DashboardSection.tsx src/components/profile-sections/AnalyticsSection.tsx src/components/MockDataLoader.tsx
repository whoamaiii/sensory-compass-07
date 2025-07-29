import { TimeRange } from 'react-day-picker';

export type DashboardSectionProps = {
  student: Student;
  trackingEntries: TrackingEntry[];
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  selectedRange: TimeRange;
  onRangeChange: (newRange: TimeRange) => void;
  insights: any;
  isLoadingInsights: boolean;
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  student,
  trackingEntries,
  filteredData,
  selectedRange,
  onRangeChange,
  insights,
  isLoadingInsights,
}) => {
  const { tDashboard } = useTranslation();
  // ... existing code ...
};

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
  // ... existing code ...
};

interface MockDataLoaderProps {
  onDataLoaded?: () => void;
}

export const MockDataLoader: React.FC<MockDataLoaderProps> = ({ onDataLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ... existing code ...
    } finally {
      setIsLoading(false);
      if (onDataLoaded) {
        onDataLoaded();
      }
    }
  };

  return (
    // ... existing code ...
  );
}; 