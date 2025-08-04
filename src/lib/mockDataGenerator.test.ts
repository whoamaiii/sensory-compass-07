import { describe, it, expect } from 'vitest';
import { generateMockStudents, generateEmotionEntry, generateSensoryEntry, generateTrackingEntry, generateAllMockData } from './mockDataGenerator';
import { Student } from '@/types/student';

describe('Mock Data Generator', () => {
  describe('generateMockStudents', () => {
    it('should generate the correct number of students', () => {
      const students = generateMockStudents();
      expect(students).toHaveLength(3);
    });

    it('should generate students with all required fields', () => {
      const student = generateMockStudents()[0];
      expect(student).toHaveProperty('id');
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('grade');
      expect(student).toHaveProperty('createdAt');
    });
  });

  describe('generateEmotionEntry', () => {
    it('should generate an emotion entry with all required fields', () => {
      const entry = generateEmotionEntry('student-1', new Date());
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', 'student-1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('emotion');
      expect(entry).toHaveProperty('intensity');
    });
  });

  describe('generateSensoryEntry', () => {
    it('should generate a sensory entry with all required fields', () => {
      const entry = generateSensoryEntry('student-1', new Date());
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', 'student-1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('sensoryType');
      expect(entry).toHaveProperty('response');
    });
  });

  describe('generateTrackingEntry', () => {
    it('should generate a tracking entry with all required fields', () => {
      const student: Student = { id: '1', name: 'Test Student', createdAt: new Date() };
      const entry = generateTrackingEntry(student, 1, 'emma');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', '1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('emotions');
      expect(entry).toHaveProperty('sensoryInputs');
    });
  });

  describe('generateAllMockData', () => {
    it('should generate all mock data', () => {
      const data = generateAllMockData();
      expect(data).toHaveProperty('students');
      expect(data).toHaveProperty('trackingEntries');
      expect(data.students.length).toBeGreaterThan(0);
      expect(data.trackingEntries.length).toBeGreaterThan(0);
    });
  });
});