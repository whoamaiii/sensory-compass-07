// Mock data for tests
import { generateMockStudents, generateTrackingEntry } from './mockDataGenerator';
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';

// Generate mock data
const students = generateMockStudents();
export const mockStudent: Student = students[0];

// Generate tracking entries manually since the function doesn't exist
export const mockTrackingEntries: TrackingEntry[] = [];
for (let i = 0; i < 10; i++) {
  mockTrackingEntries.push(generateTrackingEntry(mockStudent, i * 3, 'emma'));
}

// Extract emotions and sensory inputs from tracking entries
export const mockEmotions: EmotionEntry[] = mockTrackingEntries.flatMap(entry => entry.emotions || []);
export const mockSensoryInputs: SensoryEntry[] = mockTrackingEntries.flatMap(entry => entry.sensoryInputs || []);

// Export additional test data
export const mockStudents = students;
