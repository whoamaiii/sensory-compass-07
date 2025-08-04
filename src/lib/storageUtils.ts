/**
 * Utility functions for managing localStorage
 */
import { logger } from '@/lib/logger';

export const storageUtils = {
  /**
   * Check available storage space
   */
  getStorageInfo(): { used: number; available: boolean } {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    return {
      used,
      available: used < 5000000 // 5MB approximate limit
    };
  },

  /**
   * Clear old tracking data to free up space
   */
  clearOldTrackingData(daysToKeep: number = 30): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clear old tracking entries
      const entriesKey = 'sensoryTracker_entries';
      const entriesData = localStorage.getItem(entriesKey);
      if (entriesData) {
        const entries = JSON.parse(entriesData);
        const filteredEntries = entries.filter((entry: { timestamp: string | Date }) => {
          const entryDate = new Date(entry.timestamp);
          return entryDate > cutoffDate;
        });
        localStorage.setItem(entriesKey, JSON.stringify(filteredEntries));
      }

      // Clear old alerts
      const alertsKey = 'sensoryTracker_alerts';
      const alertsData = localStorage.getItem(alertsKey);
      if (alertsData) {
        const alerts = JSON.parse(alertsData);
        const filteredAlerts = alerts.filter((alert: { timestamp: string | Date }) => {
          const alertDate = new Date(alert.timestamp);
          return alertDate > cutoffDate;
        });
        localStorage.setItem(alertsKey, JSON.stringify(filteredAlerts));
      }
    } catch (error) {
      logger.error('Error clearing old data:', error);
    }
  },

  /**
   * Compress data before storing
   */
  compressData(data: unknown): string {
    // Remove unnecessary whitespace from JSON
    return JSON.stringify(data);
  },

  /**
   * Safe storage with quota handling
   */
  safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && (
        e.code === 22 || // Quota exceeded
        e.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        // Try to clear old data and retry
        this.clearOldTrackingData();
        
        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          // If still failing, clear all non-essential data
          this.clearNonEssentialData();
          localStorage.setItem(key, value);
        }
      } else {
        throw e;
      }
    }
  },

  /**
   * Clear non-essential data when storage is full
   */
  clearNonEssentialData(): void {
    const essentialKeys = [
      'sensoryTracker_students',
      'sensoryTracker_goals',
      'sensoryTracker_dataVersion'
    ];

    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && 
          key.startsWith('sensoryTracker_') && 
          !essentialKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    }
  }
};
