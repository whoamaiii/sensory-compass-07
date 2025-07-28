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

export interface AlertHistoryEntry {
  alert: TriggerAlert;
  viewed: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedNotes?: string;
}

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

  getAllAlerts(): AlertHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const alerts = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return alerts.map((entry: any) => ({
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

  getStudentAlerts(studentId: string): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => entry.alert.studentId === studentId);
  }

  getUnviewedAlerts(): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => !entry.viewed);
  }

  getUnresolvedAlerts(): AlertHistoryEntry[] {
    return this.getAllAlerts().filter(entry => !entry.resolved);
  }

  markAlertAsViewed(alertId: string): void {
    const alerts = this.getAllAlerts();
    const updatedAlerts = alerts.map(entry => 
      entry.alert.id === alertId 
        ? { ...entry, viewed: true }
        : entry
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAlerts));
  }

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

  deleteAlert(alertId: string): void {
    const alerts = this.getAllAlerts();
    const filteredAlerts = alerts.filter(entry => entry.alert.id !== alertId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredAlerts));
  }

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

  updateSettings(newSettings: Partial<AlertSettings>): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
  }

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

  cleanupOldAlerts(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const alerts = this.getAllAlerts();
    const filteredAlerts = alerts.filter(entry => 
      entry.alert.timestamp >= cutoffDate || !entry.resolved
    );

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredAlerts));
  }

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