import React from 'react';
import { InteractiveDataVisualization } from './InteractiveDataVisualization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const DebugVisualization = () => {
  // Create comprehensive mock data to test visualization
  const mockEmotions = [
    {
      id: '1',
      emotion: 'happy',
      intensity: 4,
      triggers: ['playtime'],
      timestamp: new Date('2024-01-01T10:00:00'),
      notes: 'Playing with blocks'
    },
    {
      id: '2',
      emotion: 'calm',
      intensity: 3,
      triggers: ['quiet time'],
      timestamp: new Date('2024-01-01T11:00:00'),
      notes: 'Reading a book'
    },
    {
      id: '3',
      emotion: 'anxious',
      intensity: 4,
      triggers: ['loud noise'],
      timestamp: new Date('2024-01-02T09:00:00'),
      notes: 'Fire drill'
    },
    {
      id: '4',
      emotion: 'happy',
      intensity: 5,
      triggers: ['friend visit'],
      timestamp: new Date('2024-01-02T14:00:00'),
      notes: 'Playing with friend'
    },
    {
      id: '5',
      emotion: 'calm',
      intensity: 2,
      triggers: ['music'],
      timestamp: new Date('2024-01-03T10:00:00'),
      notes: 'Listening to calming music'
    }
  ];

  const mockSensoryInputs = [
    {
      id: '1',
      type: 'visual',
      sensoryType: 'visual',
      response: 'seeking',
      intensity: 3,
      timestamp: new Date('2024-01-01T10:30:00'),
      notes: 'Looking at colorful pictures'
    },
    {
      id: '2',
      type: 'auditory',
      sensoryType: 'auditory',
      response: 'avoiding',
      intensity: 4,
      timestamp: new Date('2024-01-01T11:30:00'),
      notes: 'Loud noise from outside'
    },
    {
      id: '3',
      type: 'tactile',
      sensoryType: 'tactile',
      response: 'seeking',
      intensity: 5,
      timestamp: new Date('2024-01-02T10:00:00'),
      notes: 'Playing with sensory toys'
    },
    {
      id: '4',
      type: 'vestibular',
      sensoryType: 'vestibular',
      response: 'seeking',
      intensity: 4,
      timestamp: new Date('2024-01-02T15:00:00'),
      notes: 'Swinging on playground'
    },
    {
      id: '5',
      type: 'visual',
      sensoryType: 'visual',
      response: 'avoiding',
      intensity: 3,
      timestamp: new Date('2024-01-03T09:00:00'),
      notes: 'Bright lights in classroom'
    }
  ];

  const mockTrackingEntries = [
    {
      id: '1',
      timestamp: new Date('2024-01-01T10:00:00'),
      emotions: ['happy'],
      sensoryInputs: ['visual'],
      environmentalData: {
        location: 'classroom',
        noiseLevel: 3,
        lighting: 'natural',
        temperature: 22,
        weather: 'sunny',
        classroom: {
          activity: 'free play',
          numberOfPeople: 12,
          structureLevel: 'low'
        }
      },
      notes: 'Morning session'
    },
    {
      id: '2',
      timestamp: new Date('2024-01-02T09:00:00'),
      emotions: ['anxious'],
      sensoryInputs: ['auditory'],
      environmentalData: {
        location: 'playground',
        noiseLevel: 8,
        lighting: 'bright',
        temperature: 18,
        weather: 'cloudy',
        classroom: {
          activity: 'group activity',
          numberOfPeople: 20,
          structureLevel: 'medium'
        }
      },
      notes: 'Fire drill disruption'
    },
    {
      id: '3',
      timestamp: new Date('2024-01-03T10:00:00'),
      emotions: ['calm'],
      sensoryInputs: ['visual'],
      environmentalData: {
        location: 'sensory room',
        noiseLevel: 2,
        lighting: 'dim',
        temperature: 21,
        weather: 'rainy',
        classroom: {
          activity: 'quiet time',
          numberOfPeople: 3,
          structureLevel: 'high'
        }
      },
      notes: 'Sensory break'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Debug Visualization Component
            <Badge variant="outline">Test Mode</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Debug info */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">Emotions</p>
                  <p className="text-2xl font-bold">{mockEmotions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">Sensory Inputs</p>
                  <p className="text-2xl font-bold">{mockSensoryInputs.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">Tracking Entries</p>
                  <p className="text-2xl font-bold">{mockTrackingEntries.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Render the actual visualization component */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Interactive Data Visualization Component:</h3>
              <InteractiveDataVisualization
                emotions={mockEmotions}
                sensoryInputs={mockSensoryInputs}
                trackingEntries={mockTrackingEntries}
                studentName="Test Student (Debug Mode)"
              />
            </div>

            {/* Data preview */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">View Raw Data</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-sm font-medium">Emotions Sample:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(mockEmotions[0], null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium">Sensory Sample:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(mockSensoryInputs[0], null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium">Tracking Sample:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(mockTrackingEntries[0], null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
