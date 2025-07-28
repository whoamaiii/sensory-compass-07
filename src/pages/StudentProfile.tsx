import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentProfileSidebar } from "@/components/StudentProfileSidebar";
import { DashboardSection } from "@/components/profile-sections/DashboardSection";
import { AnalyticsSection } from "@/components/profile-sections/AnalyticsSection";
import { ToolsSection } from "@/components/profile-sections/ToolsSection";
import { GoalManager } from "@/components/GoalManager";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { LazyReportBuilder } from "@/components/lazy/LazyReportBuilder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { useOptimizedInsights } from "@/hooks/useOptimizedInsights";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { dataStorage } from "@/lib/dataStorage";
import { exportSystem } from "@/lib/exportSystem";
import { ArrowLeft, Download, Save, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { analyticsManager } from "@/lib/analyticsManager";

export const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { tStudent, tCommon, tAnalytics, formatDate } = useTranslation();
  const [student, setStudent] = useState<Student | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allEmotions, setAllEmotions] = useState<EmotionEntry[]>([]);
  const [allSensoryInputs, setAllSensoryInputs] = useState<SensoryEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeToolSection, setActiveToolSection] = useState('search');
  const [searchResults, setSearchResults] = useState<{
    students: Student[];
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  } | null>(null);
  const { selectedRange, filteredData, handleRangeChange } = useDataFiltering(
    trackingEntries,
    allEmotions,
    allSensoryInputs
  );

  // Use optimized insights hook with caching
  const { getInsights, getCorrelationMatrix, getAnomalies, cacheStats } = useOptimizedInsights(
    filteredData.emotions,
    filteredData.sensoryInputs,
    filteredData.entries
  );

  const [insights, setInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    // Load student data
    const storedStudents = localStorage.getItem('sensoryTracker_students');
    if (storedStudents) {
      const students = JSON.parse(storedStudents);
      const foundStudent = students.find((s: Student) => s.id === studentId);
      if (foundStudent) {
        setStudent({
          ...foundStudent,
          createdAt: new Date(foundStudent.createdAt)
        });
      } else {
        toast.error('Student not found');
        navigate('/');
        return;
      }
    }

    // Load tracking entries
    const storedEntries = localStorage.getItem('sensoryTracker_entries');
    if (storedEntries) {
      const entries: TrackingEntry[] = JSON.parse(storedEntries);
      const studentEntries = entries
        .filter(entry => entry.studentId === studentId)
        .map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          emotions: entry.emotions.map(e => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })),
          sensoryInputs: entry.sensoryInputs.map(s => ({
            ...s,
            timestamp: new Date(s.timestamp)
          }))
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setTrackingEntries(studentEntries);
      
      // Flatten all emotions and sensory inputs
      const emotions = studentEntries.flatMap(entry => entry.emotions);
      const sensoryInputs = studentEntries.flatMap(entry => entry.sensoryInputs);
      
      setAllEmotions(emotions);
      setAllSensoryInputs(sensoryInputs);
    }

    // Load goals
    loadGoals();
  }, [studentId, navigate]);

  // Generate insights when filtered data changes (optimized with caching)
  useEffect(() => {
    const generateInsights = async () => {
      if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0 && filteredData.entries.length === 0) {
        setInsights(null);
        setIsLoadingInsights(false);
        return;
      }
      
      setIsLoadingInsights(true);
      try {
        const newInsights = await getInsights();
        setInsights(newInsights);
      } catch (error) {
        console.error('Error generating insights:', error);
        setInsights(null);
        toast.error("Failed to generate insights");
      } finally {
        setIsLoadingInsights(false);
      }
    };
    
    // Debounce the insights generation to avoid excessive calls
    const timeoutId = setTimeout(() => {
      generateInsights();
      // Only ensure analytics are initialized, don't trigger if no data
      if (studentId && (filteredData.emotions.length > 0 || filteredData.sensoryInputs.length > 0)) {
        analyticsManager.initializeStudentAnalytics(studentId);
        analyticsManager.triggerAnalyticsForStudent(studentId);
      } else if (studentId) {
        // Just initialize without triggering analytics
        analyticsManager.initializeStudentAnalytics(studentId);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filteredData.emotions.length, filteredData.sensoryInputs.length, filteredData.entries.length, getInsights, studentId]);

  const loadGoals = () => {
    if (!studentId) return;
    const allGoals = dataStorage.getGoals();
    const studentGoals = allGoals.filter(goal => goal.studentId === studentId);
    setGoals(studentGoals);
  };

  const handleSearchResults = (results: any) => {
    setSearchResults(results);
  };

  const handleExportData = async (format: 'pdf' | 'csv' | 'json') => {
    if (!student) return;

    try {
      let result;
      const exportData = {
        student,
        trackingEntries: filteredData.entries,
        emotions: filteredData.emotions,
        sensoryInputs: filteredData.sensoryInputs,
        goals,
        insights: await getInsights()
      };

      switch (format) {
        case 'pdf':
          const pdfBlob = await exportSystem.generatePDFReport(student, {
            trackingEntries: filteredData.entries,
            emotions: filteredData.emotions,
            sensoryInputs: filteredData.sensoryInputs,
            goals
          }, {
            format: 'pdf',
            includeFields: ['all'],
            includeCharts: true
          });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const pdfLink = document.createElement('a');
          pdfLink.href = pdfUrl;
          pdfLink.download = student.name.replace(/\s+/g, '_') + '_report_' + new Date().toISOString().split('T')[0] + '.html';
          pdfLink.click();
          result = { success: true };
          break;
        case 'csv':
          const csvContent = exportSystem.generateCSVExport([student], {
            trackingEntries: filteredData.entries,
            emotions: filteredData.emotions,
            sensoryInputs: filteredData.sensoryInputs,
            goals
          }, {
            format: 'csv',
            includeFields: ['all']
          });
          const csvBlob = new Blob([csvContent], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = student.name.replace(/\s+/g, '_') + '_data_' + new Date().toISOString().split('T')[0] + '.csv';
          csvLink.click();
          result = { success: true };
          break;
        case 'json':
          const jsonContent = exportSystem.generateJSONExport([student], {
            trackingEntries: filteredData.entries,
            emotions: filteredData.emotions,
            sensoryInputs: filteredData.sensoryInputs,
            goals
          }, {
            format: 'json',
            includeFields: ['students', 'trackingEntries', 'emotions', 'sensoryInputs', 'goals']
          });
          const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = student.name.replace(/\s+/g, '_') + '_data_' + new Date().toISOString().split('T')[0] + '.json';
          jsonLink.click();
          result = { success: true };
          break;
      }

      if (result.success) {
        toast.success(`Data exported successfully as ${format.toUpperCase()}`);
      } else {
        toast.error(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const handleBackupData = async () => {
    try {
      const backup = exportSystem.createFullBackup([student], {
        trackingEntries: trackingEntries,
        emotions: allEmotions,
        sensoryInputs: allSensoryInputs,
        goals
      });
      const backupBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const backupUrl = URL.createObjectURL(backupBlob);
      const backupLink = document.createElement('a');
      backupLink.href = backupUrl;
      backupLink.download = 'sensory_tracker_backup_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + '.json';
      backupLink.click();
      toast.success('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Backup failed. Please try again.');
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background font-dyslexia flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{String(tCommon('status.loading'))}</h1>
          <div className="animate-pulse">Laster elevdata...</div>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardSection
            student={student}
            trackingEntries={trackingEntries}
            filteredData={filteredData}
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            insights={insights}
          />
        );
      case 'analytics':
        return (
          <AnalyticsSection
            student={student}
            trackingEntries={trackingEntries}
            filteredData={filteredData}
            insights={insights}
          />
        );
      case 'goals':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Mål og målstyring</h2>
              <p className="text-muted-foreground">
                Administrer og følg opp {student.name}s IEP-mål
              </p>
            </div>
            <GoalManager student={student} />
          </div>
        );
      case 'progress':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Fremgang og utvikling</h2>
              <p className="text-muted-foreground">
                Analyser {student.name}s utvikling over tid
              </p>
            </div>
            <ProgressDashboard student={student} goals={goals} />
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Rapporter og eksport</h2>
              <p className="text-muted-foreground">
                Generer rapporter og eksporter data for {student.name}
              </p>
            </div>
            
            {/* Export Controls */}
            <div className="flex flex-wrap gap-3 p-4 bg-gradient-card rounded-lg border-0 shadow-soft">
              <Button
                variant="outline"
                onClick={() => handleExportData('pdf')}
                className="font-dyslexia"
              >
                <FileText className="h-4 w-4 mr-2" />
                Eksporter PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData('csv')}
                className="font-dyslexia"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Eksporter CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData('json')}
                className="font-dyslexia"
              >
                <Download className="h-4 w-4 mr-2" />
                Eksporter JSON
              </Button>
              <Button
                variant="outline"
                onClick={handleBackupData}
                className="font-dyslexia"
              >
                <Save className="h-4 w-4 mr-2" />
                Opprett backup
              </Button>
            </div>

            <ErrorBoundary>
              <LazyReportBuilder 
                student={student}
                goals={goals}
                trackingEntries={filteredData.entries}
                emotions={filteredData.emotions}
                sensoryInputs={filteredData.sensoryInputs}
              />
            </ErrorBoundary>
          </div>
        );
      case 'search':
      case 'templates':
      case 'compare':
        return (
          <ToolsSection
            student={student}
            trackingEntries={trackingEntries}
            emotions={allEmotions}
            sensoryInputs={allSensoryInputs}
            goals={goals}
            activeToolSection={activeSection}
            onToolSectionChange={setActiveSection}
            onSearchResults={handleSearchResults}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background font-dyslexia flex">
        <StudentProfileSidebar
          student={student}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="font-dyslexia"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {String(tCommon('buttons.back'))}
                </Button>
              </div>
              <LanguageSettings />
            </div>
          </header>

          {/* Main Content */}
          <div className="p-6">
            <ErrorBoundary>
              {renderMainContent()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};