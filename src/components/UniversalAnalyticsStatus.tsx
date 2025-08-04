import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { universalAnalyticsInitializer } from '@/lib/universalAnalyticsInitializer';
import { analyticsManager } from '@/lib/analyticsManager';
import { logger } from '@/lib/logger';

interface AnalyticsStatusData {
  isInitialized: boolean;
  studentsWithAnalytics: number;
  totalStudents: number;
  studentStatuses: Array<{
    studentId: string;
    studentName: string;
    isInitialized: boolean;
    hasMinimumData: boolean;
    healthScore: number;
  }>;
}

export const UniversalAnalyticsStatus = () => {
  const [status, setStatus] = useState<AnalyticsStatusData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Ensure universal initialization on mount to cover all students, including new and mock
  useEffect(() => {
    // Lazy-load to avoid import cycles
    import('@/lib/analyticsManager')
      .then(mod => mod.ensureUniversalAnalyticsInitialization?.())
      .catch(() => {/* noop */});
  }, []);

  const loadStatus = async () => {
    try {
      const initStatus = universalAnalyticsInitializer.getInitializationStatus();
      const analyticsStatuses = analyticsManager.getAnalyticsStatus();
      
      setStatus({
        isInitialized: initStatus.isInitialized,
        studentsWithAnalytics: initStatus.studentsWithAnalytics,
        totalStudents: initStatus.totalStudents,
        studentStatuses: analyticsStatuses
      });
    } catch (error) {
      logger.error('Error loading analytics status', { error });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await universalAnalyticsInitializer.forceReinitialization();
      await loadStatus();
    } catch (error) {
      logger.error('Error refreshing analytics', { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <Card className="bg-gradient-card border-0 shadow-medium">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading analytics status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allStudentsInitialized = status.studentsWithAnalytics === status.totalStudents && status.totalStudents > 0;
  const hasStudentsWithData = status.studentStatuses.some(s => s.hasMinimumData);

  return (
    <Card className="bg-gradient-card border-0 shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Universal Analytics Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            {allStudentsInitialized ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">
              System Status
            </span>
          </div>
          <Badge variant={allStudentsInitialized ? "default" : "secondary"}>
            {allStudentsInitialized ? 'Fully Initialized' : 'Initializing'}
          </Badge>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {status.studentsWithAnalytics}
            </div>
            <div className="text-sm text-muted-foreground">
              Students with Analytics
            </div>
          </div>
          
          <div className="text-center p-3 bg-secondary/5 rounded-lg">
            <div className="text-2xl font-bold text-secondary">
              {status.studentStatuses.filter(s => s.hasMinimumData).length}
            </div>
            <div className="text-sm text-muted-foreground">
              Students with Data
            </div>
          </div>
        </div>

        {/* Student Details */}
        {status.studentStatuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Student Details:</h4>
            {status.studentStatuses.map(student => (
              <div key={student.studentId} className="flex items-center justify-between p-2 bg-background/30 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    student.hasMinimumData ? 'bg-green-500' : 
                    student.isInitialized ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm font-medium">{student.studentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Health: {student.healthScore}%
                  </Badge>
                  {student.hasMinimumData && (
                    <Badge variant="default" className="text-xs">
                      Pattern Detection Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Success Message */}
        {allStudentsInitialized && hasStudentsWithData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                ✨ Universal pattern detection is active for all students!
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        {status.totalStudents === 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-blue-800 text-sm">
              Add your first student to see universal analytics in action. Pattern detection will start immediately!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};