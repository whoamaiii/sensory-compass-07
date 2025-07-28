import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InteractiveDataVisualization } from "@/components/InteractiveDataVisualization";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { QuickEntryTemplates } from "@/components/QuickEntryTemplates";
import { DateRangeSelector, TimeRange } from "@/components/DateRangeSelector";
import { PeriodComparison } from "@/components/PeriodComparison";
import { GoalManager } from "@/components/GoalManager";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { ReportBuilder } from "@/components/ReportBuilder";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry, Goal } from "@/types/student";
import { dataStorage } from "@/lib/dataStorage";
import { enhancedPatternAnalysis } from "@/lib/enhancedPatternAnalysis";
import { exportSystem } from "@/lib/exportSystem";
import { ArrowLeft, TrendingUp, Calendar, FileText, Plus, Filter, Crosshair, Zap, Download, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allEmotions, setAllEmotions] = useState<EmotionEntry[]>([]);
  const [allSensoryInputs, setAllSensoryInputs] = useState<SensoryEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    students: Student[];
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'progress' | 'reports'>('overview');
  const [insights, setInsights] = useState<any[]>([]);

  const { selectedRange, filteredData, handleRangeChange } = useDataFiltering(
    trackingEntries,
    allEmotions,
    allSensoryInputs
  );

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

  // Generate insights when filtered data changes
  useEffect(() => {
    const generateInsights = async () => {
      if (filteredData.emotions.length === 0 && filteredData.sensoryInputs.length === 0 && filteredData.entries.length === 0) {
        setInsights([]);
        return;
      }
      
      try {
        const newInsights = await getInsights(filteredData.emotions, filteredData.sensoryInputs, filteredData.entries);
        setInsights(newInsights);
      } catch (error) {
        console.error('Error generating insights:', error);
        setInsights([]);
      }
    };
    generateInsights();
  }, [filteredData.emotions.length, filteredData.sensoryInputs.length, filteredData.entries.length]);

  const loadGoals = () => {
    if (!studentId) return;
    const allGoals = dataStorage.getGoals();
    const studentGoals = allGoals.filter(goal => goal.studentId === studentId);
    setGoals(studentGoals);
  };

  const handleSearchResults = (results: {
    students: Student[];
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
    goals: Goal[];
  }) => {
    setSearchResults(results);
  };

  const handleQuickTemplateApply = (emotions: Partial<EmotionEntry>[], sensoryInputs: Partial<SensoryEntry>[]) => {
    // Navigate to tracking page with pre-filled data
    localStorage.setItem('quickTemplate_emotions', JSON.stringify(emotions));
    localStorage.setItem('quickTemplate_sensoryInputs', JSON.stringify(sensoryInputs));
    navigate(`/track/${student.id}?template=true`);
  };

  const getInsights = async (emotions: EmotionEntry[], sensoryInputs: SensoryEntry[], trackingEntries: TrackingEntry[]) => {
    if (emotions.length === 0 && sensoryInputs.length === 0) {
      return [];
    }

    try {
      // Generate enhanced insights
      const predictiveInsights = enhancedPatternAnalysis.generatePredictiveInsights(
        emotions,
        sensoryInputs,
        trackingEntries,
        goals
      );

      const insights = [];

      // Add predictive insights
      for (const insight of predictiveInsights) {
        insights.push({
          type: insight.type,
          text: insight.description,
          confidence: insight.confidence > 0.8 ? 'high' : insight.confidence > 0.5 ? 'moderate' : 'low',
          recommendations: insight.recommendations
        });
      }

      // Basic emotion insights
      if (emotions.length > 0) {
        const emotionCounts = emotions.reduce((acc, emotion) => {
          acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const mostCommon = Object.entries(emotionCounts)
          .sort(([,a], [,b]) => b - a)[0];
        
        insights.push({
          type: 'emotion',
          text: `Most frequently observed emotion: ${mostCommon[0]} (${mostCommon[1]} times)`,
          confidence: 'high',
          recommendations: []
        });

        const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
        insights.push({
          type: 'emotion',
          text: `Average emotion intensity: ${avgIntensity.toFixed(1)}/5`,
          confidence: 'high',
          recommendations: []
        });
      }

      // Sensory insights
      if (sensoryInputs.length > 0) {
        const seekingCount = sensoryInputs.filter(s => s.response === 'seeking').length;
        const avoidingCount = sensoryInputs.filter(s => s.response === 'avoiding').length;
        
        if (seekingCount > avoidingCount) {
          insights.push({
            type: 'sensory',
            text: 'Tends to seek sensory input more than avoid it',
            confidence: 'moderate',
            recommendations: ['Provide structured sensory breaks', 'Use sensory tools as rewards']
          });
        } else if (avoidingCount > seekingCount) {
          insights.push({
            type: 'sensory',
            text: 'Tends to avoid sensory input more than seek it',
            confidence: 'moderate',
            recommendations: ['Create quiet spaces', 'Gradual exposure to sensory activities']
          });
        }

        const sensoryTypes = sensoryInputs.reduce((acc, sensory) => {
          acc[sensory.sensoryType] = (acc[sensory.sensoryType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const mostCommonSensory = Object.entries(sensoryTypes)
          .sort(([,a], [,b]) => b - a)[0];
        
        insights.push({
          type: 'sensory',
          text: `Most tracked sensory type: ${mostCommonSensory[0]} (${mostCommonSensory[1]} entries)`,
          confidence: 'high',
          recommendations: []
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
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
        insights: await getInsights(filteredData.emotions, filteredData.sensoryInputs, filteredData.entries)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading student profile...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-4 font-dyslexia"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {student.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {student.grade && (
                    <Badge variant="secondary">Grade {student.grade}</Badge>
                  )}
                  <span className="text-muted-foreground">
                    Added {student.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="font-dyslexia"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedSearch ? "Hide Search" : "Advanced Search"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                className="font-dyslexia"
              >
                <Zap className="h-4 w-4 mr-2" />
                {showQuickTemplates ? "Hide Templates" : "Quick Templates"}
              </Button>
              <Button
                onClick={() => navigate(`/track/${student.id}`)}
                className="bg-gradient-primary hover:opacity-90 font-dyslexia"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Search */}
        {showAdvancedSearch && (
          <div className="mb-8">
            <AdvancedSearch
              students={[student]}
              trackingEntries={trackingEntries}
              emotions={allEmotions}
              sensoryInputs={allSensoryInputs}
              goals={goals}
              onResultsChange={handleSearchResults}
            />
          </div>
        )}

        {/* Quick Entry Templates */}
        {showQuickTemplates && (
          <div className="mb-8">
            <QuickEntryTemplates
              studentId={student.id}
              onApplyTemplate={handleQuickTemplateApply}
            />
          </div>
        )}

        {/* Time Range Selector */}
        <Card className="mb-8 bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Data Analysis Period
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="font-dyslexia"
              >
                {showComparison ? "Hide" : "Show"} Comparison
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DateRangeSelector
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              className="mb-4"
            />
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions in Period</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{filteredData.entries.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {trackingEntries.length} total sessions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emotions Tracked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{filteredData.emotions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {allEmotions.length} total emotions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sensory Inputs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{filteredData.sensoryInputs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {allSensoryInputs.length} total sensory inputs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Period Comparison */}
        {showComparison && (
          <div className="mb-8">
            <PeriodComparison
              emotions={allEmotions}
              sensoryInputs={allSensoryInputs}
              currentRange={selectedRange}
            />
          </div>
        )}

        {/* Student Notes */}
        {student.notes && (
          <Card className="mb-8 bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Student Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{student.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <Card className="mb-8 bg-gradient-calm border-0 shadow-soft">
            <CardHeader>
              <CardTitle>AI Insights & Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={insight.confidence === 'high' ? 'default' : insight.confidence === 'moderate' ? 'secondary' : 'outline'}>
                        {insight.confidence} confidence
                      </Badge>
                      <Badge variant="outline">{insight.type}</Badge>
                    </div>
                    <p className="text-foreground mb-2">{insight.text}</p>
                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Recommendations:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {insight.recommendations.map((rec: string, recIndex: number) => (
                            <li key={recIndex}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'goals', label: 'IEP Goals', icon: Crosshair },
              { id: 'progress', label: 'Progress', icon: Calendar },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-dyslexia transition-all ${
                  activeTab === tab.id 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Interactive Data Visualization */}
            <div className="mb-8">
              <InteractiveDataVisualization
                emotions={filteredData.emotions}
                sensoryInputs={filteredData.sensoryInputs}
                trackingEntries={filteredData.entries}
                studentName={student.name}
              />
            </div>

            {/* Analytics Dashboard */}
            <div className="mb-8">
              <AnalyticsDashboard
                student={student}
                trackingEntries={filteredData.entries}
                emotions={filteredData.emotions}
                sensoryInputs={filteredData.sensoryInputs}
              />
            </div>
          </>
        )}

        {activeTab === 'goals' && (
          <div className="mb-8">
            <GoalManager student={student} onGoalUpdate={loadGoals} />
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="mb-8">
            <ProgressDashboard student={student} goals={goals} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="mb-8">
            {/* Export Controls */}
            <Card className="mb-6 bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleExportData('pdf')}
                    className="font-dyslexia"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportData('csv')}
                    className="font-dyslexia"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportData('json')}
                    className="font-dyslexia"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBackupData}
                    className="font-dyslexia"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ReportBuilder 
              student={student}
              goals={goals}
              trackingEntries={filteredData.entries}
              emotions={filteredData.emotions}
              sensoryInputs={filteredData.sensoryInputs}
            />
          </div>
        )}

        {/* Recent Sessions - Only show on overview tab */}
        {activeTab === 'overview' && filteredData.entries.length > 0 && (
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Sessions in Selected Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.entries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">
                        {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()}
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {entry.emotions.length} emotions
                        </Badge>
                        <Badge variant="outline">
                          {entry.sensoryInputs.length} sensory
                        </Badge>
                      </div>
                    </div>
                    {entry.generalNotes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.generalNotes}
                      </p>
                    )}
                  </div>
                ))}
                {filteredData.entries.length > 10 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing 10 of {filteredData.entries.length} sessions in this period
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};