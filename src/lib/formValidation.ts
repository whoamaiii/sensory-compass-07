import { z } from 'zod';

// Validation schemas
export const studentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  grade: z.string().min(1, 'Grade is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

export const emotionEntrySchema = z.object({
  emotion: z.string().min(1, 'Emotion is required'),
  intensity: z.number().min(1, 'Intensity must be at least 1').max(5, 'Intensity must be at most 5'),
  context: z.string().max(500, 'Context must be less than 500 characters').optional(),
  trigger: z.string().max(500, 'Trigger must be less than 500 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

export const sensoryEntrySchema = z.object({
  type: z.string().min(1, 'Sensory type is required'),
  response: z.string().min(1, 'Response is required'),
  intensity: z.number().min(1, 'Intensity must be at least 1').max(5, 'Intensity must be at most 5').optional(),
  context: z.string().max(500, 'Context must be less than 500 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

export const environmentalEntrySchema = z.object({
  location: z.string().min(1, 'Location is required'),
  socialContext: z.string().min(1, 'Social context is required'),
  roomConditions: z.object({
    noiseLevel: z.number().min(1).max(5),
    lighting: z.enum(['bright', 'moderate', 'dim']),
    temperature: z.number().min(-10).max(50),
    humidity: z.number().min(0).max(100)
  }).optional(),
  weather: z.object({
    condition: z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']),
    temperature: z.number().min(-30).max(50),
    pressure: z.number().min(900).max(1100)
  }).optional(),
  classroom: z.object({
    activity: z.enum(['instruction', 'transition', 'free-time', 'testing', 'group-work']),
    studentCount: z.number().min(1).max(50),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening'])
  }).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

// Validation functions
export function validateStudent(data: unknown) {
  try {
    return {
      success: true,
      data: studentSchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }]
    };
  }
}

export function validateEmotionEntry(data: unknown) {
  try {
    return {
      success: true,
      data: emotionEntrySchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }]
    };
  }
}

export function validateSensoryEntry(data: unknown) {
  try {
    return {
      success: true,
      data: sensoryEntrySchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }]
    };
  }
}

export function validateEnvironmentalEntry(data: unknown) {
  try {
    return {
      success: true,
      data: environmentalEntrySchema.parse(data),
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }]
    };
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}