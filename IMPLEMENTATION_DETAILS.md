# Detailed Implementation Guide

## 1. Logger Service Implementation

```typescript
// src/lib/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  private constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
      enableConsole: process.env.NODE_ENV !== 'production',
      enableRemote: false
    };
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG) && this.config.enableConsole) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN) && this.config.enableConsole) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error;
      
      if (this.config.enableConsole) {
        console.error(this.formatMessage('ERROR', message, errorData));
      }
      
      // Send to remote logging service if enabled
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        this.sendToRemote(message, errorData);
      }
    }
  }

  private async sendToRemote(message: string, data: any): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          message,
          data,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      // Silently fail to avoid infinite loop
    }
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const logger = Logger.getInstance();
```

## 2. Enhanced Error Boundary Implementation

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      }
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset after 3 errors to prevent infinite loops
    if (this.state.errorCount >= 3) {
      this.scheduleReset();
    }
  }

  scheduleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetError();
    }, 5000);
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. The application may not be working correctly.
              </p>
              
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.resetError} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {this.state.errorCount >= 3 && (
                <p className="text-xs text-muted-foreground">
                  Auto-refreshing in 5 seconds...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 3. UUID Generator Utility

```typescript
// src/lib/uuid.ts
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback to manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate ID with prefix
export function generateId(prefix: string): string {
  return `${prefix}_${generateUUID()}`;
}

// Generate timestamp-based ID for sorting
export function generateTimestampId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}
```

## 4. Async State Hook Implementation

```typescript
// src/hooks/useAsyncState.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncStateReturn<T> {
  state: AsyncState<T>;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
  setData: (data: T) => void;
}

export function useAsyncState<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncStateReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: any[]) => {
    setState({ data: null, loading: true, error: null });

    try {
      const result = await asyncFunction(...args);
      
      if (isMountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (error) {
      logger.error('Async operation failed', error);
      
      if (isMountedRef.current) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error : new Error('Unknown error') 
        });
      }
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T) => {
    setState({ data, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { state, execute, reset, setData };
}
```

## 5. Fixed Mock Data Generator

```typescript
// src/lib/mockDataGenerator.ts (updated sections)
import { generateId, generateTimestampId } from '@/lib/uuid';

// Generate realistic emotion entry
const generateEmotionEntry = (studentId: string, timestamp: Date, emotionBias?: string): EmotionEntry => {
  const emotions = ['happy', 'sad', 'anxious', 'calm', 'excited', 'frustrated', 'content'];
  const biasedEmotion = emotionBias || emotions[Math.floor(Math.random() * emotions.length)];
  
  // Generate intensity based on emotion type
  const intensityMap: Record<string, [number, number]> = {
    'happy': [3, 5],
    'sad': [2, 4],
    'anxious': [3, 5],
    'calm': [2, 4],
    'excited': [4, 5],
    'frustrated': [3, 5],
    'content': [2, 4]
  };
  
  const [minIntensity, maxIntensity] = intensityMap[biasedEmotion] || [2, 4];
  const intensity = Math.floor(Math.random() * (maxIntensity - minIntensity + 1)) + minIntensity;
  
  return {
    id: generateId('emotion'),
    studentId,
    timestamp,
    emotion: biasedEmotion,
    intensity,
    triggers: Math.random() > 0.7 ? ['environmental change', 'social interaction'] : [],
    notes: Math.random() > 0.8 ? `Student seemed ${biasedEmotion} during this period` : ''
  };
};

// Updated MockDataLoader to use scenarios
export const MockDataLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<string>('all');

  const handleLoadMockData = async () => {
    setIsLoading(true);
    setLoadingProgress(0);

    try {
      // Simulate loading progress for better UX
      setLoadingProgress(25);
      
      // Generate and load the data based on scenario
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingProgress(50);
      
      // Load data based on selected scenario
      if (selectedScenario === 'all') {
        loadMockDataToStorage();
      } else {
        loadScenarioDataToStorage(selectedScenario as 'emma' | 'lars' | 'astrid');
      }
      
      setLoadingProgress(75);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoadingProgress(100);
      
      // Get stats for success message
      const stats = dataStorage.getStorageStats();
      const mockStudents = generateMockStudents();
      const selectedStudents = selectedScenario === 'all' 
        ? mockStudents 
        : mockStudents.filter(s => s.name.toLowerCase().includes(selectedScenario));
      
      toast.success('Mock data loaded successfully!', {
        description: `Loaded ${selectedStudents.length} student(s) with tracking data`,
      });
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('mockDataLoaded'));
      
    } catch (error) {
      logger.error('Failed to load mock data', error);
      toast.error('Failed to load mock data', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  // ... rest of the component
};

// New function to load specific scenario
export function loadScenarioDataToStorage(scenario: 'emma' | 'lars' | 'astrid'): void {
  try {
    clearMockDataFromStorage();
    
    const students = generateMockStudents();
    const selectedStudent = students.find(s => s.name.toLowerCase().includes(scenario));
    
    if (!selectedStudent) {
      throw new Error(`Student not found for scenario: ${scenario}`);
    }
    
    // Save student
    dataStorage.saveStudent(selectedStudent);
    
    // Generate and save tracking entries
    const entries = generateTrackingDataForStudent(selectedStudent, scenario);
    entries.forEach(entry => {
      dataStorage.saveTrackingEntry(entry);
    });
    
  } catch (error) {
    logger.error('Failed to load scenario data', error);
    throw new Error('Failed to initialize scenario data');
  }
}
```

## 6. Memory Leak Fixes

```typescript
// src/components/AnalyticsDashboard.tsx (fixed version)
export const AnalyticsDashboard = ({
  student,
  filteredData
}: AnalyticsDashboardProps) => {
  const { tStudent } = useTranslation();
  const { results, isAnalyzing, error, runAnalysis, invalidateCacheForStudent } = useAnalyticsWorker();
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect to trigger the analysis
  useEffect(() => {
    if (isMountedRef.current) {
      runAnalysis(filteredData);
      analyticsManager.initializeStudentAnalytics(student.id);
    }
  }, [student.id, filteredData, runAnalysis]);

  // Export handler with proper error handling
  const handleExport = async (format: ExportFormat) => {
    if (!isMountedRef.current) return;
    
    setIsExporting(true);
    try {
      // ... export logic ...
      
      if (isMountedRef.current) {
        toast.success(`${format.toUpperCase()} report exported successfully`);
      }
    } catch (error) {
      logger.error('Export failed', error);
      if (isMountedRef.current) {
        toast.error('Failed to export analytics data');
      }
    } finally {
      if (isMountedRef.current) {
        setIsExporting(false);
      }
    }
  };

  // ... rest of component
};
```

## Implementation Checklist

- [ ] Replace all console.* statements with logger service
- [ ] Implement UUID generation for all IDs
- [ ] Add proper cleanup in all useEffect hooks
- [ ] Implement scenario selection in MockDataLoader
- [ ] Add loading states to all async operations
- [ ] Implement proper error boundaries
- [ ] Add data validation before storage operations
- [ ] Implement retry mechanisms for failed operations
- [ ] Add performance monitoring
- [ ] Implement code splitting for large components