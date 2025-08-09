/**
 * Demo Mode Manager for PoC presentations
 * Provides impressive, realistic demo data and scenarios
 */

import { Student, Goal, EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { generateId } from '@/lib/uuid';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: string;
  highlights: string[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'success-story',
    name: 'Sarah\'s Success Story',
    description: 'A student showing remarkable progress over 3 months',
    duration: '3 months',
    highlights: [
      '85% improvement in emotional regulation',
      'Reduced sensory overwhelm incidents by 60%',
      'Achieved 4 out of 5 IEP goals'
    ]
  },
  {
    id: 'new-student',
    name: 'New Student Onboarding',
    description: 'Setting up tracking for a new student',
    duration: '1 week',
    highlights: [
      'Quick baseline establishment',
      'Early pattern detection',
      'Actionable insights within days'
    ]
  },
  {
    id: 'iep-prep',
    name: 'IEP Meeting Preparation',
    description: 'Comprehensive data for an upcoming IEP review',
    duration: '6 weeks',
    highlights: [
      'Data-driven goal adjustments',
      'Clear progress visualization',
      'Professional report generation'
    ]
  }
];

class DemoModeManager {
  private isDemoMode: boolean = false;
  private autoProgressInterval: number | null = null;
  
  constructor() {
    this.isDemoMode = import.meta.env.VITE_FEATURE_DEMO_MODE === 'true';
  }

  /**
   * Generate impressive demo data for a scenario
   */
  generateScenarioData(scenarioId: string): {
    students: Student[];
    goals: Goal[];
    emotions: EmotionEntry[];
    sensory: SensoryEntry[];
    tracking: TrackingEntry[];
  } {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    switch (scenarioId) {
      case 'success-story':
        return this.generateSuccessStoryData();
      case 'new-student':
        return this.generateNewStudentData();
      case 'iep-prep':
        return this.generateIEPPrepData();
      default:
        return this.generateSuccessStoryData();
    }
  }

  /**
   * Generate a success story with impressive progress
   */
  private generateSuccessStoryData() {
    const studentId = generateId();
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const student: Student = {
      id: studentId,
      name: 'Sarah Johnson',
      grade: '3rd Grade',
      dateOfBirth: '2015-03-15',
      createdAt: threeMonthsAgo,
      updatedAt: now,
      notes: 'Shows remarkable progress with consistent intervention'
    };

    // Goals showing clear progress
    const goals: Goal[] = [
      {
        id: generateId(),
        studentId,
        title: 'Emotional Self-Regulation',
        category: 'behavioral',
        measurableObjective: 'Identify and use 3 coping strategies independently',
        currentProgress: 85,
        targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: 'on-track',
        createdAt: threeMonthsAgo,
        updatedAt: now,
        dataPoints: this.generateProgressiveDataPoints(40, 85, 90)
      },
      {
        id: generateId(),
        studentId,
        title: 'Sensory Break Management',
        category: 'sensory',
        measurableObjective: 'Request sensory breaks appropriately 80% of the time',
        currentProgress: 75,
        targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        status: 'on-track',
        createdAt: threeMonthsAgo,
        updatedAt: now,
        dataPoints: this.generateProgressiveDataPoints(30, 75, 90)
      }
    ];

    // Emotions showing improvement over time
    const emotions = this.generateImprovingEmotions(studentId, 90);
    const sensory = this.generateImprovingSensory(studentId, 90);
    const tracking = this.generateTrackingEntries(studentId, goals, 90);

    return { 
      students: [student], 
      goals, 
      emotions, 
      sensory, 
      tracking 
    };
  }

  /**
   * Generate data for a new student (1 week)
   */
  private generateNewStudentData() {
    const studentId = generateId();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const student: Student = {
      id: studentId,
      name: 'Alex Chen',
      grade: '5th Grade',
      dateOfBirth: '2013-09-22',
      createdAt: oneWeekAgo,
      updatedAt: now,
      notes: 'New to the program, establishing baseline'
    };

    const goals: Goal[] = [
      {
        id: generateId(),
        studentId,
        title: 'Baseline Assessment',
        category: 'academic',
        measurableObjective: 'Establish baseline for emotional and sensory patterns',
        currentProgress: 25,
        targetDate: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000),
        status: 'in-progress',
        createdAt: oneWeekAgo,
        updatedAt: now,
        dataPoints: this.generateProgressiveDataPoints(0, 25, 7)
      }
    ];

    const emotions = this.generateVariableEmotions(studentId, 7);
    const sensory = this.generateExploratorySensory(studentId, 7);
    const tracking = this.generateTrackingEntries(studentId, goals, 7);

    return { 
      students: [student], 
      goals, 
      emotions, 
      sensory, 
      tracking 
    };
  }

  /**
   * Generate IEP preparation data (6 weeks)
   */
  private generateIEPPrepData() {
    const studentId = generateId();
    const now = new Date();
    const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
    
    const student: Student = {
      id: studentId,
      name: 'Michael Torres',
      grade: '2nd Grade',
      dateOfBirth: '2016-11-08',
      createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      notes: 'Preparing for quarterly IEP review'
    };

    const goals: Goal[] = [
      {
        id: generateId(),
        studentId,
        title: 'Communication Skills',
        category: 'communication',
        measurableObjective: 'Use AAC device for 5+ functional communications daily',
        currentProgress: 65,
        targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        status: 'on-track',
        createdAt: sixWeeksAgo,
        updatedAt: now,
        dataPoints: this.generateProgressiveDataPoints(45, 65, 42)
      },
      {
        id: generateId(),
        studentId,
        title: 'Social Interaction',
        category: 'social',
        measurableObjective: 'Engage in parallel play for 10+ minutes',
        currentProgress: 55,
        targetDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
        status: 'needs-attention',
        createdAt: sixWeeksAgo,
        updatedAt: now,
        dataPoints: this.generateProgressiveDataPoints(40, 55, 42)
      }
    ];

    const emotions = this.generateMixedEmotions(studentId, 42);
    const sensory = this.generateMixedSensory(studentId, 42);
    const tracking = this.generateTrackingEntries(studentId, goals, 42);

    return { 
      students: [student], 
      goals, 
      emotions, 
      sensory, 
      tracking 
    };
  }

  /**
   * Helper: Generate progressive data points
   */
  private generateProgressiveDataPoints(start: number, end: number, days: number) {
    const points = [];
    const increment = (end - start) / days;
    const now = new Date();
    
    for (let i = 0; i < days; i += 3) {
      const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
      const value = Math.min(100, start + (increment * i) + (Math.random() * 10 - 5));
      points.push({
        timestamp: date,
        value: Math.max(0, value),
        note: i % 7 === 0 ? 'Weekly assessment' : undefined
      });
    }
    
    return points;
  }

  /**
   * Helper: Generate improving emotion patterns
   */
  private generateImprovingEmotions(studentId: string, days: number): EmotionEntry[] {
    const emotions: EmotionEntry[] = [];
    const now = new Date();
    const emotionTypes = ['happy', 'calm', 'anxious', 'frustrated', 'excited', 'tired'];
    
    for (let i = 0; i < days * 2; i++) {
      const daysAgo = Math.floor(i / 2);
      const progress = daysAgo / days; // 0 to 1 over time
      
      // More positive emotions as time progresses
      const emotionWeights = progress > 0.5 
        ? [0.3, 0.3, 0.1, 0.1, 0.15, 0.05] // More happy/calm
        : [0.15, 0.15, 0.25, 0.25, 0.1, 0.1]; // More anxious/frustrated
      
      const emotion = this.weightedRandom(emotionTypes, emotionWeights);
      const intensity = emotion === 'happy' || emotion === 'calm' 
        ? 2 + Math.random() * 2  // Low intensity for positive
        : 3 + Math.random() * 2; // Higher for negative
      
      emotions.push({
        id: generateId(),
        studentId,
        emotion,
        intensity: Math.min(5, intensity),
        triggers: this.getEmotionTriggers(emotion),
        notes: i % 5 === 0 ? 'Good progress noted' : undefined,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    
    return emotions;
  }

  /**
   * Helper: Generate variable emotions for new student
   */
  private generateVariableEmotions(studentId: string, days: number): EmotionEntry[] {
    const emotions: EmotionEntry[] = [];
    const now = new Date();
    const emotionTypes = ['happy', 'anxious', 'confused', 'curious', 'overwhelmed'];
    
    for (let i = 0; i < days * 3; i++) {
      const daysAgo = Math.floor(i / 3);
      const emotion = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
      
      emotions.push({
        id: generateId(),
        studentId,
        emotion,
        intensity: 2 + Math.random() * 3,
        triggers: this.getEmotionTriggers(emotion),
        notes: i === 0 ? 'First day observations' : undefined,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    
    return emotions;
  }

  /**
   * Helper: Generate mixed emotions for IEP prep
   */
  private generateMixedEmotions(studentId: string, days: number): EmotionEntry[] {
    const emotions: EmotionEntry[] = [];
    const now = new Date();
    
    for (let i = 0; i < days * 1.5; i++) {
      const daysAgo = Math.floor(i / 1.5);
      const dayOfWeek = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).getDay();
      
      // More challenges on Mondays, better on Fridays
      const emotion = dayOfWeek === 1 
        ? this.weightedRandom(['anxious', 'frustrated', 'tired'], [0.4, 0.4, 0.2])
        : dayOfWeek === 5
        ? this.weightedRandom(['happy', 'calm', 'excited'], [0.4, 0.4, 0.2])
        : this.weightedRandom(['happy', 'calm', 'anxious', 'frustrated'], [0.25, 0.25, 0.25, 0.25]);
      
      emotions.push({
        id: generateId(),
        studentId,
        emotion,
        intensity: 1 + Math.random() * 4,
        triggers: this.getEmotionTriggers(emotion),
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    
    return emotions;
  }

  /**
   * Helper: Generate improving sensory patterns
   */
  private generateImprovingSensory(studentId: string, days: number): SensoryEntry[] {
    const entries: SensoryEntry[] = [];
    const now = new Date();
    const sensoryTypes = ['auditory', 'visual', 'tactile', 'vestibular', 'proprioceptive'];
    
    for (let i = 0; i < days * 1.5; i++) {
      const daysAgo = Math.floor(i / 1.5);
      const progress = daysAgo / days;
      
      // Better responses over time
      const response = progress > 0.6 
        ? this.weightedRandom(['comfortable', 'regulated', 'seeking'], [0.5, 0.3, 0.2])
        : this.weightedRandom(['overwhelmed', 'avoiding', 'seeking'], [0.3, 0.3, 0.4]);
      
      entries.push({
        id: generateId(),
        studentId,
        sensoryType: sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)],
        response,
        intensity: response === 'comfortable' ? 2 : 3 + Math.random() * 2,
        environmentalFactors: this.getEnvironmentalFactors(),
        duration: `${5 + Math.floor(Math.random() * 25)} minutes`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    
    return entries;
  }

  /**
   * Helper: Generate exploratory sensory data
   */
  private generateExploratorySensory(studentId: string, days: number): SensoryEntry[] {
    const entries: SensoryEntry[] = [];
    const now = new Date();
    const sensoryTypes = ['auditory', 'visual', 'tactile', 'vestibular', 'proprioceptive'];
    
    for (let i = 0; i < days * 2; i++) {
      const daysAgo = Math.floor(i / 2);
      
      entries.push({
        id: generateId(),
        studentId,
        sensoryType: sensoryTypes[Math.floor(Math.random() * sensoryTypes.length)],
        response: ['seeking', 'avoiding', 'mixed'][Math.floor(Math.random() * 3)],
        intensity: 2 + Math.random() * 3,
        environmentalFactors: this.getEnvironmentalFactors(),
        notes: i === 0 ? 'Initial assessment' : undefined,
        duration: `${5 + Math.floor(Math.random() * 20)} minutes`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    
    return entries;
  }

  /**
   * Helper: Generate mixed sensory patterns
   */
  private generateMixedSensory(studentId: string, days: number): SensoryEntry[] {
    const entries: SensoryEntry[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const timeOfDay = i % 3; // Morning, afternoon, evening
      const sensoryType = ['auditory', 'visual', 'tactile'][timeOfDay];
      
      entries.push({
        id: generateId(),
        studentId,
        sensoryType,
        response: timeOfDay === 0 ? 'seeking' : timeOfDay === 1 ? 'avoiding' : 'regulated',
        intensity: 2 + Math.random() * 2,
        environmentalFactors: this.getEnvironmentalFactors(),
        duration: `${10 + Math.floor(Math.random() * 20)} minutes`,
        timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      });
    }
    
    return entries;
  }

  /**
   * Helper: Generate tracking entries
   */
  private generateTrackingEntries(studentId: string, goals: Goal[], days: number): TrackingEntry[] {
    const entries: TrackingEntry[] = [];
    const now = new Date();
    
    for (let i = 0; i < days / 2; i++) {
      const daysAgo = i * 2;
      
      goals.forEach(goal => {
        if (Math.random() > 0.3) { // 70% chance of entry
          entries.push({
            id: generateId(),
            studentId,
            goalId: goal.id,
            value: goal.currentProgress - (daysAgo * 0.5) + (Math.random() * 10 - 5),
            notes: i % 7 === 0 ? 'Weekly review' : undefined,
            timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          });
        }
      });
    }
    
    return entries;
  }

  /**
   * Helper: Weighted random selection
   */
  private weightedRandom(items: string[], weights: number[]): string {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    
    return items[items.length - 1];
  }

  /**
   * Helper: Get emotion triggers
   */
  private getEmotionTriggers(emotion: string): string[] {
    const triggers: Record<string, string[]> = {
      happy: ['peer interaction', 'achievement', 'preferred activity'],
      calm: ['quiet environment', 'structured routine', 'sensory break'],
      anxious: ['transitions', 'unexpected changes', 'loud noises'],
      frustrated: ['difficult tasks', 'communication barriers', 'waiting'],
      excited: ['special events', 'favorite subjects', 'rewards'],
      tired: ['end of day', 'after PE', 'medication effects'],
      overwhelmed: ['crowded spaces', 'multiple instructions', 'sensory overload'],
      confused: ['new concepts', 'unclear expectations', 'changes'],
      curious: ['new materials', 'science activities', 'questions']
    };
    
    const emotionTriggers = triggers[emotion] || ['unspecified'];
    return [emotionTriggers[Math.floor(Math.random() * emotionTriggers.length)]];
  }

  /**
   * Helper: Get environmental factors
   */
  private getEnvironmentalFactors(): string[] {
    const factors = [
      'classroom', 'playground', 'cafeteria', 'gym', 'library',
      'quiet', 'noisy', 'bright lights', 'dim lighting', 'crowded',
      'one-on-one', 'small group', 'whole class'
    ];
    
    const count = 1 + Math.floor(Math.random() * 3);
    const selected: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const factor = factors[Math.floor(Math.random() * factors.length)];
      if (!selected.includes(factor)) {
        selected.push(factor);
      }
    }
    
    return selected;
  }

  /**
   * Start auto-progression for live demos
   */
  startAutoProgress(intervalMs: number = 5000) {
    if (this.autoProgressInterval) {
      clearInterval(this.autoProgressInterval);
    }
    
    this.autoProgressInterval = window.setInterval(() => {
      // Emit events to simulate real-time updates
      window.dispatchEvent(new CustomEvent('demo-progress', {
        detail: {
          type: 'emotion',
          data: this.generateRandomEmotion()
        }
      }));
    }, intervalMs);
  }

  /**
   * Stop auto-progression
   */
  stopAutoProgress() {
    if (this.autoProgressInterval) {
      clearInterval(this.autoProgressInterval);
      this.autoProgressInterval = null;
    }
  }

  /**
   * Generate a random emotion for live updates
   */
  private generateRandomEmotion() {
    const emotions = ['happy', 'calm', 'anxious', 'excited'];
    return {
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      intensity: 1 + Math.random() * 4,
      timestamp: new Date()
    };
  }

  /**
   * Check if demo mode is enabled
   */
  get isEnabled(): boolean {
    return this.isDemoMode;
  }
}

export const demoMode = new DemoModeManager();
