import { describe, test, expect, vi } from 'vitest';
import { generateEmotionEntry, generateSensoryEntry, generateTrackingEntry, generateMockStudents, generateAllMockData } from '@/lib/mockDataGenerator';

vi.mock('@/lib/dataValidation', () => ({
  validateEmotionEntry: vi.fn(() => ({ isValid: true })),
  validateSensoryEntry: vi.fn(() => ({ isValid: true })),
  validateTrackingEntry: vi.fn(() => ({ isValid: true })),
}));

describe('Data Transformation', () => {
  describe('Edge Cases', () => {
    test('should handle empty data', () => {
      const data = generateAllMockData();
      expect(data).toBeDefined();
      expect(data.students).toBeDefined();
      expect(data.trackingEntries).toBeDefined();
    });

    test('should handle null values gracefully', () => {
      const entry = generateEmotionEntry('student-1', new Date(), null as any);
      expect(entry).toBeDefined();
      expect(entry.emotion).toBeDefined();
    });

    test('should handle malformed student data', () => {
      const student = { id: '', name: '', grade: '', dateOfBirth: '', notes: '', iepGoals: [], createdAt: new Date(), lastUpdated: new Date(), version: 1 };
      const entry = generateTrackingEntry(student, 1, 'emma');
      expect(entry).toBeDefined();
      expect(entry.studentId).toBe('');
    });
  });

  describe('Data Integrity', () => {
    test('should generate unique IDs for each entry', () => {
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push(generateEmotionEntry('student-1', new Date()));
      }
      const ids = entries.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    test('should generate valid intensity values', () => {
      for (let i = 0; i < 50; i++) {
        const entry = generateEmotionEntry('student-1', new Date());
        expect(entry.intensity).toBeGreaterThanOrEqual(1);
        expect(entry.intensity).toBeLessThanOrEqual(5);
      }
    });

    test('should generate valid timestamps', () => {
      const now = new Date();
      const entry = generateEmotionEntry('student-1', now);
      expect(entry.timestamp).toEqual(now);
    });
  });

  describe('Scenario-based Generation', () => {
    test('should generate appropriate data for emma scenario', () => {
      const student = { id: 'emma-1', name: 'Emma', grade: '8', dateOfBirth: '2011-01-01', notes: '', iepGoals: [], createdAt: new Date(), lastUpdated: new Date(), version: 1 };
      const entry = generateTrackingEntry(student, 10, 'emma');
      expect(entry.emotions.length).toBeGreaterThan(0);
      expect(entry.sensoryInputs.length).toBeGreaterThan(0);
    });

    test('should generate appropriate data for lars scenario', () => {
      const student = { id: 'lars-1', name: 'Lars', grade: '6', dateOfBirth: '2013-01-01', notes: '', iepGoals: [], createdAt: new Date(), lastUpdated: new Date(), version: 1 };
      const entry = generateTrackingEntry(student, 10, 'lars');
      expect(entry.emotions.length).toBeGreaterThan(0);
      expect(entry.sensoryInputs.length).toBeGreaterThan(0);
    });

    test('should generate appropriate data for astrid scenario', () => {
      const student = { id: 'astrid-1', name: 'Astrid', grade: '9', dateOfBirth: '2010-01-01', notes: '', iepGoals: [], createdAt: new Date(), lastUpdated: new Date(), version: 1 };
      const entry = generateTrackingEntry(student, 10, 'astrid');
      expect(entry.emotions.length).toBeGreaterThan(0);
      expect(entry.sensoryInputs.length).toBeGreaterThan(0);
    });
  });
  describe('generateEmotionEntry', () => {
    test('should generate a valid emotion entry', () => {
      const entry = generateEmotionEntry('student-1', new Date());
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', 'student-1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('emotion');
      expect(entry).toHaveProperty('intensity');
    });
  });

  describe('generateSensoryEntry', () => {
    test('should generate a valid sensory entry', () => {
      const entry = generateSensoryEntry('student-1', new Date());
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', 'student-1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('response');
    });
  });

  describe('generateTrackingEntry', () => {
    test('should generate a valid tracking entry for a given scenario', () => {
      const student = { id: 'student-1', name: 'Test Student', grade: '1', dateOfBirth: '2022-01-01', notes: '', iepGoals: [], createdAt: new Date(), lastUpdated: new Date(), version: 1 };
      const entry = generateTrackingEntry(student, 1, 'emma');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('studentId', 'student-1');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('emotions');
      expect(entry).toHaveProperty('sensoryInputs');
      expect(entry).toHaveProperty('environmentalData');
    });
  });

  describe('generateMockStudents', () => {
    test('should generate a list of mock students', () => {
      const students = generateMockStudents();
      expect(students).toBeInstanceOf(Array);
      expect(students.length).toBeGreaterThan(0);
      students.forEach(student => {
        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('name');
        expect(student).toHaveProperty('grade');
      });
    });
  });

  describe('generateAllMockData', () => {
    test('should generate a complete set of mock data', () => {
      const data = generateAllMockData();
      expect(data).toHaveProperty('students');
      expect(data).toHaveProperty('trackingEntries');
      expect(data.students.length).toBeGreaterThan(0);
      expect(data.trackingEntries.length).toBeGreaterThan(0);
    });
  });
});

