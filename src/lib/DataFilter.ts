import { subDays, startOfDay, addDays } from 'date-fns';
import { EmotionEntry, SensoryEntry, TrackingEntry, EnvironmentalEntry } from '@/types/student';

export interface FilterCriteria {
  dateRange: { start: Date | null; end: Date | null };
  emotions: { types: string[]; intensityRange: [number, number]; includeTriggers: string[]; excludeTriggers: string[] };
  sensory: { types: string[]; responses: string[]; intensityRange: [number, number] };
  environmental: {
    locations: string[];
    activities: string[];
    conditions: { noiseLevel: [number, number]; temperature: [number, number]; lighting: string[] };
    weather: string[];
    timeOfDay: string[];
  };
  patterns: { anomaliesOnly: boolean; minConfidence: number; patternTypes: string[] };
  realtime: boolean;
}

export const initialFilterCriteria: FilterCriteria = {
  dateRange: { start: null, end: null },
  emotions: { types: [], intensityRange: [0, 10], includeTriggers: [], excludeTriggers: [] },
  sensory: { types: [], responses: [], intensityRange: [0, 10] },
  environmental: {
    locations: [],
    activities: [],
    conditions: { noiseLevel: [0, 10], temperature: [15, 30], lighting: [] },
    weather: [],
    timeOfDay: []
  },
  patterns: { anomaliesOnly: false, minConfidence: 0, patternTypes: [] },
  realtime: false
};

export const applyFilters = <T extends { timestamp: Date }>(
  data: T[],
  criteria: FilterCriteria,
  getEmotionData?: (item: T) => EmotionEntry | null,
  getSensoryData?: (item: T) => SensoryEntry | null,
  getEnvironmentalData?: (item: T) => EnvironmentalEntry | null
): T[] => {
  return data.filter(item => {
    // Date range filter
    if (criteria.dateRange.start || criteria.dateRange.end) {
      const start = criteria.dateRange.start ? startOfDay(criteria.dateRange.start) : new Date(0);
      const endExclusive = criteria.dateRange.end ? addDays(startOfDay(criteria.dateRange.end), 1) : new Date(8640000000000000);
      const ts = item.timestamp;
      if (!(ts >= start && ts < endExclusive)) return false;
    }

    // Emotion filters
    if (getEmotionData) {
      const emotion = getEmotionData(item);
      if (emotion) {
        if (criteria.emotions.types.length > 0 && !criteria.emotions.types.includes(emotion.emotion)) {
          return false;
        }
        if (emotion.intensity < criteria.emotions.intensityRange[0] || emotion.intensity > criteria.emotions.intensityRange[1]) {
          return false;
        }
        if (criteria.emotions.includeTriggers.length > 0 && !emotion.triggers?.some(t => criteria.emotions.includeTriggers.includes(t))) {
          return false;
        }
        if (criteria.emotions.excludeTriggers.length > 0 && emotion.triggers?.some(t => criteria.emotions.excludeTriggers.includes(t))) {
          return false;
        }
      }
    }

    // Sensory filters
    if (getSensoryData) {
      const sensory = getSensoryData(item);
      if (sensory) {
        const sensoryType = sensory.sensoryType || sensory.type || '';
        if (criteria.sensory.types.length > 0 && !criteria.sensory.types.includes(sensoryType)) {
          return false;
        }
        if (criteria.sensory.responses.length > 0 && !criteria.sensory.responses.includes(sensory.response)) {
          return false;
        }
        if (sensory.intensity && (sensory.intensity < criteria.sensory.intensityRange[0] || sensory.intensity > criteria.sensory.intensityRange[1])) {
          return false;
        }
      }
    }

    // Environmental filters
    if (getEnvironmentalData) {
      const env = getEnvironmentalData(item);
      if (env) {
        if (criteria.environmental.locations.length > 0 && env.location && !criteria.environmental.locations.includes(env.location)) {
          return false;
        }
        if (criteria.environmental.activities.length > 0 && env.classroom?.activity && !criteria.environmental.activities.includes(env.classroom.activity)) {
          return false;
        }
        if (criteria.environmental.weather.length > 0 && env.weather?.condition && !criteria.environmental.weather.includes(env.weather.condition)) {
          return false;
        }
        if (env.roomConditions?.noiseLevel && (env.roomConditions.noiseLevel < criteria.environmental.conditions.noiseLevel[0] || env.roomConditions.noiseLevel > criteria.environmental.conditions.noiseLevel[1])) {
          return false;
        }
      }
    }

    return true;
  });
};
