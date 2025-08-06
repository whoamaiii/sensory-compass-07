
import { EmotionEntry, SensoryEntry } from './student';

export function isEmotionEntry(obj: unknown): obj is EmotionEntry {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.studentId === 'string' &&
    (typeof obj.timestamp === 'string' || obj.timestamp instanceof Date) &&
    typeof obj.emotion === 'string' &&
    typeof obj.intensity === 'number'
  );
}

export function isSensoryEntry(obj: unknown): obj is SensoryEntry {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.studentId === 'string' &&
    (typeof obj.timestamp === 'string' || obj.timestamp instanceof Date) &&
    typeof obj.sensoryType === 'string' &&
    typeof obj.response === 'string'
  );
}

