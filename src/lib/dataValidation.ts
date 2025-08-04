import { Student, TrackingEntry, Goal, Intervention, Alert, CorrelationData, EmotionEntry, SensoryEntry } from "@/types/student";

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Student validation
export const validateStudent = (student: Partial<Student>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!student.id || typeof student.id !== 'string') {
    errors.push('Student ID is required and must be a string');
  }
  
  if (!student.name || typeof student.name !== 'string' || student.name.trim().length === 0) {
    errors.push('Student name is required and cannot be empty');
  }

  // Optional field validation
  if (student.grade && typeof student.grade !== 'string') {
    warnings.push('Grade should be a string');
  }

  if (student.dateOfBirth && typeof student.dateOfBirth !== 'string') {
    warnings.push('Date of birth should be a string');
  }

  // IEP goals validation
  if (student.iepGoals && Array.isArray(student.iepGoals)) {
    student.iepGoals.forEach((goal, index) => {
      const goalValidation = validateGoal(goal);
      if (!goalValidation.isValid) {
        errors.push(`IEP Goal ${index + 1}: ${goalValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Emotion entry validation
export const validateEmotionEntry = (emotion: Partial<EmotionEntry>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validEmotions = ['happy', 'sad', 'angry', 'calm', 'anxious', 'excited', 'frustrated', 'content', 'overwhelmed'];
  const validIntensities = [1, 2, 3, 4, 5];

  if (!emotion.id || typeof emotion.id !== 'string') {
    errors.push('Emotion ID is required');
  }

  if (!emotion.studentId || typeof emotion.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!emotion.emotion || !validEmotions.includes(emotion.emotion)) {
    errors.push(`Emotion must be one of: ${validEmotions.join(', ')}`);
  }

  if (!emotion.intensity || !validIntensities.includes(emotion.intensity)) {
    errors.push(`Intensity must be one of: ${validIntensities.join(', ')}`);
  }

  if (!emotion.timestamp || !(emotion.timestamp instanceof Date)) {
    errors.push('Timestamp is required and must be a Date object');
  }

  if (emotion.triggers && !Array.isArray(emotion.triggers)) {
    warnings.push('Triggers should be an array of strings');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Sensory entry validation
export const validateSensoryEntry = (sensory: Partial<SensoryEntry>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validSensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const validResponses = ['seeking', 'avoiding', 'neutral', 'engaging', 'exploring', 'withdrawing', 'defensive'];
  const validIntensities = [1, 2, 3, 4, 5];

  if (!sensory.id || typeof sensory.id !== 'string') {
    errors.push('Sensory ID is required');
  }

  if (!sensory.studentId || typeof sensory.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!sensory.sensoryType || !validSensoryTypes.includes(sensory.sensoryType)) {
    errors.push(`Sensory type must be one of: ${validSensoryTypes.join(', ')}`);
  }

  if (!sensory.response || !validResponses.includes(sensory.response)) {
    errors.push(`Response must be one of: ${validResponses.join(', ')}`);
  }

  if (!sensory.intensity || !validIntensities.includes(sensory.intensity)) {
    errors.push(`Intensity must be one of: ${validIntensities.join(', ')}`);
  }

  if (!sensory.timestamp || !(sensory.timestamp instanceof Date)) {
    errors.push('Timestamp is required and must be a Date object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Goal validation
export const validateGoal = (goal: Partial<Goal>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validCategories = ['behavioral', 'academic', 'social', 'sensory', 'communication'];
  const validStatuses = ['active', 'achieved', 'modified', 'discontinued'];

  if (!goal.id || typeof goal.id !== 'string') {
    errors.push('Goal ID is required');
  }

  if (!goal.studentId || typeof goal.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!goal.title || typeof goal.title !== 'string' || goal.title.trim().length === 0) {
    errors.push('Goal title is required and cannot be empty');
  }

  if (!goal.description || typeof goal.description !== 'string' || goal.description.trim().length === 0) {
    errors.push('Goal description is required and cannot be empty');
  }

  if (!goal.category || !validCategories.includes(goal.category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  if (!goal.status || !validStatuses.includes(goal.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  if (!goal.targetDate || !(goal.targetDate instanceof Date)) {
    errors.push('Target date is required and must be a Date object');
  }

  if (!goal.createdDate || !(goal.createdDate instanceof Date)) {
    errors.push('Created date is required and must be a Date object');
  }

  if (goal.currentProgress !== undefined && (typeof goal.currentProgress !== 'number' || goal.currentProgress < 0 || goal.currentProgress > 100)) {
    errors.push('Current progress must be a number between 0 and 100');
  }

  if (!goal.measurableObjective || typeof goal.measurableObjective !== 'string' || goal.measurableObjective.trim().length === 0) {
    errors.push('Measurable objective is required and cannot be empty');
  }

  // Validate milestones if present
  if (goal.milestones && Array.isArray(goal.milestones)) {
    goal.milestones.forEach((milestone, index) => {
      if (!milestone.id || !milestone.title || !milestone.targetDate) {
        errors.push(`Milestone ${index + 1} is missing required fields (id, title, targetDate)`);
      }
    });
  }

  // Validate data points if present
  if (goal.dataPoints && Array.isArray(goal.dataPoints)) {
    goal.dataPoints.forEach((dataPoint, index) => {
      if (!dataPoint.id || !dataPoint.timestamp || typeof dataPoint.value !== 'number') {
        errors.push(`Data point ${index + 1} is missing required fields (id, timestamp, value)`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Tracking entry validation
export const validateTrackingEntry = (entry: Partial<TrackingEntry>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!entry.id || typeof entry.id !== 'string') {
    errors.push('Tracking entry ID is required');
  }

  if (!entry.studentId || typeof entry.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!entry.timestamp || !(entry.timestamp instanceof Date)) {
    errors.push('Timestamp is required and must be a Date object');
  }

  if (!entry.emotions || !Array.isArray(entry.emotions)) {
    errors.push('Emotions must be an array');
  } else {
    entry.emotions.forEach((emotion, index) => {
      const emotionValidation = validateEmotionEntry(emotion);
      if (!emotionValidation.isValid) {
        errors.push(`Emotion ${index + 1}: ${emotionValidation.errors.join(', ')}`);
      }
    });
  }

  if (!entry.sensoryInputs || !Array.isArray(entry.sensoryInputs)) {
    errors.push('Sensory inputs must be an array');
  } else {
    entry.sensoryInputs.forEach((sensory, index) => {
      const sensoryValidation = validateSensoryEntry(sensory);
      if (!sensoryValidation.isValid) {
        errors.push(`Sensory input ${index + 1}: ${sensoryValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Intervention validation
export const validateIntervention = (intervention: Partial<Intervention>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validCategories = ['sensory', 'behavioral', 'environmental', 'instructional', 'social'];
  const validStatuses = ['active', 'completed', 'discontinued', 'modified'];
  const validFrequencies = ['daily', 'weekly', 'as-needed', 'continuous'];
  const validEffectiveness = [1, 2, 3, 4, 5];

  if (!intervention.id || typeof intervention.id !== 'string') {
    errors.push('Intervention ID is required');
  }

  if (!intervention.studentId || typeof intervention.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!intervention.title || typeof intervention.title !== 'string' || intervention.title.trim().length === 0) {
    errors.push('Intervention title is required and cannot be empty');
  }

  if (!intervention.category || !validCategories.includes(intervention.category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  if (!intervention.status || !validStatuses.includes(intervention.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  if (!intervention.frequency || !validFrequencies.includes(intervention.frequency)) {
    errors.push(`Frequency must be one of: ${validFrequencies.join(', ')}`);
  }

  if (intervention.effectiveness !== undefined && !validEffectiveness.includes(intervention.effectiveness)) {
    errors.push(`Effectiveness must be one of: ${validEffectiveness.join(', ')}`);
  }

  if (!intervention.implementationDate || !(intervention.implementationDate instanceof Date)) {
    errors.push('Implementation date is required and must be a Date object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Alert validation
export const validateAlert = (alert: Partial<Alert>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validTypes = ['pattern', 'regression', 'achievement', 'environmental', 'correlation'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (!alert.id || typeof alert.id !== 'string') {
    errors.push('Alert ID is required');
  }

  if (!alert.studentId || typeof alert.studentId !== 'string') {
    errors.push('Student ID is required');
  }

  if (!alert.type || !validTypes.includes(alert.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }

  if (!alert.priority || !validPriorities.includes(alert.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  if (!alert.title || typeof alert.title !== 'string' || alert.title.trim().length === 0) {
    errors.push('Alert title is required and cannot be empty');
  }

  if (!alert.timestamp || !(alert.timestamp instanceof Date)) {
    errors.push('Timestamp is required and must be a Date object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Data integrity check
export const performDataIntegrityCheck = (data: {
  students: Student[];
  trackingEntries: TrackingEntry[];
  goals: Goal[];
  interventions: Intervention[];
  alerts: Alert[];
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for orphaned data
  const studentIds = new Set(data.students.map(s => s.id));
  
  // Check tracking entries
  data.trackingEntries.forEach(entry => {
    if (!studentIds.has(entry.studentId)) {
      errors.push(`Tracking entry ${entry.id} references non-existent student ${entry.studentId}`);
    }
  });

  // Check goals
  data.goals.forEach(goal => {
    if (!studentIds.has(goal.studentId)) {
      errors.push(`Goal ${goal.id} references non-existent student ${goal.studentId}`);
    }
  });

  // Check interventions
  data.interventions.forEach(intervention => {
    if (!studentIds.has(intervention.studentId)) {
      errors.push(`Intervention ${intervention.id} references non-existent student ${intervention.studentId}`);
    }
  });

  // Check alerts
  data.alerts.forEach(alert => {
    if (!studentIds.has(alert.studentId)) {
      errors.push(`Alert ${alert.id} references non-existent student ${alert.studentId}`);
    }
  });

  // Check for duplicate IDs
  const checkDuplicates = (items: { id: string }[], type: string) => {
    const ids = new Set();
    items.forEach(item => {
      if (ids.has(item.id)) {
        errors.push(`Duplicate ${type} ID found: ${item.id}`);
      } else {
        ids.add(item.id);
      }
    });
  };

  checkDuplicates(data.students, 'student');
  checkDuplicates(data.trackingEntries, 'tracking entry');
  checkDuplicates(data.goals, 'goal');
  checkDuplicates(data.interventions, 'intervention');
  checkDuplicates(data.alerts, 'alert');

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};