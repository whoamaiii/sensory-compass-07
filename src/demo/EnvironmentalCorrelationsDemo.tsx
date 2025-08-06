import React, { useState } from 'react';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { generateUniversalTrackingData } from '@/lib/universalDataGenerator';
import { Button } from '@/components/ui/button';

// Generate a more comprehensive dataset with clear correlations
const generateCorrelatedData = (student: Student, days: number = 30): Student => {
  const entries: TrackingEntry[] = [];
  const baseDate = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    // Morning session (low noise, calm emotions)
    const morningEntry: TrackingEntry = {
      id: `morning_${i}`,
      studentId: student.id,
      timestamp: new Date(date.setHours(9, 0, 0, 0)),
      emotions: [{
        id: `morning_emotion_${i}`,
        studentId: student.id,
        emotion: 'calm',
        intensity: Math.random() < 0.8 ? 2 : 3, // Mostly low intensity
        timestamp: new Date(date),
      }],
      sensoryInputs: [{
        id: `morning_sensory_${i}`,
        studentId: student.id,
        sensoryType: 'auditory',
        response: 'neutral',
        intensity: 2,
        timestamp: new Date(date),
      }],
      environmentalData: {
        id: `morning_env_${i}`,
        timestamp: new Date(date),
        roomConditions: {
          noiseLevel: Math.random() < 0.8 ? 1 : 2, // Low noise
          temperature: 21,
          lighting: 'natural',
          humidity: 45,
        },
        weather: {
          condition: 'sunny',
          temperature: 20,
          pressure: 1013,
        },
        classroom: {
          activity: 'instruction',
          studentCount: 15,
          timeOfDay: 'morning',
        },
      },
      version: 1,
    };
    
    // Afternoon session (high noise, anxious emotions - showing correlation)
    const afternoonEntry: TrackingEntry = {
      id: `afternoon_${i}`,
      studentId: student.id,
      timestamp: new Date(date.setHours(14, 0, 0, 0)),
      emotions: [{
        id: `afternoon_emotion_${i}`,
        studentId: student.id,
        emotion: 'anxious',
        intensity: Math.random() < 0.8 ? 4 : 5, // Mostly high intensity
        timestamp: new Date(date),
      }],
      sensoryInputs: [{
        id: `afternoon_sensory_${i}`,
        studentId: student.id,
        sensoryType: 'auditory',
        response: 'avoiding',
        intensity: 4,
        timestamp: new Date(date),
      }],
      environmentalData: {
        id: `afternoon_env_${i}`,
        timestamp: new Date(date),
        roomConditions: {
          noiseLevel: Math.random() < 0.8 ? 4 : 5, // High noise
          temperature: 23,
          lighting: 'fluorescent',
          humidity: 50,
        },
        weather: {
          condition: 'cloudy',
          temperature: 22,
          pressure: 1010,
        },
        classroom: {
          activity: 'group-work',
          studentCount: 25,
          timeOfDay: 'afternoon',
        },
      },
      version: 1,
    };
    
    entries.push(morningEntry, afternoonEntry);
  }
  
  // Extract all emotions and sensory inputs for the student object
  const allEmotions = entries.flatMap(e => e.emotions);
  const allSensory = entries.flatMap(e => e.sensoryInputs);
  
  return {
    ...student,
    trackingEntries: entries,
    emotions: allEmotions,
    sensory: allSensory,
  };
};

export const EnvironmentalCorrelationsDemo: React.FC = () => {
  const baseStudent: Student = {
    id: 'demo-student-1',
    name: 'Demo Student',
    dateOfBirth: '2015-01-01',
    grade: '3rd Grade',
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    goals: [],
    trackingEntries: [],
    emotions: [],
    sensory: [],
  };
  
  const [student, setStudent] = useState<Student>(() => 
    generateCorrelatedData(baseStudent, 30)
  );
  const [dataSize, setDataSize] = useState(30);
  
  const regenerateData = (days: number) => {
    setDataSize(days);
    setStudent(generateCorrelatedData(baseStudent, days));
  };
  
  return (
    <div className="p-6 space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Environmental Correlations Demo</h2>
        <p className="text-sm text-gray-700 mb-4">
          This demo shows how environmental factors correlate with emotional responses.
          The data is generated to show a strong correlation between noise levels and anxiety.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => regenerateData(7)} variant={dataSize === 7 ? 'default' : 'outline'}>
            1 Week
          </Button>
          <Button onClick={() => regenerateData(30)} variant={dataSize === 30 ? 'default' : 'outline'}>
            30 Days
          </Button>
          <Button onClick={() => regenerateData(90)} variant={dataSize === 90 ? 'default' : 'outline'}>
            90 Days
          </Button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Pattern in data:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Morning sessions: Low noise (1-2) → Calm emotions (intensity 2-3)</li>
            <li>Afternoon sessions: High noise (4-5) → Anxious emotions (intensity 4-5)</li>
          </ul>
        </div>
      </div>
      
      <AnalyticsDashboard student={student} />
    </div>
  );
};
