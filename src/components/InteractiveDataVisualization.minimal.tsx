import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

// Minimal version without complex dependencies
export const InteractiveDataVisualization = ({ 
  emotions = [], 
  sensoryInputs = [], 
  trackingEntries = [], 
  studentName = 'Student' 
}: {
  emotions: any[];
  sensoryInputs: any[];
  trackingEntries: any[];
  studentName: string;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Interactive Data Visualization - {studentName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-lg text-muted-foreground">
            This is a minimal version of the component for testing.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p>Emotions: {emotions.length} entries</p>
            <p>Sensory Inputs: {sensoryInputs.length} entries</p>
            <p>Tracking Entries: {trackingEntries.length} entries</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
