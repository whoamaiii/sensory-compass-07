import { Student, TrackingEntry, EmotionEntry, SensoryEntry, EnvironmentalEntry, Goal } from '@/types/student';
import { dataStorage } from './dataStorage';
import { logger } from './logger';
import { generateId } from './uuid';
import { validateEmotionEntry, validateSensoryEntry, validateTrackingEntry } from './dataValidation';

// Helper function to get a random date within the last N days
const getRandomDate = (daysAgo: number, variance: number = 0): Date => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  
  if (variance > 0) {
    const varianceMs = variance * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const randomOffset = (Math.random() - 0.5) * 2 * varianceMs;
    baseDate.setTime(baseDate.getTime() + randomOffset);
  }
  
  return baseDate;
};


// Generate realistic emotion entry
export const generateEmotionEntry = (studentId: string, timestamp: Date, emotionBias?: string): EmotionEntry => {
  const emotions = ['happy', 'sad', 'anxious', 'calm', 'excited', 'frustrated', 'content'];
  const biasedEmotion = emotionBias || emotions[Math.floor(Math.random() * emotions.length)];
  
  // Generate intensity based on emotion type
  const intensityMap: Record<string, [number, number]> = {
    'happy': [3, 5],
    'sad': [2, 4],
    'anxious': [3, 5],
    'calm': [2, 4],
    'excited': [4, 5],
    'frustrated': [3, 5],
    'content': [2, 4],
    'overwhelmed': [4, 5]
  };
  
  const [minIntensity, maxIntensity] = intensityMap[biasedEmotion] || [2, 4];
  const intensity = Math.floor(Math.random() * (maxIntensity - minIntensity + 1)) + minIntensity;
  
  const entry: EmotionEntry = {
    id: generateId('emotion'),
    studentId,
    timestamp,
    emotion: biasedEmotion,
    intensity,
    triggers: Math.random() > 0.7 ? ['environmental change', 'social interaction'] : [],
    notes: Math.random() > 0.8 ? `Student seemed ${biasedEmotion} during this period` : ''
  };
  
  // Validate the generated entry
  const validationResult = validateEmotionEntry(entry);
  if (!validationResult.isValid) {
    logger.error('Generated invalid emotion entry:', entry, validationResult.errors);
    throw new Error('Failed to generate valid emotion entry');
  }
  
  return entry;
};

// Generate realistic sensory entry
export const generateSensoryEntry = (studentId: string, timestamp: Date, seeking?: boolean): SensoryEntry => {
  const sensoryTypes = ['visual', 'auditory', 'tactile', 'vestibular', 'proprioceptive'];
  const type = sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)];
  
  // Determine response based on seeking behavior
  const responses = seeking ? ['seeking', 'engaging', 'exploring'] : ['avoiding', 'withdrawing', 'defensive'];
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  const intensity = Math.floor(Math.random() * 5) + 1;
  
  const entry: SensoryEntry = {
    id: generateId('sensory'),
    studentId,
    timestamp,
    type,
    sensoryType: type,
    response,
    intensity,
    notes: Math.random() > 0.8 ? `${type} input was ${response}` : ''
  };
  
  // Validate the generated entry
  const validationResult = validateSensoryEntry(entry);
  if (!validationResult.isValid) {
    logger.error('Generated invalid sensory entry:', entry, validationResult.errors);
    throw new Error('Failed to generate valid sensory entry');
  }
  
  return entry;
};

// Generate environmental entry
const generateEnvironmentalEntry = (timestamp: Date, correlationFactors?: { noise?: boolean; bright?: boolean }): EnvironmentalEntry => {
  const factors = correlationFactors || {};
  
  return {
    id: generateId('env'),
    timestamp,
    location: ['classroom', 'library', 'cafeteria', 'playground', 'hallway'][Math.floor(Math.random() * 5)],
    socialContext: ['individual work', 'group activity', 'instruction', 'transition'][Math.floor(Math.random() * 4)],
    roomConditions: {
      noiseLevel: factors.noise !== undefined ? (factors.noise ? 4 : 2) : Math.floor(Math.random() * 5) + 1,
      lighting: factors.bright !== undefined ? (factors.bright ? 'bright' : 'dim') : ['bright', 'moderate', 'dim'][Math.floor(Math.random() * 3)],
      temperature: Math.floor(Math.random() * 10) + 18, // 18-28°C
      humidity: Math.floor(Math.random() * 20) + 40 // 40-60%
    },
    weather: {
      condition: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'][Math.floor(Math.random() * 5)] as 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy',
      temperature: Math.floor(Math.random() * 15) + 10, // 10-25°C
      pressure: Math.floor(Math.random() * 50) + 1000 // 1000-1050 hPa
    },
    classroom: {
      activity: ['instruction', 'transition', 'free-time', 'testing', 'group-work'][Math.floor(Math.random() * 5)] as 'instruction' | 'transition' | 'free-time' | 'testing' | 'group-work',
      studentCount: Math.floor(Math.random() * 20) + 10, // 10-30 students
      timeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)] as 'morning' | 'afternoon' | 'evening'
    },
    notes: Math.random() > 0.9 ? 'Notable environmental conditions' : ''
  };
};

// Generate tracking entry for a student based on scenario
export const generateTrackingEntry = (student: Student, daysAgo: number, scenario: 'emma' | 'lars' | 'astrid'): TrackingEntry => {
  const timestamp = getRandomDate(daysAgo, 0.5);
  
  const entry: TrackingEntry = {
    id: generateId(`tracking_${student.id}`),
    studentId: student.id,
    timestamp,
    emotions: [],
    sensoryInputs: [],
    environmentalData: generateEnvironmentalEntry(timestamp),
    notes: ''
  };

  // Generate scenario-specific data
  switch (scenario) {
    case 'emma': // Mild anxiety patterns with improvement over time
      {
        const dayIndex = Math.max(0, 90 - daysAgo); // 90 days of improvement
        const anxietyLevel = Math.max(1, 4 - (dayIndex * 0.02)); // Gradual improvement
        
        entry.emotions.push(generateEmotionEntry(student.id, timestamp, 
          Math.random() > anxietyLevel / 5 ? 'calm' : 'anxious'));
        
        // Add sensory seeking behaviors that correlate with emotions
        entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, 
          entry.emotions[0].emotion === 'anxious'));
        
        if (Math.random() > 0.7) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'content'));
        }
      }
      break;
      
    case 'lars': // Sensory processing challenges
      {
        // Lars has consistent sensory challenges with tactile sensitivity
        entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, false)); // Often avoiding
        
        if (Math.random() > 0.5) {
          entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, true)); // Sometimes seeking
        }
        
        // Emotions often correlate with sensory state
        const sensoryIntensity = entry.sensoryInputs[0].intensity || 3;
        const emotionType = sensoryIntensity > 3 ? 
          (Math.random() > 0.6 ? 'frustrated' : 'anxious') : 
          (Math.random() > 0.5 ? 'calm' : 'content');
          
        entry.emotions.push(generateEmotionEntry(student.id, timestamp, emotionType));
        
        // Environmental correlation - noise affects Lars significantly
        if (entry.environmentalData?.roomConditions?.noiseLevel && entry.environmentalData.roomConditions.noiseLevel > 3) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp, 'overwhelmed'));
        }
      }
      break;
      
    case 'astrid': // Steady improvement and positive patterns
      {
        const dayIndex = Math.max(0, 120 - daysAgo); // 120 days of data
        const progressFactor = dayIndex / 120;
        
        // Astrid shows steady emotional improvement
        const emotionTypes = progressFactor > 0.7 ? 
          ['happy', 'content', 'excited'] : 
          progressFactor > 0.4 ? 
            ['calm', 'content', 'happy'] : 
            ['anxious', 'sad', 'frustrated'];
            
        const selectedEmotion = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
        entry.emotions.push(generateEmotionEntry(student.id, timestamp, selectedEmotion));
        
        // Sensory seeking increases with confidence
        const seekingProbability = 0.3 + (progressFactor * 0.4);
        entry.sensoryInputs.push(generateSensoryEntry(student.id, timestamp, 
          Math.random() < seekingProbability));
        
        // Occasionally add multiple entries for comprehensive tracking
        if (Math.random() > 0.6) {
          entry.emotions.push(generateEmotionEntry(student.id, timestamp));
        }
      }
      break;
  }

  // Add notes based on the generated data
  if (entry.emotions.length > 1 || entry.sensoryInputs.length > 1) {
    entry.notes = `Complex session with multiple ${entry.emotions.length > 1 ? 'emotional states' : 'sensory needs'}`;
  }

  return entry;
};

// Generate mock students
export const generateMockStudents = (): Student[] => {
  const createMockGoal = (studentId: string, title: string, description: string): Goal => {
    const progress = Math.floor(Math.random() * 50) + 25;
    return {
      id: generateId('goal'),
      studentId,
      title,
      description,
      category: 'sensory' as const,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      createdDate: new Date(),
      updatedAt: new Date(),
      status: 'active' as const,
      measurableObjective: description,
      currentProgress: progress,
      progress,
      milestones: [],
      interventions: [],
      dataPoints: []
    };
  };

  const students: Student[] = [
    {
      id: 'mock_emma_001',
      name: 'Emma Larsen',
      grade: '8',
      dateOfBirth: new Date('2011-03-15').toISOString().split('T')[0],
      notes: 'Mild anxiety, responds well to sensory breaks',
      iepGoals: [
        createMockGoal('mock_emma_001', 'Reduce anxiety episodes', 'Reduce anxiety episodes through sensory regulation'),
        createMockGoal('mock_emma_001', 'Improve emotional self-awareness', 'Improve emotional self-awareness through tracking')
      ],
      createdAt: new Date('2024-01-15'),
      lastUpdated: new Date(),
      version: 1
    },
    {
      id: 'mock_lars_002',
      name: 'Lars Andersen',
      grade: '6',
      dateOfBirth: new Date('2013-08-22').toISOString().split('T')[0],
      notes: 'Sensory processing disorder, tactile defensiveness',
      iepGoals: [
        createMockGoal('mock_lars_002', 'Increase tactile tolerance', 'Increase tactile tolerance through gradual exposure'),
        createMockGoal('mock_lars_002', 'Develop sensory self-regulation', 'Develop sensory self-regulation strategies')
      ],
      createdAt: new Date('2024-02-01'),
      lastUpdated: new Date(),
      version: 1
    },
    {
      id: 'mock_astrid_003',
      name: 'Astrid Berg',
      grade: '9',
      dateOfBirth: new Date('2010-11-08').toISOString().split('T')[0],
      notes: 'ADHD, benefits from sensory input for focus',
      iepGoals: [
        createMockGoal('mock_astrid_003', 'Improve attention span', 'Improve attention span through sensory strategies'),
        createMockGoal('mock_astrid_003', 'Develop independent self-regulation', 'Develop independent self-regulation skills')
      ],
      createdAt: new Date('2024-01-20'),
      lastUpdated: new Date(),
      version: 1
    }
  ];

  return students;
};

// Generate tracking data for a student
const generateTrackingDataForStudent = (student: Student, scenario: 'emma' | 'lars' | 'astrid'): TrackingEntry[] => {
  const entries: TrackingEntry[] = [];
  const totalDays = Math.floor(Math.random() * 60) + 30; // 30-90 days of data
  
  for (let i = 0; i < totalDays; i++) {
    // Generate 1-3 entries per day with some days having no entries
    const entriesPerDay = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
    
    for (let j = 0; j < entriesPerDay; j++) {
      const daysAgo = i + (j * 0.3); // Spread entries throughout the day
      entries.push(generateTrackingEntry(student, daysAgo, scenario));
    }
  }
  
  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate all mock data
export const generateAllMockData = (): { students: Student[]; trackingEntries: TrackingEntry[] } => {
  const students = generateMockStudents();
  const trackingEntries: TrackingEntry[] = [];
  
  const scenarios: Array<'emma' | 'lars' | 'astrid'> = ['emma', 'lars', 'astrid'];
  
  students.forEach((student, index) => {
    const scenario = scenarios[index];
    const studentEntries = generateTrackingDataForStudent(student, scenario);
    trackingEntries.push(...studentEntries);
  });
  
  return { students, trackingEntries };
};

export function loadMockDataToStorage(): void {
  try {
    // Clear only existing mock data first
    clearMockDataFromStorage();
    
    const { students, trackingEntries } = generateAllMockData();
    
    // Save students
    students.forEach(student => {
      dataStorage.saveStudent(student);
    });
    
    // Save tracking entries
    trackingEntries.forEach(entry => {
      dataStorage.saveTrackingEntry(entry);
    });
  } catch (error) {
    logger.error('Failed to load mock data:', error);
    throw new Error('Failed to initialize mock data');
  }
}

export function clearMockDataFromStorage(): void {
  try {
    const allStudents = dataStorage.getStudents();
    const allEntries = dataStorage.getTrackingEntries();
    
    // Filter out mock data
    const nonMockStudents = allStudents.filter(student => !student.id.startsWith('mock_'));
    const nonMockEntries = allEntries.filter(entry => !entry.studentId.startsWith('mock_'));
    
    // Clear all data and re-save only non-mock data
    dataStorage.clearAllData();
    
    // Restore non-mock data
    nonMockStudents.forEach(student => dataStorage.saveStudent(student));
    nonMockEntries.forEach(entry => dataStorage.saveTrackingEntry(entry));
  } catch (error) {
    logger.error('Failed to clear mock data:', error);
    throw new Error('Failed to clear mock data');
  }
}