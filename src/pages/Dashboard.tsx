import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentCard } from "@/components/StudentCard";
import { Student, TrackingEntry } from "@/types/student";
import { Plus, Users, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isToday } from "date-fns";

/**
 * Dashboard component - Main landing page showing student overview and statistics
 * @returns React component displaying students list and tracking statistics
 */
export const Dashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = () => {
      try {
        // Load students from localStorage
        const storedStudents = localStorage.getItem('sensoryTracker_students');
        if (storedStudents) {
          const parsed = JSON.parse(storedStudents);
          setStudents(parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt)
          })));
        }
      } catch (error) {
        // Handle parsing errors gracefully
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * Calculate statistics from all tracking data
   */
  const { todayEntries, totalEntries } = useMemo(() => {
    if (students.length === 0) {
      return { todayEntries: 0, totalEntries: 0 };
    }

    let todayCount = 0;
    let totalCount = 0;

    students.forEach(student => {
      try {
        const trackingData = localStorage.getItem(`sensoryTracker_tracking_${student.id}`);
        if (trackingData) {
          const entries: TrackingEntry[] = JSON.parse(trackingData).map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));

          totalCount += entries.length;
          todayCount += entries.filter(entry => isToday(entry.timestamp)).length;
        }
      } catch (error) {
        // Skip invalid entries
      }
    });

    return { todayEntries: todayCount, totalEntries: totalCount };
  }, [students]);

  const handleViewStudent = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  const handleTrackStudent = (student: Student) => {
    navigate(`/track/${student.id}`);
  };

  const handleAddStudent = () => {
    navigate('/add-student');
  };

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            SensoryTracker Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Supporting students through sensory and emotional awareness
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {isLoading ? "..." : students.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active in your program
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Entries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {isLoading ? "..." : todayEntries}
              </div>
              <p className="text-xs text-muted-foreground">
                Tracking sessions today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {isLoading ? "..." : totalEntries}
              </div>
              <p className="text-xs text-muted-foreground">
                All time data points
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Students Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Students
            </h2>
            <Button 
              onClick={handleAddStudent}
              className="bg-gradient-primary hover:opacity-90 font-dyslexia transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>

          {students.length === 0 ? (
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No students yet
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Start by adding your first student to begin tracking their sensory 
                  and emotional journey.
                </p>
                <Button 
                  onClick={handleAddStudent}
                  className="bg-gradient-primary hover:opacity-90 font-dyslexia"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Student
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onView={handleViewStudent}
                  onTrack={handleTrackStudent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <Card className="bg-gradient-calm border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="text-foreground">💡 Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• Track emotions and sensory responses regularly for better patterns</li>
              <li>• Use the intensity scale to understand the strength of responses</li>
              <li>• Add detailed notes to help identify triggers and successful strategies</li>
              <li>• Review visualizations weekly to spot trends and improvements</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};