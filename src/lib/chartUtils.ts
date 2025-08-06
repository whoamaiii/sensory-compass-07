/**
 * Chart Data Processing Utilities
 * 
 * Centralized functions for processing and validating chart data.
 * Ensures data integrity and provides honest representations of missing data.
 */

import { z } from 'zod';
import { format } from 'date-fns';
import type { EmotionEntry as RawEmotionEntry } from '@/types/student';

// Emotion types we track
export const EMOTION_TYPES = ['happy', 'calm', 'excited', 'sad', 'anxious', 'angry'] as const;
export type EmotionType = typeof EMOTION_TYPES[number];

// Emotion emojis for better visual representation
export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happy: '😊',
  calm: '😌',
  excited: '🤗',
  sad: '😢',
  anxious: '😰',
  angry: '😠'
} as const;

// Schema for validated chart data rows
export const ChartEmotionRowSchema = z.object({
  date: z.string(),
  happy: z.number().nullable(),
  calm: z.number().nullable(),
  excited: z.number().nullable(),
  sad: z.number().nullable(),
  anxious: z.number().nullable(),
  angry: z.number().nullable(),
  count: z.number(),
  avgIntensity: z.number().nullable(),
});

export type ChartEmotionRow = z.infer<typeof ChartEmotionRowSchema>;

/**
 * Process raw emotion entries into chart-ready data.
 * Uses null for missing data to maintain data integrity.
 * 
 * @param emotions - Raw emotion entries from storage
 * @returns Processed and validated chart data
 */
export function processEmotionData(emotions: RawEmotionEntry[]): ChartEmotionRow[] {
  const dataByDate: Record<string, {
    emotions: Partial<Record<EmotionType, number[]>>;
    count: number;
  }> = {};

  // Group emotions by date
  emotions.forEach(emotion => {
    const timestamp = emotion.timestamp instanceof Date 
      ? emotion.timestamp 
      : new Date(emotion.timestamp as string);
    
    // Skip invalid dates
    if (isNaN(timestamp.getTime())) return;
    
    const dateKey = format(timestamp, 'yyyy-MM-dd');
    
    if (!dataByDate[dateKey]) {
      dataByDate[dateKey] = {
        emotions: {},
        count: 0
      };
    }
    
    const emotionType = emotion.emotion as EmotionType;
    if (EMOTION_TYPES.includes(emotionType)) {
      if (!dataByDate[dateKey].emotions[emotionType]) {
        dataByDate[dateKey].emotions[emotionType] = [];
      }
      dataByDate[dateKey].emotions[emotionType]!.push(emotion.intensity);
      dataByDate[dateKey].count++;
    }
  });

  // Convert to chart format with proper null handling
  const chartData: ChartEmotionRow[] = Object.entries(dataByDate)
    .map(([date, data]) => {
      const row: ChartEmotionRow = {
        date,
        happy: null,
        calm: null,
        excited: null,
        sad: null,
        anxious: null,
        angry: null,
        count: data.count,
        avgIntensity: null
      };

      let totalIntensity = 0;
      let emotionCount = 0;

      // Calculate averages for each emotion type
      EMOTION_TYPES.forEach(emotionType => {
        const values = data.emotions[emotionType];
        if (values && values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          row[emotionType] = avg;
          totalIntensity += avg;
          emotionCount++;
        }
      });

      // Calculate overall average intensity
      if (emotionCount > 0) {
        row.avgIntensity = totalIntensity / emotionCount;
      }

      return row;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Validate the processed data
  return chartData.map(row => {
    try {
      return ChartEmotionRowSchema.parse(row);
    } catch (error) {
      logger.error('Invalid chart data row:', row, error);
      // Return a safe default if validation fails
      return {
        ...row,
        happy: null,
        calm: null,
        excited: null,
        sad: null,
        anxious: null,
        angry: null,
        avgIntensity: null
      };
    }
  });
}

