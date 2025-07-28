export interface Student {
  id: string;
  name: string;
  grade?: string;
  dateOfBirth?: string;
  notes?: string;
  createdAt: Date;
  // IEP and baseline data
  iepGoals?: Goal[];
  baselineData?: BaselineData;
  environmentalPreferences?: EnvironmentalPreferences;
  // Additional metadata
  lastUpdated?: Date;
  version?: number;
}

export interface EmotionEntry {
  id: string;
  studentId?: string;
  emotion: string;
  intensity: number;
  timestamp: Date;
  notes?: string;
  triggers?: string[];
  context?: string;
  trigger?: string;
}

export interface SensoryEntry {
  id: string;
  studentId?: string;
  sensoryType?: string;
  type?: string;
  input?: string;
  response: string;
  intensity?: number;
  timestamp: Date;
  notes?: string;
  environment?: string;
  context?: string;
}

export interface TrackingEntry {
  id: string;
  studentId: string;
  timestamp: Date;
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  environmentalData?: EnvironmentalEntry;
  generalNotes?: string;
  notes?: string;
  version?: number;
}

// New interfaces for enhanced functionality
export interface EnvironmentalEntry {
  id?: string;
  timestamp?: Date;
  location?: string;
  socialContext?: string;
  roomConditions?: {
    temperature?: number;
    humidity?: number;
    lighting?: string;
    noiseLevel?: number;
  };
  weather?: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
    temperature?: number;
    pressure?: number;
  };
  classroom?: {
    activity?: 'instruction' | 'transition' | 'free-time' | 'testing' | 'group-work';
    studentCount?: number;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
  notes?: string;
}

export interface Goal {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: 'behavioral' | 'academic' | 'social' | 'sensory' | 'communication';
  targetDate: Date;
  createdDate: Date;
  status: 'active' | 'achieved' | 'modified' | 'discontinued';
  measurableObjective: string;
  currentProgress: number; // 0-100 percentage
  milestones: Milestone[];
  interventions: string[]; // IDs of associated interventions
  baselineValue?: number;
  targetValue?: number;
  dataPoints: GoalDataPoint[];
  notes?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  isCompleted: boolean;
  completedDate?: Date;
  notes?: string;
}

export interface GoalDataPoint {
  id: string;
  timestamp: Date;
  value: number;
  notes?: string;
  collectedBy?: string;
}

export interface Alert {
  id: string;
  studentId: string;
  type: 'pattern' | 'regression' | 'achievement' | 'environmental' | 'correlation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  trigger: string;
  timestamp: Date;
  isRead: boolean;
  isResolved: boolean;
  resolvedDate?: Date;
  resolvedBy?: string;
  actionItems?: string[];
  relatedData?: {
    goalId?: string;
    trackingEntryId?: string;
    correlationData?: CorrelationData;
  };
}

export interface Intervention {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: 'sensory' | 'behavioral' | 'environmental' | 'instructional' | 'social';
  strategy: string;
  implementationDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued' | 'modified';
  effectiveness: 1 | 2 | 3 | 4 | 5; // 1 = not effective, 5 = very effective
  frequency: 'daily' | 'weekly' | 'as-needed' | 'continuous';
  implementedBy: string[];
  dataCollection: InterventionDataPoint[];
  relatedGoals: string[]; // Goal IDs
  notes?: string;
  evidenceBase?: string; // Research or evidence supporting this intervention
}

export interface InterventionDataPoint {
  id: string;
  timestamp: Date;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  implementation: 'full' | 'partial' | 'modified' | 'skipped';
  notes?: string;
  collectedBy?: string;
}

export interface CorrelationData {
  id: string;
  studentId: string;
  type: 'emotion-sensory' | 'emotion-environment' | 'sensory-environment' | 'goal-intervention';
  strength: number; // -1 to 1, correlation coefficient
  confidence: number; // 0 to 1, confidence level
  primaryFactor: string;
  secondaryFactor: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  dataPoints: number; // Number of data points used in correlation
  insights: string[];
  recommendations?: string[];
  lastCalculated: Date;
}

export interface BaselineData {
  emotionalRegulation: {
    averageIntensity: number;
    mostCommonEmotion: string;
    triggerFrequency: Record<string, number>;
  };
  sensoryProcessing: {
    seekingBehaviors: Record<string, number>;
    avoidingBehaviors: Record<string, number>;
    preferredSensoryInput: string[];
  };
  environmentalFactors: {
    optimalConditions: Partial<EnvironmentalEntry['roomConditions']>;
    challengingConditions: string[];
  };
  collectedDate: Date;
  collectedBy: string;
}

export interface EnvironmentalPreferences {
  lighting: string[];
  noiseLevel: number;
  temperature: {
    preferred: number;
    tolerance: number;
  };
  seating: string[];
  classroomLayout: string[];
  notes?: string;
}

// Data storage and versioning interfaces
export interface DataVersion {
  version: number;
  timestamp: Date;
  changes: string[];
  backupData?: any;
}

export interface StorageIndex {
  students: Record<string, Date>; // studentId -> lastModified
  trackingEntries: Record<string, Date>; // entryId -> timestamp
  goals: Record<string, Date>; // goalId -> lastModified
  interventions: Record<string, Date>; // interventionId -> lastModified
  alerts: Record<string, Date>; // alertId -> timestamp
  lastUpdated: Date;
}