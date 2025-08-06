
import React, { useState, useEffect, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentProfileSidebar } from "@/components/StudentProfileSidebar";
import { DashboardSection } from "@/components/profile-sections/DashboardSection";
import { AnalyticsSection } from "@/components/profile-sections/AnalyticsSection";
import { ToolsSection } from "@/components/profile-sections/ToolsSection";
import { TestingToolsSection } from "@/components/TestingToolsSection";
import { GoalManager } from "@/components/GoalManager";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { LazyReportBuilder } from "@/components/lazy/LazyReportBuilder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { useOptimizedInsights } from "@/hooks/useOptimizedInsights";
import { useStudentData } from "@/hooks/useStudentData";
import { Student, Goal, Insights } from "@/types/student";
import { exportSystem } from "@/lib/exportSystem";
import { downloadBlob } from "@/lib/utils";
import { ArrowLeft, Download, Save, FileText, Calendar, Loader } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { MockDataLoader } from "@/components/MockDataLoader";
import { analyticsManager } from "@/lib/analyticsManager";
import { logger } from "@/lib/logger";

/**
 * Memoized versions of section components to prevent unnecessary re-renders.
 * These components will only re-render if their specific props change.
 */
const MemoizedDashboardSection = memo(DashboardSection);
const MemoizedAnalyticsSection = memo(AnalyticsSection);
const MemoizedToolsSection = memo(ToolsSection);
const MemoizedGoalManager = memo(GoalManager);
const MemoizedProgressDashboard = memo(ProgressDashboard);
const MemoizedLazyReportBuilder = memo(LazyReportBuilder);
const MemoizedTestingToolsSection = memo(TestingToolsSection);

/**
 * @component StudentProfile
 * 
 * This is a top-level component that serves as the main profile page for a single student.
 * It orchestrates data fetching, state management, and rendering for all sub-sections
 * related to a student, such as their dashboard, analytics, goals, and reports.
 * 
 * Key Responsibilities:
 * - Fetches all necessary data for a given student ID using the `useStudentData` hook.
 * - Manages the active view (e.g., dashboard, analytics) through the `activeSection` state.
 * - Handles data filtering based on date ranges.
 * - Generates AI-powered insights asynchronously.
 * - Provides functionality for data export and backup.
 * - Renders the appropriate section component based on the user's navigation.
 */
const StudentProfile = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { tCommon } = useTranslation();

  // DIAGNOSTIC: Mount parameters
  if (import.meta.env.DEV) {
    logger.debug('[DIAGNOSTIC] StudentProfile mount', { studentId });
  }

  const {
    student,
    trackingEntries,
    allEmotions,
    allSensoryInputs,
    goals,
    isLoading: isLoadingStudent,
    error: studentError,
    reloadGoals,
    reloadData,
  } = useStudentData(studentId);

  // DIAGNOSTIC: After data hook
  if (import.meta.env.DEV) {
    try {
      logger.debug('[DIAGNOSTIC] useStudentData snapshot', {
        hasStudent: !!student,
        studentId,
        studentName: student?.name,
        trackingEntriesCount: trackingEntries?.length ?? 0,
        emotionsCount: allEmotions?.length ?? 0,
        sensoryInputsCount: allSensoryInputs?.length ?? 0,
        goalsCount: goals?.length ?? 0,
        isLoadingStudent,
        studentError
      });
    } catch (e) {
      logger.debug('[DIAGNOSTIC] useStudentData snapshot logging failed', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // State to control which profile section is currently visible.
  const [activeSection, setActiveSection] = useState('dashboard');

  // Hook for filtering tracking data by a selected date range.
  const { selectedRange, filteredData, handleRangeChange } = useDataFiltering(
    trackingEntries,
    allEmotions,
    allSensoryInputs
  );

  const { getInsights } = useOptimizedInsights(
    filteredData.emotions,
    filteredData.sensoryInputs,
    filteredData.entries
  );

  // State for storing and managing the loading of AI-generated insights.
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Effect to handle errors from the data fetching hook.
  useEffect(() => {
    if (studentError) {
      toast.error(studentError);
      navigate('/');
    }
  }, [studentError, navigate]);

  /**
   * Effect for asynchronously generating student insights.
   * 
   * This effect runs whenever the filtered data or student context changes.
   * It uses an `AbortController` to prevent race conditions and to cancel
   * pending requests if the component unmounts or if dependencies change,
   * which is a robust pattern for handling async operations in useEffect.
   */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const generateInsights = async () => {
      if (
        !student ||
        (filteredData.emotions.length === 0 &&
          filteredData.sensoryInputs.length === 0 &&
          filteredData.entries.length === 0)
      ) {
        setInsights(null);
        return;
      }

      setIsLoadingInsights(true);
      try {
        const newInsights = await getInsights();
        if (!signal.aborted) {
          setInsights(newInsights as Insights);
        }
      } catch (error) {
        if (!signal.aborted) {
          logger.error('Error generating insights', { error });
          setInsights(null);
          toast.error('Failed to generate insights');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingInsights(false);
        }
      }
    };

    generateInsights();

    // Analytics triggers with diagnostics and isolation (fail-soft)
    try {
      if (student) {
        if (import.meta.env.DEV) {
          logger.debug('[DIAGNOSTIC] analyticsManager.triggerAnalyticsForStudent start', {
            studentId: student.id,
            name: student.name,
          });
        }
        // Do not block UI if analytics fails
        Promise.resolve(analyticsManager.triggerAnalyticsForStudent(student))
          .then(() => {
            if (import.meta.env.DEV) {
              logger.debug('[DIAGNOSTIC] analyticsManager.triggerAnalyticsForStudent done');
            }
          })
          .catch((err) => {
            logger.error('[SAFE] analyticsManager.triggerAnalyticsForStudent failed', { error: err, studentId: student.id });
          });
      } else if (studentId) {
        if (import.meta.env.DEV) {
          logger.debug('[DIAGNOSTIC] analyticsManager.initializeStudentAnalytics start', { studentId });
        }
        try {
          analyticsManager.initializeStudentAnalytics(studentId);
          if (import.meta.env.DEV) {
            logger.debug('[DIAGNOSTIC] analyticsManager.initializeStudentAnalytics done');
          }
        } catch (err) {
          logger.error('[SAFE] analyticsManager.initializeStudentAnalytics failed', { error: err, studentId });
        }
      }
    } catch (err) {
      // Extra safety net; never rethrow from analytics side-effect
      logger.error('[SAFE] analyticsManager outer try/catch caught error', { error: err });
    }

    return () => {
      // On cleanup, abort any pending operations to prevent memory leaks and state updates on unmounted components.
      if (import.meta.env.DEV) {
        logger.debug('[DIAGNOSTIC] StudentProfile cleanup: aborting controller and clearing timers if any');
      }
      controller.abort();
    };
  }, [filteredData, getInsights, student, studentId]);

  /**
   * Handles the export of student data in various formats (PDF, CSV, JSON).
   * Wrapped in `useCallback` to ensure the function reference is stable across re-renders,
   * preventing unnecessary re-renders of child components that might receive it as a prop.
   */
  const handleExportData = useCallback(async (format: 'pdf' | 'csv' | 'json') => {
    if (!student) return;

    try {
      const baseFilename = `${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      let blob: Blob;
      let filename: string;

      const exportOptions = {
        trackingEntries: filteredData.entries,
        emotions: filteredData.emotions,
        sensoryInputs: filteredData.sensoryInputs,
        goals,
      };

      switch (format) {
        case 'pdf': {
          blob = await exportSystem.generatePDFReport(student, exportOptions, {
            format: 'pdf',
            includeFields: ['all'],
            includeCharts: true,
          });
          filename = `${baseFilename}_report.pdf`;
          break;
        }
        case 'csv': {
          const csvContent = exportSystem.generateCSVExport([student], exportOptions, {
            format: 'csv',
            includeFields: ['all'],
          });
          blob = new Blob([csvContent], { type: 'text/csv' });
          filename = `${baseFilename}_data.csv`;
          break;
        }
        case 'json': {
          const jsonContent = exportSystem.generateJSONExport([student], exportOptions, {
            format: 'json',
            includeFields: ['students', 'trackingEntries', 'emotions', 'sensoryInputs', 'goals'],
          });
          blob = new Blob([jsonContent], { type: 'application/json' });
          filename = `${baseFilename}_data.json`;
          break;
        }
      }
      
      downloadBlob(blob, filename);
      toast.success(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error: unknown) {
      logger.error('Export error', { error });
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      toast.error(`Export failed: ${errorMessage}`);
    }
  }, [student, filteredData, goals]);
  
  /**
   * Creates and triggers the download of a full backup of the student's data.
   * Wrapped in `useCallback` for performance optimization.
   */
  const handleBackupData = useCallback(async () => {
    if (!student) return;
    try {
      const backup = exportSystem.createFullBackup([student], {
        trackingEntries,
        emotions: allEmotions,
        sensoryInputs: allSensoryInputs,
        goals,
      });
      const backupBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const filename = `sensory_tracker_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      downloadBlob(backupBlob, filename);
      toast.success('Backup created successfully');
    } catch (error) {
      logger.error('Backup error', { error });
      toast.error('Backup failed. Please try again.');
    }
  }, [student, trackingEntries, allEmotions, allSensoryInputs, goals]);

  /**
   * Callback executed after mock data has been loaded.
   * This function calls `reloadData` from the `useStudentData` hook to refresh the UI
   * without requiring a full page reload, providing a smoother user experience.
   */
  const handleDataLoaded = useCallback(() => {
    toast.success("Mock data loaded successfully!");
    if (reloadData) {
      reloadData();
    }
  }, [reloadData]);

  if (isLoadingStudent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader className="h-5 w-5 animate-spin" />
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <p className="text-destructive">Student not found.</p>
        </div>
      </div>
    );
  }

  if (isLoadingStudent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader className="h-5 w-5 animate-spin" />
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <p className="text-destructive">Student not found.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background font-dyslexia flex">
        <StudentProfileSidebar
          student={student}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 overflow-auto">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} aria-label="Go back to dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {String(tCommon('buttons.back'))}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center justify-center group" aria-label="Open mock data loader">
                      <FileText className="h-4 w-4 mr-2 transition-transform group-hover:rotate-12" />
                      Load Mock Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Mock Data for Testing & Analysis</DialogTitle>
                    </DialogHeader>
                    {/* The MockDataLoader component now uses events to trigger a data refresh, 
                        so it no longer needs a callback prop. */}
                    <MockDataLoader />
                  </DialogContent>
                </Dialog>
                <LanguageSettings />
              </div>
            </div>
          </header>
          <div className="p-6">
            <ErrorBoundary>
              {/* 
                The main content is rendered conditionally based on the `activeSection` state.
                This declarative approach is more efficient and readable than the previous `useMemo` block.
                Each section is a memoized component, ensuring it only re-renders when its specific props change.
              */}
              {activeSection === 'dashboard' && (
                <MemoizedDashboardSection
                  student={student}
                  trackingEntries={trackingEntries}
                  filteredData={filteredData}
                  selectedRange={selectedRange}
                  onRangeChange={handleRangeChange}
                  insights={insights}
                  isLoadingInsights={isLoadingInsights}
                />
              )}
              {activeSection === 'analytics' && (
                <ErrorBoundary showToast={true}>
                  <MemoizedAnalyticsSection
                    student={student}
                    trackingEntries={trackingEntries ?? []}
                    filteredData={filteredData}
                    insights={insights}
                    isLoadingInsights={isLoadingInsights}
                  />
                </ErrorBoundary>
              )}
              {activeSection === 'goals' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Mål og målstyring</h2>
                    <p className="text-muted-foreground">
                      Administrer og følg opp {student.name}s IEP-mål
                    </p>
                  </div>
                  <MemoizedGoalManager student={student} onGoalUpdate={reloadGoals} />
                </div>
              )}
              {activeSection === 'progress' && (
                 <div className="space-y-6">
                   <div>
                     <h2 className="text-2xl font-bold">Fremgang og utvikling</h2>
                     <p className="text-muted-foreground">
                       Analyser {student.name}s utvikling over tid
                     </p>
                   </div>
                   <MemoizedProgressDashboard student={student} goals={goals} />
                 </div>
              )}
              {activeSection === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Rapporter og eksport</h2>
                    <p className="text-muted-foreground">
                      Generer rapporter og eksporter data for {student.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 p-4 bg-gradient-card rounded-lg border-0 shadow-soft">
                    <Button variant="outline" onClick={() => handleExportData('pdf')}>
                      <FileText className="h-4 w-4 mr-2" />Eksporter PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExportData('csv')}>
                      <Calendar className="h-4 w-4 mr-2" />Eksporter CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleExportData('json')}>
                      <Download className="h-4 w-4 mr-2" />Eksporter JSON
                    </Button>
                    <Button variant="outline" onClick={handleBackupData}>
                      <Save className="h-4 w-4 mr-2" />Opprett backup
                    </Button>
                  </div>
                  <ErrorBoundary>
                    <MemoizedLazyReportBuilder
                      student={student}
                      goals={goals}
                      trackingEntries={filteredData.entries}
                      emotions={filteredData.emotions}
                      sensoryInputs={filteredData.sensoryInputs}
                    />
                  </ErrorBoundary>
                </div>
              )}
              {(activeSection === 'search' || activeSection === 'templates' || activeSection === 'compare') && (
                 <MemoizedToolsSection
                    student={student}
                    trackingEntries={trackingEntries}
                    emotions={allEmotions}
                    sensoryInputs={allSensoryInputs}
                    goals={goals}
                    activeToolSection={activeSection}
                    onToolSectionChange={setActiveSection}
                    onSearchResults={() => {}} // This should be properly handled if search is a feature
                  />
              )}
              {activeSection === 'enhanced-tracking' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold">Enhanced Tracking Tools</h2>
                      <p className="text-muted-foreground">
                        Advanced data collection and smart entry tools for {student.name}
                      </p>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Enhanced tracking tools coming soon</p>
                    </div>
                  </div>
              )}
              {activeSection === 'testing' && <MemoizedTestingToolsSection />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export { StudentProfile };
