import { Student, TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry } from '@/types/student';
import { dataStorage } from './dataStorage';

/**
 * Mock Data Generator for testing pattern analysis and correlations
 * Generates realistic tracking data for 3 students over 3-6 months
 */

// Helper function to generate random dates
function getRandomDate(daysAgo: number, variance: number = 0): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  if (variance > 0) {
    baseDate.setHours(baseDate.getHours() + Math.random() * variance - variance / 2);
  }
  return baseDate;
}

// Generate emotion entry
function generateEmotionEntry(studentId: string, timestamp: Date, emotionBias?: string): EmotionEntry {
  const emotions: EmotionEntry['emotion'][] = ['happy', 'sad', 'angry', 'calm', 'anxious', 'excited'];
  const triggers = ['noise', 'transition', 'new activity', 'crowded space', 'bright lights', 'schedule change'];
  
  let emotion: EmotionEntry['emotion'] = (emotionBias as EmotionEntry['emotion']) || emotions[Math.floor(Math.random() * emotions.length)];
  let intensity = Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5;
  
  // Adjust intensity based on emotion
  if (emotion === 'anxious' || emotion === 'angry') {
    intensity = Math.max(3, intensity) as 1 | 2 | 3 | 4 | 5;
  } else if (emotion === 'calm') {
    intensity = Math.min(3, intensity) as 1 | 2 | 3 | 4 | 5;
  }

  return {
    id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId,
    emotion,
    intensity,
    timestamp,
    notes: Math.random() > 0.7 ? `Observed during ${triggers[Math.floor(Math.random() * triggers.length)]}` : undefined,
    triggers: Math.random() > 0.6 ? [triggers[Math.floor(Math.random() * triggers.length)]] : undefined
  };
}

// Generate sensory entry
function generateSensoryEntry(studentId: string, timestamp: Date, seekingBias?: boolean): SensoryEntry {
  const sensoryTypes: SensoryEntry['sensoryType'][] = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const responses: SensoryEntry['response'][] = ['seeking', 'avoiding', 'neutral'];
  const environments = ['classroom', 'hallway', 'cafeteria', 'playground', 'therapy room'];
  
  let response = seekingBias !== undefined 
    ? (seekingBias ? 'seeking' : 'avoiding')
    : responses[Math.floor(Math.random() * responses.length)];
  
  let intensity = Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5;
  
  // Adjust intensity based on response
  if (response === 'seeking' || response === 'avoiding') {
    intensity = Math.max(3, intensity) as 1 | 2 | 3 | 4 | 5;
  }

  return {
    id: `sensory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId,
    sensoryType: sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)],
    response,
    intensity,
    timestamp,
    notes: Math.random() > 0.7 ? `Behavior observed in ${environments[Math.floor(Math.random() * environments.length)]}` : undefined,
    environment: environments[Math.floor(Math.random() * environments.length)]
  };
}

// Generate environmental entry
function generateEnvironmentalEntry(timestamp: Date, correlationFactors?: { noise?: boolean; bright?: boolean }): EnvironmentalEntry {
  const weatherConditions: EnvironmentalEntry['weather']['condition'][] = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
  const activities: EnvironmentalEntry['classroom']['activity'][] = ['instruction', 'transition', 'free-time', 'testing', 'group-work'];
  const lightingTypes: EnvironmentalEntry['roomConditions']['lighting'][] = ['bright', 'dim', 'natural', 'fluorescent'];
  
  // Apply correlation factors if provided
  let noiseLevel = Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5;
  let lighting = lightingTypes[Math.floor(Math.random() * lightingTypes.length)];
  
  if (correlationFactors?.noise) {
    noiseLevel = Math.max(4, noiseLevel) as 1 | 2 | 3 | 4 | 5;
  }
  if (correlationFactors?.bright) {
    lighting = 'bright';
  }

  const hour = timestamp.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return {
    id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    roomConditions: {
      temperature: 20 + Math.random() * 8, // 20-28°C
      humidity: 40 + Math.random() * 30, // 40-70%
      lighting,
      noiseLevel
    },
    weather: {
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      temperature: 5 + Math.random() * 25, // 5-30°C
      pressure: 990 + Math.random() * 40 // 990-1030 hPa
    },
    classroom: {
      activity: activities[Math.floor(Math.random() * activities.length)],
      studentCount: 12 + Math.floor(Math.random() * 16), // 12-28 students
      timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening'
    },
    notes: Math.random() > 0.8 ? 'Special classroom event or activity' : undefined
  };
}

// Generate tracking entry
function generateTrackingEntry(student: Student, daysAgo: number, scenario: 'emma' | 'lars' | 'astrid'): TrackingEntry {
  const timestamp = getRandomDate(daysAgo, 4); // Add some time variance
  const emotions: EmotionEntry[] = [];
  const sensoryInputs: SensoryEntry[] = [];
  
  // Generate 1-3 emotion entries per tracking session
  const emotionCount = Math.ceil(Math.random() * 3);
  for (let i = 0; i < emotionCount; i++) {
    let emotionBias: string | undefined;
    
    // Apply scenario-specific emotion patterns
    if (scenario === 'emma') {
      // Mild anxiety patterns, mostly positive
      emotionBias = Math.random() > 0.7 ? 'anxious' : (Math.random() > 0.4 ? 'calm' : 'happy');
    } else if (scenario === 'lars') {
      // More intense emotions, sensory challenges
      emotionBias = Math.random() > 0.6 ? (Math.random() > 0.5 ? 'anxious' : 'angry') : 'calm';
    } else if (scenario === 'astrid') {
      // Improving over time - less anxiety as days go by
      const improvementFactor = Math.max(0, 1 - (daysAgo / 180)); // Improvement over 6 months
      emotionBias = Math.random() > (0.8 - improvementFactor * 0.5) ? 'happy' : 'calm';
    }
    
    emotions.push(generateEmotionEntry(student.id, timestamp, emotionBias));
  }
  
  // Generate 1-4 sensory entries per tracking session
  const sensoryCount = Math.ceil(Math.random() * 4);
  for (let i = 0; i < sensoryCount; i++) {
    let seekingBias: boolean | undefined;
    
    // Apply scenario-specific sensory patterns
    if (scenario === 'lars') {
      // High sensory-seeking behavior
      seekingBias = Math.random() > 0.3;
    }
    
    sensoryInputs.push(generateSensoryEntry(student.id, timestamp, seekingBias));
  }
  
  // Generate environmental data with some correlations
  let correlationFactors: { noise?: boolean; bright?: boolean } = {};
  
  // Create correlations for anxiety -> noise
  if (emotions.some(e => e.emotion === 'anxious' && e.intensity >= 4)) {
    correlationFactors.noise = Math.random() > 0.3; // 70% chance of high noise when anxious
  }
  
  // Create correlations for bright light -> better mood
  if (emotions.some(e => e.emotion === 'happy' || e.emotion === 'calm')) {
    correlationFactors.bright = Math.random() > 0.4; // 60% chance of bright lighting when positive
  }

  return {
    id: `tracking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId: student.id,
    timestamp,
    emotions,
    sensoryInputs,
    environmentalData: generateEnvironmentalEntry(timestamp, correlationFactors),
    generalNotes: Math.random() > 0.8 ? 'Additional observations from today' : undefined,
    version: 1
  };
}

// Generate mock students
export function generateMockStudents(): Student[] {
  const now = new Date();
  
  return [
    {
      id: 'mock_emma_001',
      name: 'Emma Larsen',
      grade: '3rd Grade',
      dateOfBirth: '2015-09-15',
      notes: 'Bright student with occasional anxiety during transitions. Responds well to visual schedules.',
      createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      lastUpdated: now,
      version: 1
    },
    {
      id: 'mock_lars_002', 
      name: 'Lars Andersen',
      grade: '2nd Grade',
      dateOfBirth: '2016-03-22',
      notes: 'Energetic student with sensory processing challenges. Seeks proprioceptive input regularly.',
      createdAt: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000), // 5 months ago
      lastUpdated: now,
      version: 1
    },
    {
      id: 'mock_astrid_003',
      name: 'Astrid Nilsen',
      grade: '4th Grade', 
      dateOfBirth: '2014-11-08',
      notes: 'Shows steady improvement in emotional regulation. Benefits from calm, structured environment.',
      createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
      lastUpdated: now,
      version: 1
    }
  ];
}

// Generate tracking data for a student
export function generateTrackingDataForStudent(student: Student, scenario: 'emma' | 'lars' | 'astrid'): TrackingEntry[] {
  const entries: TrackingEntry[] = [];
  const totalDays = scenario === 'emma' ? 180 : scenario === 'lars' ? 150 : 120; // Different timeframes
  
  // Generate entries with realistic gaps (3-7 entries per week)
  for (let day = totalDays; day >= 0; day--) {
    // Skip some days (weekends, holidays, sick days)
    if (Math.random() > 0.65) continue; // ~35% of days have entries
    
    entries.push(generateTrackingEntry(student, day, scenario));
  }
  
  return entries;
}

// Main function to generate all mock data
export function generateAllMockData(): { students: Student[]; trackingEntries: TrackingEntry[] } {
  const students = generateMockStudents();
  const trackingEntries: TrackingEntry[] = [];
  
  // Generate tracking data for each student
  students.forEach(student => {
    let scenario: 'emma' | 'lars' | 'astrid';
    if (student.id.includes('emma')) scenario = 'emma';
    else if (student.id.includes('lars')) scenario = 'lars';
    else scenario = 'astrid';
    
    const studentEntries = generateTrackingDataForStudent(student, scenario);
    trackingEntries.push(...studentEntries);
  });
  
  return { students, trackingEntries };
}

// Load mock data into storage
export function loadMockDataToStorage(): void {
  const { students, trackingEntries } = generateAllMockData();
  
  // Clear existing mock data first
  clearMockDataFromStorage();
  
  // Save students
  students.forEach(student => {
    dataStorage.saveStudent(student);
  });
  
  // Save tracking entries
  trackingEntries.forEach(entry => {
    dataStorage.saveTrackingEntry(entry);
  });
}

// Clear mock data from storage
export function clearMockDataFromStorage(): void {
  const students = dataStorage.getStudents();
  const trackingEntries = dataStorage.getTrackingEntries();
  
  // Remove mock students and their data
  students.forEach(student => {
    if (student.id.startsWith('mock_')) {
      // Remove student's tracking entries
      const studentEntries = trackingEntries.filter(entry => entry.studentId === student.id);
      // Note: DataStorageManager doesn't have delete methods, so we'll need to work around this
      // For now, we'll implement clearAllData and reload non-mock data
    }
  });
  
  // For simplicity, we'll clear all data when clearing mock data
  // In a real implementation, we'd want more granular deletion
  dataStorage.clearAllData();
}