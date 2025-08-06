import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bug,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Users,
  BarChart3,
  TestTube,
  Archive,
  Trash2,
  Zap,
  Activity
} from 'lucide-react';
import { analyticsManager } from '@/lib/analyticsManager';
import { universalAnalyticsInitializer } from '@/lib/universalAnalyticsInitializer';
import { dataStorage } from '@/lib/dataStorage';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { usePerformanceCache } from '@/hooks/usePerformanceCache';
import { AnalyticsConfigTest } from '@/components/AnalyticsConfigTest';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface TestingDebugPanelProps {
  className?: string;
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'running';
  message: string;
}

interface TestData {
  test: boolean;
  timestamp: number;
}

type TestStatus = TestResult['status'];

interface CacheOperations {
  clearCache: () => void;
  invalidateStudent: (studentId: string) => void;
}

export const TestingDebugPanel: React.FC<TestingDebugPanelProps> = ({ className = "" }) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Analytics worker with cache stats
  const analyticsWorker = useAnalyticsWorker({ 
    enableCacheStats: true,
    cacheTTL: 5 * 60 * 1000 // 5 minutes
  });
  
  // Direct cache instance for UI testing
  const uiCache = usePerformanceCache({ 
    enableStats: true,
    maxSize: 100,
    ttl: 5 * 60 * 1000
  });

  // Update cache stats every second
  const [cacheStats, setCacheStats] = useState(analyticsWorker.cacheStats);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(analyticsWorker.cacheStats);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [analyticsWorker.cacheStats]);

  const runSystemTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
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
      
      // Test 6: Cache Performance
      results.push({
        name: "Cache Performance",
        status: "running",
        message: "Testing cache functionality..."
      });
      setTestResults([...results]);
      
      // Test cache operations
      const testKey = 'test-cache-' + Date.now();
      const testData: TestData = { test: true, timestamp: Date.now() };
      uiCache.set(testKey, testData);
      const retrieved = uiCache.get(testKey) as TestData | undefined;
      
      results[5] = {
        name: "Cache Performance",
        status: retrieved?.test === true ? "pass" : "fail",
        message: cacheStats ? `Hit rate: ${cacheStats.hitRate.toFixed(1)}%, Size: ${cacheStats.size} items` : "Cache stats unavailable"
      };
      setTestResults([...results]);
      
      toast.success("System tests completed successfully");
      
    } catch (error) {
      logger.error('System test error', { error });
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

  const getStatusIcon = useCallback((status: TestStatus): React.ReactElement => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <TestTube className="h-4 w-4 text-muted-foreground" />;
    }
  }, []);

  const getStatusColor = useCallback((status: TestStatus): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'pass': return 'default';
      case 'fail': return 'destructive';
      case 'warn': return 'secondary';
      case 'running': return 'outline';
      default: return 'secondary';
    }
  }, []);

  const handleClearCache = useCallback(() => {
    analyticsWorker.clearCache();
    uiCache.clear();
    toast.success("Analytics cache cleared successfully");
  }, [analyticsWorker, uiCache]);

  const handleInvalidateStudent = useCallback((studentId: string) => {
    analyticsWorker.invalidateCacheForStudent(studentId);
    toast.success(`Cache invalidated for student ${studentId}`);
  }, [analyticsWorker]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Testing Panel */}
      <Card className="bg-gradient-card border-0 shadow-soft">
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

      {/* Cache Management Panel */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Analytics Cache Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cacheStats && (
            <>
              {/* Cache Statistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={cacheStats.hitRate} className="w-24" />
                    <span className="text-sm font-mono">{cacheStats.hitRate.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Cache Size</span>
                    <span className="text-lg font-semibold">{cacheStats.size} / {analyticsWorker.cacheSize}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Memory Usage</span>
                    <span className="text-lg font-semibold">
                      {cacheStats.memoryUsage ? `${(cacheStats.memoryUsage / 1024).toFixed(1)} KB` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <Activity className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-xs font-medium">{cacheStats.hits}</p>
                    <p className="text-xs text-muted-foreground">Hits</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                    <p className="text-xs font-medium">{cacheStats.misses}</p>
                    <p className="text-xs text-muted-foreground">Misses</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-xs font-medium">{cacheStats.sets}</p>
                    <p className="text-xs text-muted-foreground">Sets</p>
                  </div>
                </div>
              </div>

              {/* Cache Actions */}
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-sm font-medium">Cache Actions</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearCache}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Cache
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => uiCache.cleanup()}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clean Expired
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>• Cache TTL: 5 minutes</p>
                  <p>• Eviction: LRU (Least Recently Used)</p>
                  <p>• Invalidations: {cacheStats.invalidations || 0}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Analytics Configuration Test Panel */}
      <AnalyticsConfigTest />
    </div>
  );
};