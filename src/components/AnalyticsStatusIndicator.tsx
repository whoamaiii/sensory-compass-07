import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Brain,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock
} from "lucide-react";
import { analyticsManager } from "@/lib/analyticsManager";
import { dataStorage } from "@/lib/dataStorage";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/lib/logger";

/**
 * Represents the analytics status for a single student
 */
interface AnalyticsStatus {
  studentId: string;
  studentName: string;
  isInitialized: boolean;
  lastAnalyzed: Date | null;
  healthScore: number;
  hasMinimumData: boolean;
}

interface AnalyticsStatusIndicatorProps {
  studentId?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * AnalyticsStatusIndicator Component
 * 
 * Displays the current analytics health and status for one or all students.
 * Auto-refreshes every 30 seconds to show real-time status updates.
 * 
 * @component
 * @param {AnalyticsStatusIndicatorProps} props - Component props
 * @param {string} [props.studentId] - Optional student ID to filter analytics
 * @param {boolean} [props.showDetails=false] - Whether to show detailed analytics systems status
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const AnalyticsStatusIndicator = ({ 
  studentId, 
  showDetails = false, 
  className = "" 
}: AnalyticsStatusIndicatorProps) => {
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load analytics status from the analytics manager.
   * Memoized to prevent recreation on every render.
   * Filters by studentId if provided.
   */
  const loadAnalyticsStatus = useCallback(() => {
    const status = analyticsManager.getAnalyticsStatus() as AnalyticsStatus[];
    if (studentId) {
      setAnalyticsStatus(status.filter(s => s.studentId === studentId));
    } else {
      setAnalyticsStatus(status);
    }
  }, [studentId]);

  /**
   * Effect to load analytics status and set up auto-refresh.
   * Properly includes loadAnalyticsStatus in dependencies.
   */
  useEffect(() => {
    // Initial load
    loadAnalyticsStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadAnalyticsStatus, 30000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [loadAnalyticsStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (studentId) {
        // Get the full Student object from storage
        const student = dataStorage.getStudentById(studentId);
        if (student) {
          await analyticsManager.triggerAnalyticsForStudent(student);
        } else {
          logger.warn('Student not found for refresh', { studentId });
        }
      } else {
        await analyticsManager.triggerAnalyticsForAllStudents();
      }
      loadAnalyticsStatus();
    } catch (error) {
      logger.error('Error refreshing analytics', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: AnalyticsStatus) => {
    if (!status.isInitialized) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (status.healthScore >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status.healthScore >= 60) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    if (status.healthScore >= 40) return <Activity className="h-4 w-4 text-orange-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (status: AnalyticsStatus): "default" | "secondary" | "destructive" | "outline" => {
    if (!status.isInitialized) return "secondary";
    if (status.healthScore >= 80) return "default";
    if (status.healthScore >= 60) return "secondary";
    return "destructive";
  };

  const getStatusText = (status: AnalyticsStatus): string => {
    if (!status.isInitialized) return "Initializing";
    if (status.healthScore >= 80) return "Excellent";
    if (status.healthScore >= 60) return "Good";
    if (status.healthScore >= 40) return "Fair";
    return "Limited";
  };

  if (!showDetails && studentId && analyticsStatus.length === 1) {
    const status = analyticsStatus[0];
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon(status)}
        <Badge variant={getStatusColor(status)} className="text-xs">
          Analytics: {getStatusText(status)}
        </Badge>
        {status.lastAnalyzed && (
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(status.lastAnalyzed, { addSuffix: true })}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={`bg-gradient-card border-0 shadow-soft ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analytics Status
            {studentId && ` - ${analyticsStatus[0]?.studentName || 'Student'}`}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analyticsStatus.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No analytics data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyticsStatus.map((status) => (
              <div key={status.studentId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div>
                    <p className="font-medium text-foreground">
                      {studentId ? 'Analytics Systems' : status.studentName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getStatusColor(status)} className="text-xs">
                        {getStatusText(status)} ({status.healthScore}%)
                      </Badge>
                      {status.hasMinimumData ? (
                        <Badge variant="outline" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Data Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Collecting Data
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {status.lastAnalyzed ? (
                      <>
                        Last updated:<br />
                        {formatDistanceToNow(status.lastAnalyzed, { addSuffix: true })}
                      </>
                    ) : (
                      'Never analyzed'
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {showDetails && (
              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Active Analytics Systems:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Pattern Analysis
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Correlation Analysis
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Predictive Insights
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Anomaly Detection
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Alert System
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Auto-Updates
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};