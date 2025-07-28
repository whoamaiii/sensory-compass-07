import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataVisualization } from "@/components/DataVisualization";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { DateRangeSelector, TimeRange } from "@/components/DateRangeSelector";
import { PeriodComparison } from "@/components/PeriodComparison";
import { useDataFiltering } from "@/hooks/useDataFiltering";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { ArrowLeft, TrendingUp, Calendar, FileText, Plus, Filter } from "lucide-react";
import { toast } from "sonner";

export const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allEmotions, setAllEmotions] = useState<EmotionEntry[]>([]);
  const [allSensoryInputs, setAllSensoryInputs] = useState<SensoryEntry[]>([]);
  const [showComparison, setShowComparison] = useState(false);

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
  }, [studentId, navigate]);

  const getInsights = (emotions: EmotionEntry[], sensoryInputs: SensoryEntry[]) => {
    if (emotions.length === 0 && sensoryInputs.length === 0) {
      return [];
    }

    const insights = [];

    // Emotion insights
    if (emotions.length > 0) {
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommon = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      insights.push(`Most frequently observed emotion: ${mostCommon[0]} (${mostCommon[1]} times)`);

      // Average intensity
      const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
      insights.push(`Average emotion intensity: ${avgIntensity.toFixed(1)}/5`);
    }

    // Sensory insights
    if (sensoryInputs.length > 0) {
      const seekingCount = sensoryInputs.filter(s => s.response === 'seeking').length;
      const avoidingCount = sensoryInputs.filter(s => s.response === 'avoiding').length;
      
      if (seekingCount > avoidingCount) {
        insights.push('Tends to seek sensory input more than avoid it');
      } else if (avoidingCount > seekingCount) {
        insights.push('Tends to avoid sensory input more than seek it');
      }

      const sensoryTypes = sensoryInputs.reduce((acc, sensory) => {
        acc[sensory.sensoryType] = (acc[sensory.sensoryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonSensory = Object.entries(sensoryTypes)
        .sort(([,a], [,b]) => b - a)[0];
      
      insights.push(`Most tracked sensory type: ${mostCommonSensory[0]} (${mostCommonSensory[1]} entries)`);
    }

    return insights;
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

  const insights = getInsights(filteredData.emotions, filteredData.sensoryInputs);

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
            
            <Button
              onClick={() => navigate(`/track/${student.id}`)}
              className="bg-gradient-primary hover:opacity-90 font-dyslexia"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

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
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Data Visualization */}
        <div className="mb-8">
          <DataVisualization
            emotions={filteredData.emotions}
            sensoryInputs={filteredData.sensoryInputs}
            studentName={student.name}
            showTimeFilter={true}
            selectedRange={selectedRange.label}
          />
        </div>

        {/* Recent Sessions */}
        {filteredData.entries.length > 0 && (
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