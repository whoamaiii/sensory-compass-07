import { useState, useEffect, useCallback } from "react";
import { analyticsManager } from "@/lib/analyticsManager";

interface AnalyticsStatus {
  studentId: string;
  studentName: string;
  isInitialized: boolean;
  lastAnalyzed: Date | null;
  healthScore: number;
  hasMinimumData: boolean;
}

interface UseAnalyticsStatusReturn {
  analyticsStatus: AnalyticsStatus[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getStudentStatus: (studentId: string) => AnalyticsStatus | undefined;
  initializeStudent: (studentId: string) => void;
  triggerAnalytics: (studentId?: string) => Promise<void>;
}

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
      console.error('Error loading analytics status:', error);
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
      console.error('Error triggering analytics:', error);
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