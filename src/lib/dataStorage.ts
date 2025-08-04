import { Student, TrackingEntry, Goal, Intervention, Alert, CorrelationData, DataVersion, StorageIndex } from "@/types/student";
import { logger } from './logger';
import { storageUtils } from './storageUtils';

/**
 * @interface IDataStorage
 * @description Defines the contract for data storage operations that analytics services depend on.
 * This ensures a consistent API for fetching data, regardless of the underlying storage implementation.
 */
export interface IDataStorage {
  getStudents(): Student[];
  getTrackingEntriesForStudent(studentId: string): TrackingEntry[];
  getGoalsForStudent(studentId: string): Goal[];
  saveTrackingEntry(entry: TrackingEntry): void;
  getGoals(): Goal[];
}

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
const validateStudent = (data: unknown): data is Student => {
  const student = data as Student;
  return !!(student && typeof student.id === 'string' && typeof student.name === 'string');
};

const validateTrackingEntry = (data: unknown): data is TrackingEntry => {
  const entry = data as TrackingEntry;
  return !!(entry && typeof entry.id === 'string' && typeof entry.studentId === 'string' &&
         entry.timestamp && Array.isArray(entry.emotions) && Array.isArray(entry.sensoryInputs));
};

/**
 * @class DataStorageManager
 * @implements {IDataStorage}
 * @singleton
 * @description Manages all application data in localStorage, providing a structured,
 * safe, and versioned approach to data persistence.
 */
export class DataStorageManager implements IDataStorage {
  private static instance: DataStorageManager;
  private storageIndex: StorageIndex;

  private constructor() {
    this.storageIndex = this.loadStorageIndex();
    this.initializeDataVersion();
  }

  /**
   * Retrieves the singleton instance of the DataStorageManager.
   * @returns {DataStorageManager} The singleton instance.
   */
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
    storageUtils.safeSetItem(STORAGE_KEYS.STORAGE_INDEX, JSON.stringify(this.storageIndex));
  }

  // Generic get all method with validation
  private getAll<T>(key: string, validator?: (data: unknown) => data is T): T[] {
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
      logger.error(`Error loading ${key}:`, error);
      return [];
    }
  }

  // Generic save all method
  private saveAll<T>(key: string, items: T[]): void {
    try {
      storageUtils.safeSetItem(key, JSON.stringify(items));
    } catch (error) {
      logger.error(`Error saving ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save data: ${errorMessage}`);
    }
  }

  // Convert date strings to Date objects recursively
  private convertDates(obj: unknown): unknown {
    if (!obj) return obj;
    
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDates(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertDates(value);
      }
      return converted;
    }
    
    return obj;
  }

  // Public methods for data access

  /**
   * Retrieves all students from storage.
   * @returns {Student[]} An array of student objects.
   */
  public getStudents(): Student[] {
    return this.getAll<Student>(STORAGE_KEYS.STUDENTS, validateStudent);
  }

  /**
   * Retrieves a single student by ID from storage.
   * @param {string} studentId - The ID of the student to retrieve.
   * @returns {Student | null} The student object if found, otherwise null.
   */
  public getStudentById(studentId: string): Student | null {
    try {
      const students = this.getStudents();
      const foundStudent = students.find((s) => s.id === studentId);

      if (foundStudent) {
        return {
          ...foundStudent,
          createdAt: new Date(foundStudent.createdAt),
        };
      }
      return null;
    } catch (error) {
      logger.error('Failed to parse student data from localStorage', error);
      return null;
    }
  }

  /**
   * Saves a student object to storage, either creating a new one or updating an existing one.
   * @param {Student} student - The student object to save.
   */
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

  /**
   * Retrieves all tracking entries for all students.
   * @returns {TrackingEntry[]} An array of tracking entry objects.
   */
  public getTrackingEntries(): TrackingEntry[] {
    return this.getAll<TrackingEntry>(STORAGE_KEYS.TRACKING_ENTRIES, validateTrackingEntry);
  }

  /**
   * Retrieves all tracking entries for a specific student.
   * @param {string} studentId - The ID of the student.
   * @returns {TrackingEntry[]} An array of tracking entries for the specified student.
   */
  public getTrackingEntriesForStudent(studentId: string): TrackingEntry[] {
    return this.getTrackingEntries().filter(entry => entry.studentId === studentId);
  }

  /**
   * Retrieves all tracking entries for a specific student, with date parsing.
   * @param {string} studentId - The ID of the student.
   * @returns {TrackingEntry[]} An array of tracking entries for the specified student.
   */
  public getEntriesForStudent(studentId: string): TrackingEntry[] {
    try {
      const entries = this.getTrackingEntries();
      return entries
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          emotions: entry.emotions.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          })),
          sensoryInputs: entry.sensoryInputs.map((s) => ({
            ...s,
            timestamp: new Date(s.timestamp),
          })),
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error(
        'Failed to parse tracking entries from localStorage',
        error
      );
      return [];
    }
  }

  /**
   * Saves a tracking entry to storage.
   * @param {TrackingEntry} entry - The tracking entry to save.
   */
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

  /**
   * Retrieves all goals for all students.
   * @returns {Goal[]} An array of goal objects.
   */
  public getGoals(): Goal[] {
    return this.getAll<Goal>(STORAGE_KEYS.GOALS);
  }

  /**
   * Retrieves all goals for a specific student.
   * @param {string} studentId - The ID of the student.
   * @returns {Goal[]} An array of goals for the specified student.
   */
  public getGoalsForStudent(studentId: string): Goal[] {
    return this.getGoals().filter(goal => goal.studentId === studentId);
  }

  /**
   * Saves a goal to storage.
   * @param {Goal} goal - The goal object to save.
   */
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

  /**
   * Retrieves all interventions from storage.
   * @returns {Intervention[]} An array of intervention objects.
   */
  public getInterventions(): Intervention[] {
    return this.getAll<Intervention>(STORAGE_KEYS.INTERVENTIONS);
  }

  /**
   * Retrieves all interventions for a specific student.
   * @param {string} studentId - The ID of the student.
   * @returns {Intervention[]} An array of interventions for the specified student.
   */
  public getInterventionsForStudent(studentId: string): Intervention[] {
    return this.getInterventions().filter(intervention => intervention.studentId === studentId);
  }

  /**
   * Saves an intervention to storage.
   * @param {Intervention} intervention - The intervention object to save.
   */
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

  /**
   * Retrieves all alerts from storage.
   * @returns {Alert[]} An array of alert objects.
   */
  public getAlerts(): Alert[] {
    return this.getAll<Alert>(STORAGE_KEYS.ALERTS);
  }

  /**
   * Retrieves all alerts for a specific student.
   * @param {string} studentId - The ID of the student.
   * @returns {Alert[]} An array of alerts for the specified student.
   */
  public getAlertsForStudent(studentId: string): Alert[] {
    return this.getAlerts().filter(alert => alert.studentId === studentId);
  }

  /**
   * Saves an alert to storage.
   * @param {Alert} alert - The alert object to save.
   */
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

  /**
   * Retrieves all correlation data from storage.
   * @returns {CorrelationData[]} An array of correlation data objects.
   */
  public getCorrelations(): CorrelationData[] {
    return this.getAll<CorrelationData>(STORAGE_KEYS.CORRELATIONS);
  }

  /**
   * Retrieves all correlation data for a specific student.
   * @param {string} studentId - The ID of the student.
   * @returns {CorrelationData[]} An array of correlations for the specified student.
   */
  public getCorrelationsForStudent(studentId: string): CorrelationData[] {
    return this.getCorrelations().filter(correlation => correlation.studentId === studentId);
  }

  /**
   * Saves correlation data to storage.
   * @param {CorrelationData} correlation - The correlation data object to save.
   */
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

  /**
   * Exports all data from localStorage into a single JSON string for backup purposes.
   * @returns {string} A JSON string representing all application data.
   */
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

  /**
   * Imports data from a JSON backup string, overwriting existing data.
   * @param {string} jsonData - The JSON string from a backup file.
   */
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
        this.storageIndex = this.convertDates(data.index) as StorageIndex;
        this.saveStorageIndex();
      }
      
      // Data import completed successfully
    } catch (error) {
      // Import failed, throw error with context
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears all application data from localStorage. This is a destructive operation.
   */
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

  /**
   * Calculates and returns statistics about the data currently in storage.
   * @returns {object} An object containing counts of data types and total size.
   */
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

  /**
   * Delete a student and all their associated data
   */
  public deleteStudent(studentId: string): void {
    try {
      
      
      // Remove student from students list
      const students = this.getStudents().filter(s => s.id !== studentId);
      this.saveAll(STORAGE_KEYS.STUDENTS, students);
      
      // Remove all tracking entries for this student
      const entries = this.getTrackingEntries().filter(e => e.studentId !== studentId);
      this.saveAll(STORAGE_KEYS.TRACKING_ENTRIES, entries);
      
      // Remove goals for this student
      const goals = this.getGoals().filter(g => g.studentId !== studentId);
      this.saveAll(STORAGE_KEYS.GOALS, goals);
      
      // Remove interventions for this student  
      const interventions = this.getInterventions().filter(i => i.studentId !== studentId);
      this.saveAll(STORAGE_KEYS.INTERVENTIONS, interventions);
      
      // Remove alerts for this student
      const alerts = this.getAlerts().filter(a => a.studentId !== studentId);
      this.saveAll(STORAGE_KEYS.ALERTS, alerts);
      
      // Remove correlations for this student
      const correlations = this.getCorrelations().filter(c => c.studentId !== studentId);
      this.saveAll(STORAGE_KEYS.CORRELATIONS, correlations);
      
      // Update storage index - remove the student entry
      if (this.storageIndex.students) {
        delete this.storageIndex.students[studentId];
      }
      this.saveStorageIndex();
      
      
    } catch (error) {
      logger.error('Error deleting student:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataStorage = DataStorageManager.getInstance();