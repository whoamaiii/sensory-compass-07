
import { TrackingEntry, EmotionEntry, SensoryEntry, Student } from '@/types/student';
import { z } from 'zod';

// Student schema
const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  iepGoals: z.array(z.any()).optional(),
  createdAt: z.date(),
  lastUpdated: z.date().optional(),
  version: z.number().optional(),
});

// Updated tracking entry schema to match the actual TrackingEntry type
const trackingEntrySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  timestamp: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  emotions: z.array(z.any()).optional(),
  sensoryInputs: z.array(z.any()).optional(),
  environmentalData: z.any().optional(),
  notes: z.string().optional(),
});

const emotionEntrySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  timestamp: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  emotion: z.string(),
  intensity: z.number(),
  triggers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const sensoryEntrySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  timestamp: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  type: z.string().optional(),
  sensoryType: z.string().optional(),
  response: z.string().optional(),
  intensity: z.number(),
  notes: z.string().optional(),
});

const trackingDataSchema = z.object({
  entries: z.array(trackingEntrySchema),
  emotions: z.array(emotionEntrySchema),
  sensoryInputs: z.array(sensoryEntrySchema),
});

type ValidationResult = {
  valid: boolean;
  errors: z.ZodError | null;
  cleanedData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
};

export function validateTrackingData(data: any): ValidationResult {
  const result = trackingDataSchema.safeParse(data);
  if (result.success) {
    return {
      valid: true,
      errors: null,
      cleanedData: result.data,
    };
  } else {
    return {
      valid: false,
      errors: result.error,
      cleanedData: {
        entries: [],
        emotions: [],
        sensoryInputs: [],
      },
    };
  }
}

// Individual validation functions
type SimpleValidationResult = {
  isValid: boolean;
  errors?: string[];
};

export function validateStudent(student: any): SimpleValidationResult {
  const result = studentSchema.safeParse(student);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map(e => e.message),
  };
}

export function validateEmotionEntry(entry: any): SimpleValidationResult {
  const result = emotionEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map(e => e.message),
  };
}

export function validateSensoryEntry(entry: any): SimpleValidationResult {
  const result = sensoryEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map(e => e.message),
  };
}

export function validateTrackingEntry(entry: any): SimpleValidationResult {
  const result = trackingEntrySchema.safeParse(entry);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors.map(e => e.message),
  };
}

