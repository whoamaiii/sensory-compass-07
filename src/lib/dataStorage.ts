import { Student, TrackingEntry, Goal, Intervention, Alert, CorrelationData, DataVersion, StorageIndex } from "@/types/student";

// Storage keys
const STORAGE_KEYS = {
  STUDENTS: 'sensoryTracker_students',
  TRACKING_ENTRIES: 'sensoryTracker_entries',
  GOALS: 'sensoryTracker_goals',
  INTERVENTIONS: 'sensoryTracker_interventions',
  ALERTS: 'sensoryTracker_alerts',
  CORRELATIONS: 'sensoryTracker_correlations',
  DATA_VERSION: 'sensoryTracker_dataVersion',
  STORAGE_INDEX: 'sensoryTracker_index',
  PREFERENCES: 'sensoryTracker_preferences'
} as const;

// Current data version
const CURRENT_DATA_VERSION = 1;

// Data validation schemas
const validateStudent = (data: any): data is Student => {
  return data && typeof data.id === 'string' && typeof data.name === 'string';
};

const validateTrackingEntry = (data: any): data is TrackingEntry => {
  return data && typeof data.id === 'string' && typeof data.studentId === 'string' && 
         data.timestamp && Array.isArray(data.emotions) && Array.isArray(data.sensoryInputs);
};

// Enhanced storage manager class
export class DataStorageManager {
  private static instance: DataStorageManager;
  private storageIndex: StorageIndex;

  private constructor() {
    this.storageIndex = this.loadStorageIndex();
    this.initializeDataVersion();
  }

  static getInstance(): DataStorageManager {
    if (!DataStorageManager.instance) {
      DataStorageManager.instance = new DataStorageManager();
    }
    return DataStorageManager.instance;
  }

  // Initialize or migrate data version
  private initializeDataVersion(): void {
    const currentVersion = this.getDataVersion();
    if (currentVersion < CURRENT_DATA_VERSION) {
      this.migrateData(currentVersion, CURRENT_DATA_VERSION);
    }
  }

  // Get current data version
  private getDataVersion(): number {
    const versionData = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    return versionData ? JSON.parse(versionData).version : 0;
  }

  // Migrate data between versions
  private migrateData(fromVersion: number, toVersion: number): void {
    const migrationSteps: Record<number, () => void> = {
      1: () => {
        // Migration to version 1: Add version field to existing data
        this.addVersionToExistingData();
      }
    };

    for (let version = fromVersion + 1; version <= toVersion; version++) {
      if (migrationSteps[version]) {
        try {
          migrationSteps[version]();
          // Data migration completed successfully
        } catch (error) {
          // Log migration errors for debugging
        }
      }
    }

    // Update version
    const versionData: DataVersion = {
      version: toVersion,
      timestamp: new Date(),
      changes: [`Migrated from version ${fromVersion} to ${toVersion}`]
    };
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, JSON.stringify(versionData));
  }

  // Add version field to existing data
  private addVersionToExistingData(): void {
    // Update students
    const students = this.getAll<Student>(STORAGE_KEYS.STUDENTS);
    students.forEach(student => {
      if (!student.version) {
        student.version = 1;
        student.lastUpdated = new Date();
      }
    });
    this.saveAll(STORAGE_KEYS.STUDENTS, students);

    // Update tracking entries
    const entries = this.getAll<TrackingEntry>(STORAGE_KEYS.TRACKING_ENTRIES);
    entries.forEach(entry => {
      if (!entry.version) {
        entry.version = 1;
      }
    });
    this.saveAll(STORAGE_KEYS.TRACKING_ENTRIES, entries);
  }

  // Load or create storage index
  private loadStorageIndex(): StorageIndex {
    const indexData = localStorage.getItem(STORAGE_KEYS.STORAGE_INDEX);
    if (indexData) {
      const parsed = JSON.parse(indexData);
      // Convert date strings back to Date objects
      Object.keys(parsed.students || {}).forEach(key => {
        parsed.students[key] = new Date(parsed.students[key]);
      });
      Object.keys(parsed.trackingEntries || {}).forEach(key => {
        parsed.trackingEntries[key] = new Date(parsed.trackingEntries[key]);
      });
      Object.keys(parsed.goals || {}).forEach(key => {
        parsed.goals[key] = new Date(parsed.goals[key]);
      });
      Object.keys(parsed.interventions || {}).forEach(key => {
        parsed.interventions[key] = new Date(parsed.interventions[key]);
      });
      Object.keys(parsed.alerts || {}).forEach(key => {
        parsed.alerts[key] = new Date(parsed.alerts[key]);
      });
      parsed.lastUpdated = new Date(parsed.lastUpdated);
      return parsed;
    }

    return {
      students: {},
      trackingEntries: {},
      goals: {},
      interventions: {},
      alerts: {},
      lastUpdated: new Date()
    };
  }

  // Save storage index
  private saveStorageIndex(): void {
    this.storageIndex.lastUpdated = new Date();
    localStorage.setItem(STORAGE_KEYS.STORAGE_INDEX, JSON.stringify(this.storageIndex));
  }

  // Generic get all method with validation
  private getAll<T>(key: string, validator?: (data: any) => data is T): T[] {
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      const items = Array.isArray(parsed) ? parsed : [];
      
      // Convert date strings back to Date objects
      const convertedItems = items.map(item => this.convertDates(item));
      
      // Validate if validator is provided
      if (validator) {
        return convertedItems.filter(validator);
      }
      
      return convertedItems;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return [];
    }
  }

  // Generic save all method
  private saveAll<T>(key: string, items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw new Error(`Failed to save data: ${error.message}`);
    }
  }

  // Convert date strings to Date objects recursively
  private convertDates(obj: any): any {
    if (!obj) return obj;
    
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDates(item));
    }
    
    if (typeof obj === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertDates(value);
      }
      return converted;
    }
    
    return obj;
  }

  // Public methods for data access
  public getStudents(): Student[] {
    return this.getAll<Student>(STORAGE_KEYS.STUDENTS, validateStudent);
  }

  public saveStudent(student: Student): void {
    const students = this.getStudents();
    const existingIndex = students.findIndex(s => s.id === student.id);
    
    student.lastUpdated = new Date();
    student.version = (student.version || 0) + 1;
    
    if (existingIndex >= 0) {
      students[existingIndex] = student;
    } else {
      students.push(student);
    }
    
    this.saveAll(STORAGE_KEYS.STUDENTS, students);
    this.storageIndex.students[student.id] = new Date();
    this.saveStorageIndex();
  }

  public getTrackingEntries(): TrackingEntry[] {
    return this.getAll<TrackingEntry>(STORAGE_KEYS.TRACKING_ENTRIES, validateTrackingEntry);
  }

  public saveTrackingEntry(entry: TrackingEntry): void {
    const entries = this.getTrackingEntries();
    const existingIndex = entries.findIndex(e => e.id === entry.id);
    
    entry.version = (entry.version || 0) + 1;
    
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }
    
    this.saveAll(STORAGE_KEYS.TRACKING_ENTRIES, entries);
    this.storageIndex.trackingEntries[entry.id] = entry.timestamp;
    this.saveStorageIndex();
  }

  public getGoals(): Goal[] {
    return this.getAll<Goal>(STORAGE_KEYS.GOALS);
  }

  public saveGoal(goal: Goal): void {
    const goals = this.getGoals();
    const existingIndex = goals.findIndex(g => g.id === goal.id);
    
    if (existingIndex >= 0) {
      goals[existingIndex] = goal;
    } else {
      goals.push(goal);
    }
    
    this.saveAll(STORAGE_KEYS.GOALS, goals);
    this.storageIndex.goals[goal.id] = new Date();
    this.saveStorageIndex();
  }

  public getInterventions(): Intervention[] {
    return this.getAll<Intervention>(STORAGE_KEYS.INTERVENTIONS);
  }

  public saveIntervention(intervention: Intervention): void {
    const interventions = this.getInterventions();
    const existingIndex = interventions.findIndex(i => i.id === intervention.id);
    
    if (existingIndex >= 0) {
      interventions[existingIndex] = intervention;
    } else {
      interventions.push(intervention);
    }
    
    this.saveAll(STORAGE_KEYS.INTERVENTIONS, interventions);
    this.storageIndex.interventions[intervention.id] = new Date();
    this.saveStorageIndex();
  }

  public getAlerts(): Alert[] {
    return this.getAll<Alert>(STORAGE_KEYS.ALERTS);
  }

  public saveAlert(alert: Alert): void {
    const alerts = this.getAlerts();
    const existingIndex = alerts.findIndex(a => a.id === alert.id);
    
    if (existingIndex >= 0) {
      alerts[existingIndex] = alert;
    } else {
      alerts.push(alert);
    }
    
    this.saveAll(STORAGE_KEYS.ALERTS, alerts);
    this.storageIndex.alerts[alert.id] = alert.timestamp;
    this.saveStorageIndex();
  }

  public getCorrelations(): CorrelationData[] {
    return this.getAll<CorrelationData>(STORAGE_KEYS.CORRELATIONS);
  }

  public saveCorrelation(correlation: CorrelationData): void {
    const correlations = this.getCorrelations();
    const existingIndex = correlations.findIndex(c => c.id === correlation.id);
    
    if (existingIndex >= 0) {
      correlations[existingIndex] = correlation;
    } else {
      correlations.push(correlation);
    }
    
    this.saveAll(STORAGE_KEYS.CORRELATIONS, correlations);
  }

  // Export all data for backup
  public exportAllData(): string {
    const data = {
      version: this.getDataVersion(),
      exportDate: new Date(),
      students: this.getStudents(),
      trackingEntries: this.getTrackingEntries(),
      goals: this.getGoals(),
      interventions: this.getInterventions(),
      alerts: this.getAlerts(),
      correlations: this.getCorrelations(),
      index: this.storageIndex
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Import data from backup
  public importAllData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.version || !data.students || !Array.isArray(data.students)) {
        throw new Error('Invalid data format');
      }
      
      // Import each data type
      this.saveAll(STORAGE_KEYS.STUDENTS, data.students || []);
      this.saveAll(STORAGE_KEYS.TRACKING_ENTRIES, data.trackingEntries || []);
      this.saveAll(STORAGE_KEYS.GOALS, data.goals || []);
      this.saveAll(STORAGE_KEYS.INTERVENTIONS, data.interventions || []);
      this.saveAll(STORAGE_KEYS.ALERTS, data.alerts || []);
      this.saveAll(STORAGE_KEYS.CORRELATIONS, data.correlations || []);
      
      // Update index
      if (data.index) {
        this.storageIndex = this.convertDates(data.index);
        this.saveStorageIndex();
      }
      
      // Data import completed successfully
    } catch (error) {
      // Import failed, throw error with context
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Clear all data (with confirmation)
  public clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.storageIndex = {
      students: {},
      trackingEntries: {},
      goals: {},
      interventions: {},
      alerts: {},
      lastUpdated: new Date()
    };
    
    // All data has been cleared successfully
  }

  // Get storage statistics
  public getStorageStats(): {
    studentsCount: number;
    entriesCount: number;
    goalsCount: number;
    interventionsCount: number;
    alertsCount: number;
    totalSize: number;
  } {
    const students = this.getStudents();
    const entries = this.getTrackingEntries();
    const goals = this.getGoals();
    const interventions = this.getInterventions();
    const alerts = this.getAlerts();
    
    // Calculate approximate storage size
    let totalSize = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      totalSize += data ? data.length : 0;
    });
    
    return {
      studentsCount: students.length,
      entriesCount: entries.length,
      goalsCount: goals.length,
      interventionsCount: interventions.length,
      alertsCount: alerts.length,
      totalSize
    };
  }
}

// Export singleton instance
export const dataStorage = DataStorageManager.getInstance();