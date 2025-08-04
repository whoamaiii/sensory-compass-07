import { useState, useEffect, useCallback } from "react";
import { analyticsManager } from "@/lib/analyticsManager";
import { logger } from "@/lib/logger";

interface AnalyticsStatus {
  studentId: string;
  studentName: string;
  isInitialized: boolean;
  lastAnalyzed: Date | null;
  healthScore: number;
  hasMinimumData: boolean;
}

/**
 * An interface that defines the return values of the `useAnalyticsStatus` hook.
 *
 * This interface documents the structure of the data and functions provided
 * by the `useAnalyticsStatus` hook, which can be used to manage the analytics
 * status of students.
 *
 * @property {AnalyticsStatus[]} analyticsStatus - An array of analytics status objects.
 * @property {boolean} isLoading - A boolean indicating whether the analytics status is currently being loaded.
 * @property {() => Promise<void>} refresh - A function to manually refresh the analytics status.
 * @property {(studentId: string) => AnalyticsStatus | undefined} getStudentStatus - A function to get the analytics status for a specific student.
 * @property {(studentId: string) => void} initializeStudent - A function to initialize analytics for a specific student.
 * @property {(studentId?: string) => Promise<void>} triggerAnalytics - Triggers a fresh analytics update for a specific student or all students.
 */
interface UseAnalyticsStatusReturn {
  analyticsStatus: AnalyticsStatus[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getStudentStatus: (studentId: string) => AnalyticsStatus | undefined;
  initializeStudent: (studentId: string) => void;
  triggerAnalytics: (studentId?: string) => Promise<void>;
}

/**
 * A custom hook that provides a convenient way to access and manage the
 * analytics status of students.
 *
 * This hook encapsulates the logic for loading, refreshing, and interacting
 * with the `analyticsManager`. It can be used to get the analytics status for
 * a single student or for all students, and it provides functions for
 * initializing students and triggering analytics updates.
 *
 * @param studentId - An optional student ID to filter the analytics status for.
 * @returns An object containing the analytics status, loading state, and
 * functions for interacting with the analytics manager.
 */
export const useAnalyticsStatus = (studentId?: string): UseAnalyticsStatusReturn => {
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const status = analyticsManager.getAnalyticsStatus();
      if (studentId) {
        setAnalyticsStatus(status.filter(s => s.studentId === studentId));
      } else {
        setAnalyticsStatus(status);
      }
    } catch (error) {
      logger.error('Error loading analytics status:', error);
      setAnalyticsStatus([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadStatus();
  }, [loadStatus]);

  const getStudentStatus = useCallback((targetStudentId: string) => {
    return analyticsStatus.find(status => status.studentId === targetStudentId);
  }, [analyticsStatus]);

  const initializeStudent = useCallback((targetStudentId: string) => {
    analyticsManager.initializeStudentAnalytics(targetStudentId);
    loadStatus();
  }, [loadStatus]);

  const triggerAnalytics = useCallback(async (targetStudentId?: string) => {
    try {
      if (targetStudentId) {
        await analyticsManager.triggerAnalyticsForStudent(targetStudentId);
      } else {
        await analyticsManager.triggerAnalyticsForAllStudents();
      }
      await loadStatus();
    } catch (error) {
      logger.error('Error triggering analytics:', error);
    }
  }, [loadStatus]);

  useEffect(() => {
    loadStatus();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadStatus, 120000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  return {
    analyticsStatus,
    isLoading,
    refresh,
    getStudentStatus,
    initializeStudent,
    triggerAnalytics,
  };
};