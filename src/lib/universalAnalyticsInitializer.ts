import { lazyAnalyticsManager } from './lazyAnalyticsManager';
import { dataStorage } from './dataStorage';
import { logger } from './logger';

/**
 * Universal Analytics Initializer
 * Ensures all students have analytics enabled with pattern detection
 */

export class UniversalAnalyticsInitializer {
  private static instance: UniversalAnalyticsInitializer;
  private initialized = false;

  static getInstance(): UniversalAnalyticsInitializer {
    if (!UniversalAnalyticsInitializer.instance) {
      UniversalAnalyticsInitializer.instance = new UniversalAnalyticsInitializer();
    }
    return UniversalAnalyticsInitializer.instance;
  }

  /**
   * Initialize analytics for all existing and new students
   */
  async initializeUniversalAnalytics(): Promise<void> {
    if (this.initialized) return;

    try {
      
      
      // Get all existing students
      const students = dataStorage.getStudents();
      
      // Initialize analytics for each student
      for (const student of students) {
        await this.ensureStudentHasAnalytics(student.id);
      }
      
      this.initialized = true;
      
    } catch (error) {
      logger.error('Error initializing universal analytics:', error);
    }
  }

  /**
   * Ensure a specific student has analytics infrastructure enabled (no auto-data generation)
   */
  async ensureStudentHasAnalytics(studentId: string): Promise<void> {
    try {
      const manager = await lazyAnalyticsManager.getInstance();
      // Initialize analytics infrastructure only
      manager.initializeStudentAnalytics(studentId);
      
      
    } catch (error) {
      logger.error(`Error ensuring analytics for student ${studentId}:`, error);
    }
  }

  /**
   * Initialize analytics infrastructure for a new student (no auto-data generation)
   */
  async initializeNewStudentAnalytics(studentId: string): Promise<void> {
    const manager = await lazyAnalyticsManager.getInstance();
    manager.initializeStudentAnalytics(studentId);
  }

  /**
   * Get initialization status
   */
  async getInitializationStatus(): Promise<{
    isInitialized: boolean;
    studentsWithAnalytics: number;
    totalStudents: number;
  }> {
    const students = dataStorage.getStudents();
    const manager = await lazyAnalyticsManager.getInstance();
    const analyticsStatus = manager.getAnalyticsStatus();
    
    return {
      isInitialized: this.initialized,
      studentsWithAnalytics: analyticsStatus.filter(s => s.isInitialized).length,
      totalStudents: students.length
    };
  }

  /**
   * Force re-initialization (useful for testing or troubleshooting)
   */
  async forceReinitialization(): Promise<void> {
    this.initialized = false;
    await this.initializeUniversalAnalytics();
  }
}

// Export singleton instance
export const universalAnalyticsInitializer = UniversalAnalyticsInitializer.getInstance();

// Auto-initialize on import (runs once when the module is loaded)
universalAnalyticsInitializer.initializeUniversalAnalytics().catch((error) => logger.error('Auto-initialization failed:', error));
