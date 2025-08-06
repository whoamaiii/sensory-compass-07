# Data Validation Documentation

The data validation module provides comprehensive schema validation for student tracking data using Zod.

## Schema Definitions

### StudentSchema
```typescript
const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string(),
  class: z.string(),
  age: z.number().int().min(5).max(30),
  scenario: z.enum(['emma', 'lars', 'astrid', 'noah', 'maya', 'olivia']).optional(),
  baselineArousal: z.number().min(0).max(100).optional(),
  baselineValence: z.number().min(-1).max(1).optional(),
  stressLevel: z.number().min(0).max(10).optional()
});
```

### EmotionEntrySchema
```typescript
const emotionEntrySchema = z.object({
  timestamp: z.string(),
  emotion: z.string(),
  intensity: z.number().min(0).max(100),
  trigger: z.string().optional(),
  notes: z.string().optional()
});
```

### SensoryEntrySchema
```typescript
const sensoryEntrySchema = z.object({
  timestamp: z.string(),
  sensoryType: z.enum(['visual', 'auditory', 'tactile', 'olfactory', 'vestibular']),
  response: z.number().min(-10).max(10),
  trigger: z.string().optional(),
  notes: z.string().optional()
});
```

### TrackingEntrySchema
```typescript
const trackingEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  activity: z.string(),
  emotions: z.array(emotionEntrySchema),
  sensoryProfile: z.array(sensoryEntrySchema),
  environmentFactors: z.object({
    noiseLevel: z.number().min(0).max(100).optional(),
    lightingLevel: z.number().min(0).max(100).optional(),
    crowdLevel: z.number().min(0).max(100).optional(),
    temperature: z.number().min(10).max(40).optional()
  }).optional(),
  overallRegulation: z.number().min(1).max(5),
  triggers: z.array(z.string()).optional(),
  supportStrategies: z.array(z.string()).optional()
});
```

## Validation Methods

### validateStudent
```typescript
export function validateStudent(data: unknown): {
  isValid: boolean;
  errors?: z.ZodError['errors'];
} {
  const result = studentSchema.safeParse(data);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors
  };
}
```

### validateEmotionEntry
```typescript
export function validateEmotionEntry(data: unknown): {
  isValid: boolean;
  errors?: z.ZodError['errors'];
} {
  const result = emotionEntrySchema.safeParse(data);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors
  };
}
```

### validateSensoryEntry
```typescript
export function validateSensoryEntry(data: unknown): {
  isValid: boolean;
  errors?: z.ZodError['errors'];
} {
  const result = sensoryEntrySchema.safeParse(data);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors
  };
}
```

### validateTrackingEntry
```typescript
export function validateTrackingEntry(data: unknown): {
  isValid: boolean;
  errors?: z.ZodError['errors'];
} {
  const result = trackingEntrySchema.safeParse(data);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors
  };
}
```

### validateTrackingData
```typescript
export function validateTrackingData(data: unknown): {
  isValid: boolean;
  errors?: z.ZodError['errors'];
} {
  const trackingSchema = z.object({
    student: studentSchema,
    entries: z.array(trackingEntrySchema)
  });
  
  const result = trackingSchema.safeParse(data);
  return {
    isValid: result.success,
    errors: result.success ? undefined : result.error.errors
  };
}
```

## Usage Examples

### Basic Validation

```typescript
import { validateStudent, validateTrackingEntry } from './dataValidation';

// Validate a student object
const studentData = {
  id: '123',
  name: 'John Doe',
  grade: '5th',
  class: 'A',
  age: 10,
  scenario: 'emma'
};

const studentResult = validateStudent(studentData);
if (studentResult.isValid) {
  console.log('Student data is valid');
} else {
  console.error('Validation errors:', studentResult.errors);
}
```

### Form Validation

```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = (formData: FormData) => {
  const validation = validateTrackingEntry(formData);
  
  if (!validation.isValid) {
    const errorMap = validation.errors?.reduce((acc, error) => {
      const path = error.path.join('.');
      acc[path] = error.message;
      return acc;
    }, {} as Record<string, string>);
    
    setErrors(errorMap || {});
    return;
  }
  
  // Process valid data
  submitData(formData);
};
```

### Batch Validation

```typescript
const validateBatch = (entries: unknown[]): {
  valid: any[];
  invalid: Array<{ data: unknown; errors: z.ZodError['errors'] }>;
} => {
  const results = entries.reduce((acc, entry) => {
    const validation = validateTrackingEntry(entry);
    
    if (validation.isValid) {
      acc.valid.push(entry);
    } else {
      acc.invalid.push({
        data: entry,
        errors: validation.errors
      });
    }
    
    return acc;
  }, { valid: [], invalid: [] });
  
  return results;
};
```

## Error Handling Strategies

### Custom Error Messages

```typescript
const formatValidationError = (error: z.ZodError['errors'][0]): string => {
  const { path, message, code } = error;
  
  // Custom messages based on error type
  switch (code) {
    case 'invalid_type':
      return `${path.join('.')} must be a ${error.expected}`;
    case 'too_small':
      return `${path.join('.')} must be at least ${error.minimum}`;
    case 'too_big':
      return `${path.join('.')} must be at most ${error.maximum}`;
    default:
      return message;
  }
};
```

### Integration with UI Components

```typescript
const ValidationInput: React.FC<{
  name: string;
  value: any;
  schema: z.ZodSchema;
  onChange: (value: any) => void;
}> = ({ name, value, schema, onChange }) => {
  const [error, setError] = useState<string>('');
  
  const handleBlur = () => {
    const result = schema.safeParse(value);
    setError(result.success ? '' : result.error.errors[0].message);
  };
  
  return (
    <div>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className={error ? 'border-red-500' : 'border-gray-300'}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};
```

## Performance Considerations

1. **Lazy Schema Creation**: Create schemas outside of components to avoid recreation on every render.

2. **Memoize Validation Results**: Cache validation results for unchanged data.

```typescript
const useMemoizedValidation = (data: unknown, validator: Function) => {
  return useMemo(() => validator(data), [data, validator]);
};
```

3. **Async Validation**: For complex validations, consider async processing.

```typescript
const validateAsync = async (data: unknown): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(validateTrackingEntry(data));
    }, 0);
  });
};
```

## Testing Validation

### Unit Tests

```typescript
describe('validateStudent', () => {
  it('should validate correct student data', () => {
    const validStudent = {
      id: '123',
      name: 'Test Student',
      grade: '5th',
      class: 'A',
      age: 10
    };
    
    const result = validateStudent(validStudent);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });
  
  it('should reject invalid age', () => {
    const invalidStudent = {
      id: '123',
      name: 'Test Student',
      grade: '5th',
      class: 'A',
      age: 35 // Too old
    };
    
    const result = validateStudent(invalidStudent);
    expect(result.isValid).toBe(false);
    expect(result.errors?.[0].path).toContain('age');
  });
});
```

## Best Practices

1. **Type Safety**: Use TypeScript's type inference with Zod.
```typescript
type Student = z.infer<typeof studentSchema>;
```

2. **Composition**: Build complex schemas from simpler ones.
```typescript
const baseSchema = z.object({ id: z.string() });
const extendedSchema = baseSchema.extend({ name: z.string() });
```

3. **Custom Validators**: Create reusable custom validation functions.
```typescript
const isValidEmail = z.string().email();
const isValidPhone = z.string().regex(/^\+?[\d\s-()]+$/);
```

4. **Error Boundaries**: Wrap validation in try-catch for unexpected errors.
```typescript
try {
  const result = validateTrackingData(data);
  // Process result
} catch (error) {
  logger.error('Validation error:', error);
  // Handle gracefully
}
```
