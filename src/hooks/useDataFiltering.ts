import { useState, useMemo } from "react";
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

  const filteredData = useMemo(() => {
    const filteredEntries = trackingEntries.filter(entry =>
      isWithinInterval(entry.timestamp, { start: selectedRange.start, end: selectedRange.end })
    );

    const filteredEmotions = allEmotions.filter(emotion =>
      isWithinInterval(emotion.timestamp, { start: selectedRange.start, end: selectedRange.end })
    );

    const filteredSensoryInputs = allSensoryInputs.filter(sensory =>
      isWithinInterval(sensory.timestamp, { start: selectedRange.start, end: selectedRange.end })
    );

    return {
      entries: filteredEntries,
      emotions: filteredEmotions,
      sensoryInputs: filteredSensoryInputs
    };
  }, [trackingEntries, allEmotions, allSensoryInputs, selectedRange]);

  const handleRangeChange = (newRange: TimeRange) => {
    setSelectedRange(newRange);
  };

  return {
    selectedRange,
    filteredData,
    handleRangeChange
  };
};