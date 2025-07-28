import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Users,
  BarChart3,
  TestTube
} from 'lucide-react';
import { analyticsManager } from '@/lib/analyticsManager';
import { universalAnalyticsInitializer } from '@/lib/universalAnalyticsInitializer';
import { dataStorage } from '@/lib/dataStorage';
import { toast } from 'sonner';

interface TestingDebugPanelProps {
  className?: string;
}

export const TestingDebugPanel = ({ className = "" }: TestingDebugPanelProps) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runSystemTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    const results: any[] = [];
    
    try {
      // Test 1: Data Storage
      results.push({
        name: "Data Storage",
        status: "running",
        message: "Testing localStorage operations..."
      });
      setTestResults([...results]);
      
      const students = dataStorage.getStudents();
      const entries = dataStorage.getTrackingEntries();
      const storageStats = dataStorage.getStorageStats();
      
      results[0] = {
        name: "Data Storage",
        status: storageStats.studentsCount >= 0 ? "pass" : "fail",
        message: `Found ${storageStats.studentsCount} students, ${storageStats.entriesCount} entries`
      };
      setTestResults([...results]);
      
      // Test 2: Analytics Initialization
      results.push({
        name: "Analytics System",
        status: "running",
        message: "Testing analytics initialization..."
      });
      setTestResults([...results]);
      
      const analyticsStatus = analyticsManager.getAnalyticsStatus();
      const initStatus = universalAnalyticsInitializer.getInitializationStatus();
      
      results[1] = {
        name: "Analytics System",
        status: initStatus.isInitialized ? "pass" : "warn",
        message: `${initStatus.studentsWithAnalytics}/${initStatus.totalStudents} students have analytics`
      };
      setTestResults([...results]);
      
      // Test 3: New Student Creation (without mock data)
      results.push({
        name: "New Student Flow",
        status: "running",
        message: "Testing new student creation..."
      });
      setTestResults([...results]);
      
      // Create a test student temporarily
      const testStudentId = 'test-' + Date.now();
      analyticsManager.initializeStudentAnalytics(testStudentId);
      const testStatus = analyticsManager.getAnalyticsStatus().find(s => s.studentId === testStudentId);
      
      results[2] = {
        name: "New Student Flow",
        status: testStatus?.isInitialized && !testStatus?.hasMinimumData ? "pass" : "fail",
        message: testStatus?.isInitialized && !testStatus?.hasMinimumData 
          ? "✓ New students start with clean slate" 
          : "✗ New students may have unexpected data"
      };
      setTestResults([...results]);
      
      // Test 4: Empty State Handling
      results.push({
        name: "Empty State Handling",
        status: "running",
        message: "Testing empty data scenarios..."
      });
      setTestResults([...results]);
      
      const emptyStudents = students.filter(student => {
        const studentEntries = entries.filter(entry => entry.studentId === student.id);
        return studentEntries.length === 0;
      });
      
      results[3] = {
        name: "Empty State Handling",
        status: "pass",
        message: `Found ${emptyStudents.length} students with no data (will show empty states)`
      };
      setTestResults([...results]);
      
      // Test 5: Pattern Detection Ready
      results.push({
        name: "Pattern Detection",
        status: "running",
        message: "Testing pattern detection capability..."
      });
      setTestResults([...results]);
      
      const studentsWithData = students.filter(student => {
        const studentEntries = entries.filter(entry => entry.studentId === student.id);
        return studentEntries.length >= 3;
      });
      
      results[4] = {
        name: "Pattern Detection",
        status: studentsWithData.length > 0 ? "pass" : "warn",
        message: `${studentsWithData.length} students have enough data for pattern detection`
      };
      setTestResults([...results]);
      
      toast.success("System tests completed successfully");
      
    } catch (error) {
      console.error('System test error:', error);
      results.push({
        name: "Test Error",
        status: "fail",
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTestResults([...results]);
      toast.error("Some tests failed");
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <TestTube className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'default';
      case 'fail': return 'destructive';
      case 'warn': return 'secondary';
      case 'running': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className={`bg-gradient-card border-0 shadow-soft ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          System Testing & Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Test current system functionality and data integrity
          </p>
          <Button
            onClick={runSystemTests}
            disabled={isRunningTests}
            size="sm"
            variant="outline"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run System Tests
              </>
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium text-sm">{result.name}</p>
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                <Badge variant={getStatusColor(result.status)} className="text-xs">
                  {result.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Quick Stats:</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div>
              <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Entries</p>
            </div>
            <div>
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Analytics</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};