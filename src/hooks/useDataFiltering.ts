import { useState, useMemo, useCallback } from "react";
import { isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { EmotionEntry, SensoryEntry, TrackingEntry } from "@/types/student";
import { TimeRange } from "@/components/DateRangeSelector";

export const useDataFiltering = (
  trackingEntries: TrackingEntry[],
  allEmotions: EmotionEntry[],
  allSensoryInputs: SensoryEntry[]
) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>({
    start: startOfDay(subDays(new Date(), 29)),
    end: endOfDay(new Date()),
    label: "Last 30 days"
  });

  // Memoize the filtering logic with better performance
  const filteredData = useMemo(() => {
    // Early return if no data
    if (trackingEntries.length === 0 && allEmotions.length === 0 && allSensoryInputs.length === 0) {
      return {
        entries: [],
        emotions: [],
        sensoryInputs: []
      };
    }

    const { start, end } = selectedRange;
    
    // Use more efficient filtering with early returns
    const filteredEntries = trackingEntries.filter(entry => {
      const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    const filteredEmotions = allEmotions.filter(emotion => {
      const timestamp = emotion.timestamp instanceof Date ? emotion.timestamp : new Date(emotion.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    const filteredSensoryInputs = allSensoryInputs.filter(sensory => {
      const timestamp = sensory.timestamp instanceof Date ? sensory.timestamp : new Date(sensory.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    return {
      entries: filteredEntries,
      emotions: filteredEmotions,
      sensoryInputs: filteredSensoryInputs
    };
  }, [trackingEntries, allEmotions, allSensoryInputs, selectedRange.start, selectedRange.end]);

  const handleRangeChange = useCallback((newRange: TimeRange) => {
    setSelectedRange(newRange);
  }, []);

  return {
    selectedRange,
    filteredData,
    handleRangeChange
  };
};