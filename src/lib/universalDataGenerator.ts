import { Student, TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';

/**
 * Universal Data Generator for Pattern Detection
 * Creates realistic tracking data patterns for any student based on their characteristics
 */

// Pattern template types
interface PatternTemplate {
  name: string;
  description: string;
  emotionBias: string[];
  emotionIntensityRange: [number, number];
  sensoryBehaviors: string[];
  environmentalFactors: string[];
  frequency: number; // 0-1, how often this pattern appears
}

// Age-based pattern templates
const PATTERN_TEMPLATES: Record<string, PatternTemplate[]> = {
  'early-elementary': [
    {
      name: 'transition-anxiety',
      description: 'Mild anxiety during transitions and new activities',
      emotionBias: ['anxious', 'sad'],
      emotionIntensityRange: [2, 4],
      sensoryBehaviors: ['seeking', 'avoiding'],
      environmentalFactors: ['transition', 'new activity'],
      frequency: 0.3
    },
    {
      name: 'sensory-seeking',
      description: 'High need for proprioceptive and tactile input',
      emotionBias: ['excited', 'happy'],
      emotionIntensityRange: [3, 5],
      sensoryBehaviors: ['seeking'],
      environmentalFactors: ['movement', 'fidget tools'],
      frequency: 0.4
    },
    {
      name: 'positive-engagement',
      description: 'High engagement and positive emotions during preferred activities',
      emotionBias: ['happy', 'excited', 'calm'],
      emotionIntensityRange: [4, 5],
      sensoryBehaviors: ['neutral', 'seeking'],
      environmentalFactors: ['structured activity', 'small group'],
      frequency: 0.5
    }
  ],
  'late-elementary': [
    {
      name: 'academic-challenges',
      description: 'Mixed emotions with challenging academic tasks',
      emotionBias: ['anxious', 'angry'],
      emotionIntensityRange: [3, 4],
      sensoryBehaviors: ['avoiding', 'neutral'],
      environmentalFactors: ['testing', 'complex task'],
      frequency: 0.25
    },
    {
      name: 'peer-interaction-anxiety',
      description: 'Anxiety in social situations and group work',
      emotionBias: ['anxious', 'sad'],
      emotionIntensityRange: [2, 4],
      sensoryBehaviors: ['avoiding'],
      environmentalFactors: ['group work', 'crowded space'],
      frequency: 0.3
    },
    {
      name: 'independence-growth',
      description: 'Growing confidence and independence',
      emotionBias: ['happy', 'excited', 'calm'],
      emotionIntensityRange: [3, 5],
      sensoryBehaviors: ['neutral'],
      environmentalFactors: ['independent work', 'choice activity'],
      frequency: 0.4
    }
  ],
  'middle-school': [
    {
      name: 'emotional-regulation',
      description: 'Developing emotional regulation skills',
      emotionBias: ['calm', 'happy'],
      emotionIntensityRange: [2, 4],
      sensoryBehaviors: ['neutral', 'seeking'],
      environmentalFactors: ['quiet space', 'routine'],
      frequency: 0.45
    },
    {
      name: 'sensory-sensitivity',
      description: 'Increased awareness of sensory preferences',
      emotionBias: ['calm', 'anxious'],
      emotionIntensityRange: [3, 4],
      sensoryBehaviors: ['avoiding', 'seeking'],
      environmentalFactors: ['preferred lighting', 'noise control'],
      frequency: 0.35
    }
  ]
};

// Helper functions
function getRandomDate(daysAgo: number, variance: number = 0): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  if (variance > 0) {
    baseDate.setHours(baseDate.getHours() + Math.random() * variance - variance / 2);
  }
  return baseDate;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomIntensity(range: [number, number]): 1 | 2 | 3 | 4 | 5 {
  const [min, max] = range;
  return Math.floor(Math.random() * (max - min + 1) + min) as 1 | 2 | 3 | 4 | 5;
}

// Determine age group from student data
function getAgeGroup(student: Student): string {
  if (student.grade) {
    const gradeMatch = student.grade.match(/(\d+)/);
    if (gradeMatch) {
      const gradeNum = parseInt(gradeMatch[1]);
      if (gradeNum <= 2) return 'early-elementary';
      if (gradeNum <= 5) return 'late-elementary';
      return 'middle-school';
    }
  }
  
  if (student.dateOfBirth) {
    const age = new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear();
    if (age <= 7) return 'early-elementary';
    if (age <= 11) return 'late-elementary';
    return 'middle-school';
  }
  
  // Default to late-elementary
  return 'late-elementary';
}

// Select appropriate patterns for a student
function selectPatternsForStudent(student: Student): PatternTemplate[] {
  const ageGroup = getAgeGroup(student);
  const availablePatterns = PATTERN_TEMPLATES[ageGroup] || PATTERN_TEMPLATES['late-elementary'];
  
  // Select 2-3 patterns based on frequency and randomness
  const selectedPatterns: PatternTemplate[] = [];
  
  for (const pattern of availablePatterns) {
    if (Math.random() < pattern.frequency) {
      selectedPatterns.push(pattern);
    }
  }
  
  // Ensure at least one pattern is selected
  if (selectedPatterns.length === 0) {
    selectedPatterns.push(getRandomElement(availablePatterns));
  }
  
  // Limit to maximum 3 patterns
  return selectedPatterns.slice(0, 3);
}

// Generate emotion entry with pattern influence
function generateEmotionEntry(
  studentId: string, 
  timestamp: Date, 
  activePattern?: PatternTemplate
): EmotionEntry {
  const allEmotions: EmotionEntry['emotion'][] = ['happy', 'sad', 'angry', 'calm', 'anxious', 'excited'];
  const triggers = ['noise', 'transition', 'new activity', 'crowded space', 'bright lights', 'schedule change', 'complex task', 'group work'];
  
  let emotion: EmotionEntry['emotion'];
  let intensity: 1 | 2 | 3 | 4 | 5;
  
  if (activePattern && Math.random() < 0.7) {
    // Use pattern-influenced emotion
    emotion = getRandomElement(activePattern.emotionBias) as EmotionEntry['emotion'];
    intensity = getRandomIntensity(activePattern.emotionIntensityRange);
  } else {
    // Use random emotion
    emotion = getRandomElement(allEmotions);
    intensity = getRandomIntensity([1, 5]);
  }
  
  return {
    id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId,
    emotion,
    intensity,
    timestamp,
    notes: Math.random() > 0.7 ? `Observed during ${getRandomElement(triggers)}` : undefined,
    triggers: Math.random() > 0.6 ? [getRandomElement(triggers)] : undefined
  };
}

// Generate sensory entry with pattern influence
function generateSensoryEntry(
  studentId: string, 
  timestamp: Date, 
  activePattern?: PatternTemplate
): SensoryEntry {
  const sensoryTypes: SensoryEntry['sensoryType'][] = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const responses: SensoryEntry['response'][] = ['seeking', 'avoiding', 'neutral'];
  const environments = ['classroom', 'hallway', 'cafeteria', 'playground', 'therapy room'];
  
  let response: SensoryEntry['response'];
  
  if (activePattern && Math.random() < 0.6) {
    // Use pattern-influenced response
    response = getRandomElement(activePattern.sensoryBehaviors) as SensoryEntry['response'];
  } else {
    // Use random response
    response = getRandomElement(responses);
  }
  
  const intensity = response === 'neutral' ? getRandomIntensity([1, 3]) : getRandomIntensity([2, 5]);
  
  return {
    id: `sensory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId,
    sensoryType: getRandomElement(sensoryTypes),
    response,
    intensity,
    timestamp,
    notes: Math.random() > 0.7 ? `Behavior observed in ${getRandomElement(environments)}` : undefined,
    environment: getRandomElement(environments)
  };
}

// Generate environmental entry with pattern influence
function generateEnvironmentalEntry(
  timestamp: Date, 
  activePattern?: PatternTemplate
): EnvironmentalEntry {
  const weatherConditions: EnvironmentalEntry['weather']['condition'][] = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
  const activities: EnvironmentalEntry['classroom']['activity'][] = ['instruction', 'transition', 'free-time', 'testing', 'group-work'];
  const lightingTypes: EnvironmentalEntry['roomConditions']['lighting'][] = ['bright', 'dim', 'natural', 'fluorescent'];
  
  let activity = getRandomElement(activities);
  let lighting = getRandomElement(lightingTypes);
  let noiseLevel = getRandomIntensity([1, 5]);
  
  if (activePattern) {
    // Adjust based on pattern environmental factors
    if (activePattern.environmentalFactors.includes('transition') && Math.random() < 0.4) {
      activity = 'transition';
    }
    if (activePattern.environmentalFactors.includes('testing') && Math.random() < 0.3) {
      activity = 'testing';
    }
    if (activePattern.environmentalFactors.includes('group work') && Math.random() < 0.3) {
      activity = 'group-work';
    }
    if (activePattern.environmentalFactors.includes('quiet space') && Math.random() < 0.4) {
      noiseLevel = getRandomIntensity([1, 2]);
    }
    if (activePattern.environmentalFactors.includes('noise control') && Math.random() < 0.3) {
      lighting = 'natural';
    }
  }
  
  const hour = timestamp.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  return {
    id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    roomConditions: {
      temperature: 20 + Math.random() * 8,
      humidity: 40 + Math.random() * 30,
      lighting,
      noiseLevel
    },
    weather: {
      condition: getRandomElement(weatherConditions),
      temperature: 5 + Math.random() * 25,
      pressure: 990 + Math.random() * 40
    },
    classroom: {
      activity,
      studentCount: 12 + Math.floor(Math.random() * 16),
      timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening'
    },
    notes: Math.random() > 0.8 ? 'Pattern-based environmental data' : undefined
  };
}

// Generate a tracking entry with universal patterns
function generateUniversalTrackingEntry(student: Student, daysAgo: number, patterns: PatternTemplate[]): TrackingEntry {
  const timestamp = getRandomDate(daysAgo, 4);
  const emotions: EmotionEntry[] = [];
  const sensoryInputs: SensoryEntry[] = [];
  
  // Select active pattern for this entry (or none)
  const activePattern = Math.random() < 0.6 ? getRandomElement(patterns) : undefined;
  
  // Generate 1-3 emotion entries
  const emotionCount = Math.ceil(Math.random() * 3);
  for (let i = 0; i < emotionCount; i++) {
    emotions.push(generateEmotionEntry(student.id, timestamp, activePattern));
  }
  
  // Generate 1-4 sensory entries
  const sensoryCount = Math.ceil(Math.random() * 4);
  for (let i = 0; i < sensoryCount; i++) {
    sensoryInputs.push(generateSensoryEntry(student.id, timestamp, activePattern));
  }
  
  return {
    id: `tracking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId: student.id,
    timestamp,
    emotions,
    sensoryInputs,
    environmentalData: generateEnvironmentalEntry(timestamp, activePattern),
    generalNotes: activePattern ? `Pattern: ${activePattern.name}` : undefined,
    version: 1
  };
}

// Main function to generate universal tracking data for any student
export function generateUniversalTrackingData(student: Student, daysOfData: number = 30): TrackingEntry[] {
  const patterns = selectPatternsForStudent(student);
  const entries: TrackingEntry[] = [];
  
  // Generate entries with realistic gaps (4-6 entries per week)
  for (let day = daysOfData; day >= 0; day--) {
    // Skip some days (weekends, holidays)
    if (Math.random() > 0.6) continue; // ~40% of days have entries
    
    entries.push(generateUniversalTrackingEntry(student, day, patterns));
  }
  
  return entries;
}

// Generate mock data for a student with universal patterns
export function generateUniversalMockDataForStudent(student: Student): TrackingEntry[] {
  // Generate different amounts of data based on when student was created
  const daysOfData = Math.max(7, Math.min(90, Math.floor(Math.random() * 60) + 30));
  return generateUniversalTrackingData(student, daysOfData);
}

// Get pattern information for a student (for UI display)
export function getStudentPatternInfo(student: Student): {
  ageGroup: string;
  availablePatterns: PatternTemplate[];
  selectedPatterns: PatternTemplate[];
} {
  const ageGroup = getAgeGroup(student);
  const availablePatterns = PATTERN_TEMPLATES[ageGroup] || PATTERN_TEMPLATES['late-elementary'];
  const selectedPatterns = selectPatternsForStudent(student);
  
  return {
    ageGroup,
    availablePatterns,
    selectedPatterns
  };
}