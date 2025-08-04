import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const InteractiveDataVisualization = ({ emotions, sensoryInputs, trackingEntries, studentName }: any) => {
  console.log('[DEBUG] InteractiveDataVisualization props:', {
    emotions: emotions?.length,
    sensoryInputs: sensoryInputs?.length,
    trackingEntries: trackingEntries?.length,
    studentName
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Data Visualization Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            <p>Debug mode active - checking component loading</p>
          </div>
          <div className="text-sm space-y-2">
            <p>Emotions: {emotions?.length || 0} entries</p>
            <p>Sensory Inputs: {sensoryInputs?.length || 0} entries</p>
            <p>Tracking Entries: {trackingEntries?.length || 0} entries</p>
            <p>Student Name: {studentName || 'Not provided'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
