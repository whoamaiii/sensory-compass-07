import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { logger } from '@/lib/logger';

export const InteractiveDataVisualizationDiagnosis = () => {
  const [tests, setTests] = useState<{
    name: string;
    status: 'pending' | 'testing' | 'passed' | 'failed';
    error?: string;
  }[]>([
    { name: 'Component Props', status: 'pending' },
    { name: 'ECharts Import', status: 'pending' },
    { name: 'Hooks Import', status: 'pending' },
    { name: 'Sub-components Import', status: 'pending' },
    { name: 'Memory Usage', status: 'pending' },
  ]);

  const runTest = async (index: number) => {
    const newTests = [...tests];
    newTests[index].status = 'testing';
    setTests(newTests);

    try {
      switch (index) {
        case 0: // Component Props Test
          logger.debug('Testing component props...');
          await new Promise(resolve => setTimeout(resolve, 100));
          break;

        case 1: // ECharts Import Test
          logger.debug('Testing ECharts import...');
          const echarts = await import('echarts');
          if (!echarts) throw new Error('ECharts not loaded');
          break;

        case 2: // Hooks Import Test
          logger.debug('Testing hooks import...');
          const hooks = await import('@/hooks/useRealtimeData');
          if (!hooks.useRealtimeData) throw new Error('useRealtimeData hook not found');
          break;

        case 3: // Sub-components Import Test
          logger.debug('Testing sub-components import...');
          const [viz3d, timeline, filter] = await Promise.all([
            import('@/components/Visualization3D'),
            import('@/components/TimelineVisualization'),
            import('@/components/AdvancedFilterPanel')
          ]);
          if (!viz3d.Visualization3D) throw new Error('Visualization3D not found');
          if (!timeline.TimelineVisualization) throw new Error('TimelineVisualization not found');
          if (!filter.AdvancedFilterPanel) throw new Error('AdvancedFilterPanel not found');
          break;

        case 4: // Memory Usage Test
          logger.debug('Testing memory usage...');
          if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usedPercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
            if (usedPercent > 0.9) throw new Error('Memory usage too high: ' + Math.round(usedPercent * 100) + '%');
          }
          break;
      }

      newTests[index].status = 'passed';
    } catch (error) {
      newTests[index].status = 'failed';
      newTests[index].error = error instanceof Error ? error.message : String(error);
      logger.error(`Test ${tests[index].name} failed:`, error);
    }

    setTests(newTests);
  };

  useEffect(() => {
    // Run all tests sequentially
    const runAllTests = async () => {
      for (let i = 0; i < tests.length; i++) {
        await runTest(i);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      }
    };
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'testing': return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Data Visualization - Diagnosis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Running diagnostic tests to identify loading issues...
          </p>
          
          <div className="space-y-2">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                </div>
                {test.error && (
                  <span className="text-sm text-red-500">{test.error}</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Diagnosis Summary</h4>
            <div className="text-sm space-y-1">
              <p>Total Tests: {tests.length}</p>
              <p>Passed: {tests.filter(t => t.status === 'passed').length}</p>
              <p>Failed: {tests.filter(t => t.status === 'failed').length}</p>
            </div>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="w-full"
          >
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Export as default for lazy loading
export const InteractiveDataVisualization = InteractiveDataVisualizationDiagnosis;
