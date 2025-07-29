import { TriggerAlert } from "./patternAnalysis";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { patternAnalysis } from "./patternAnalysis";

export interface AlertSettings {
  enableHighIntensityAlerts: boolean;
  highIntensityThreshold: number;
  enablePatternAlerts: boolean;
  minimumDataPoints: number;
  alertFrequencyDays: number;
}

/**
 * Represents a single entry in the alert history.
 *
 * This interface defines the structure of an alert history entry,
 * including its trigger alert, viewing status, resolution status,
 * and associated metadata.
 */
export interface AlertHistoryEntry {
  alert: TriggerAlert;
  viewed: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedNotes?: string;
}

/**
 * Represents the structure of a raw alert history entry from local storage.
 */
type StoredAlertHistoryEntry = Omit<AlertHistoryEntry, 'alert' | 'resolvedAt'> & {
  alert: Omit<TriggerAlert, 'timestamp'> & { timestamp: string };
  resolvedAt?: string;
};

/**
 * Manages the alert system, including generation, storage, and settings.
 *
 * This class provides a centralized system for handling alerts related to student
 * behavior patterns. It generates alerts based on tracking data, stores them in
 * local storage, and allows for filtering and management based on user-defined
 * settings.
 */
class AlertSystemManager {
  private readonly STORAGE_KEY = 'sensoryTracker_alerts';
  private readonly SETTINGS_KEY = 'sensoryTracker_alertSettings';
  
  private defaultSettings: AlertSettings = {
    enableHighIntensityAlerts: true,
    highIntensityThreshold: 7,
    enablePatternAlerts: true,
    minimumDataPoints: 5,
    alertFrequencyDays: 1
  };

  /**
   * Generates alerts for a specific student based on their tracking data.
   *
   * This method analyzes the student's emotional, sensory, and tracking entries
   * to identify patterns and high-intensity events that may require attention.
   * It respects the configured alert frequency and settings to avoid overwhelming
   * the user with notifications.
   *
   * @param student - The student for whom to generate alerts.
   * @param emotions - An array of the student's emotion entries.
   * @param sensoryInputs - An array of the student's sensory input entries.
   * @param trackingEntries - An array of the student's general tracking entries.
   * @returns An array of generated trigger alerts.
   */
  generateAlertsForStudent(
    student: Student,
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[],
    trackingEntries: TrackingEntry[]
  ): TriggerAlert[] {
    const settings = this.getSettings();
    
    if (!settings.enableHighIntensityAlerts && !settings.enablePatternAlerts) {
      return [];
    }

    // Check if we should generate alerts (frequency limit)
    const recentAlerts = this.getStudentAlerts(student.id);
    const cutoffTime = Date.now() - (settings.alertFrequencyDays * 24 * 60 * 60 * 1000);
    const recentAlertsInWindow = recentAlerts.filter(a => 
      a.alert.timestamp.getTime() > cutoffTime
    );

    // Don't generate new alerts if we have recent ones (unless high severity)
    const hasRecentHighSeverity = recentAlertsInWindow.some(a => 
      a.alert.severity === 'high' && !a.resolved
    );

    if (recentAlertsInWindow.length > 0 && !hasRecentHighSeverity) {
      return [];
    }

    const alerts = patternAnalysis.generateTriggerAlerts(
      emotions,
      sensoryInputs,
      trackingEntries,
      student.id
    );

    // Filter alerts based on settings
    const filteredAlerts = alerts.filter(alert => {
      if (alert.type === 'concern' && alert.severity === 'high') {
        return settings.enableHighIntensityAlerts;
      }
      return settings.enablePatternAlerts && alert.dataPoints >= settings.minimumDataPoints;
    });

    // Save new alerts
    if (filteredAlerts.length > 0) {
      this.saveAlerts(filteredAlerts);
    }

    return filteredAlerts;
  }

  /**
   * Saves new alerts to the alert history.
   *
   * @param alerts - An array of trigger alerts to be saved.
   */
  saveAlerts(alerts: TriggerAlert[]): void {
    const existingHistory = this.getAllAlerts();
    
    const newHistoryEntries: AlertHistoryEntry[] = alerts.map(alert => ({
      alert,
      viewed: false,
      resolved: false
    }));

    const updatedHistory = [...existingHistory, ...newHistoryEntries];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
  }

  /**
   * Retrieves all alerts from the alert history.
   *
   * @returns An array of all alert history entries.
   */
  getAllAlerts(): AlertHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const alerts = JSON.parse(stored) as StoredAlertHistoryEntry[];
      // Convert timestamp strings back to Date objects
      return alerts.map((entry) => ({
        ...entry,
        alert: {
          ...entry.alert,
          timestamp: new Date(entry.alert.timestamp)
        },
        resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt) : undefined
      }));
    } catch (error) {
      console.error('Error loading alerts:', error);
      return [];
    }
  }

  /**
   * Retrieves all alerts for a specific student.
   *
   * @param studentId - The ID of the student.
   * @returns An array of alert history entries for the specified student.
   */
  getStudentAlerts(studentId: string): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => entry.alert.studentId === studentId);
  }

  /**
   * Retrieves all unviewed alerts.
   *
   * @returns An array of unviewed alert history entries.
   */
  getUnviewedAlerts(): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => !entry.viewed);
  }

  /**
   * Retrieves all unresolved alerts.
   *
   * @returns An array of unresolved alert history entries.
   */
  getUnresolvedAlerts(): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => !entry.resolved);
  }

  /**
   * Marks a specific alert as viewed.
   *
   * @param alertId - The ID of the alert to mark as viewed.
   */
  markAlertAsViewed(alertId: string): void {
    const alerts = this.getAllAlerts();
    const updatedAlerts = alerts.map(entry => 
      entry.alert.id === alertId 
        ? { ...entry, viewed: true }
        : entry
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAlerts));
  }

  /**
   * Resolves a specific alert with notes and the resolver's identity.
   *
   * @param alertId - The ID of the alert to resolve.
   * @param resolvedBy - The identifier of the user who resolved the alert.
   * @param notes - Optional notes explaining the resolution.
   */
  resolveAlert(alertId: string, resolvedBy: string, notes?: string): void {
    const alerts = this.getAllAlerts();
    const updatedAlerts = alerts.map(entry => 
      entry.alert.id === alertId 
        ? { 
            ...entry, 
            resolved: true, 
            resolvedAt: new Date(),
            resolvedBy,
            resolvedNotes: notes
          }
        : entry
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAlerts));
  }

  /**
   * Deletes a specific alert from the history.
   *
   * @param alertId - The ID of the alert to delete.
   */
  deleteAlert(alertId: string): void {
    const alerts = this.getAllAlerts();
    const filteredAlerts = alerts.filter(entry => entry.alert.id !== alertId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredAlerts));
  }

  /**
   * Retrieves the current alert settings.
   *
   * @returns The current alert settings, merged with defaults.
   */
  getSettings(): AlertSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (!stored) return this.defaultSettings;
      
      return { ...this.defaultSettings, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error loading alert settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Updates the alert settings with new values.
   *
   * @param newSettings - A partial object of the settings to update.
   */
  updateSettings(newSettings: Partial<AlertSettings>): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
  }

  /**
   * Provides a summary of the current alert status.
   *
   * This method returns a summary of the alerts, including total counts,
   * unviewed and unresolved counts, and breakdowns by severity and type.
   *
   * @returns An object containing the alert summary.
   */
  getAlertSummary(): {
    total: number;
    unviewed: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  } {
    const allAlerts = this.getAllAlerts();
    const unviewed = this.getUnviewedAlerts();
    const unresolved = this.getUnresolvedAlerts();

    const bySeverity = allAlerts.reduce((acc, entry) => {
      acc[entry.alert.severity] = (acc[entry.alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = allAlerts.reduce((acc, entry) => {
      acc[entry.alert.type] = (acc[entry.alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: allAlerts.length,
      unviewed: unviewed.length,
      unresolved: unresolved.length,
      bySeverity,
      byType
    };
  }

  /**
   * Cleans up old, resolved alerts from the history.
   *
   * @param daysToKeep - The number of days to keep resolved alerts. Defaults to 90.
   */
  cleanupOldAlerts(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const alerts = this.getAllAlerts();
    const filteredAlerts = alerts.filter(entry => 
      entry.alert.timestamp >= cutoffDate || !entry.resolved
    );

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredAlerts));
  }

  /**
   * Exports alerts to a JSON string.
   *
   * @param studentId - Optional student ID to export alerts for a specific student.
   * @returns A JSON string representing the exported alerts.
   */
  exportAlerts(studentId?: string): string {
    const alerts = studentId 
      ? this.getStudentAlerts(studentId)
      : this.getAllAlerts();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      studentId: studentId || 'all',
      alerts: alerts
    }, null, 2);
  }
}

export const alertSystem = new AlertSystemManager();