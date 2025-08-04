import { describe, it, expect } from 'vitest';
import {
  validateStudent,
  validateEmotionEntry,
  validateSensoryEntry,
  validateTrackingEntry,
} from './dataValidation';
import { Student, EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

describe('Data Validation', () => {
  describe('validateStudent', () => {
    it('should return true for a valid student', () => {
      const student: Student = { id: '1', name: 'Valid Student', createdAt: new Date() };
      expect(validateStudent(student).isValid).toBe(true);
    });

    it('should return false for an invalid student', () => {
      const invalidStudent = { name: 'Invalid Student' };
      expect(validateStudent(invalidStudent).isValid).toBe(false);
    });
  });

  describe('validateEmotionEntry', () => {
    it('should return true for a valid emotion entry', () => {
      const entry: EmotionEntry = { id: 'e1', studentId: '1', emotion: 'happy', intensity: 5, timestamp: new Date() };
      expect(validateEmotionEntry(entry).isValid).toBe(true);
    });

    it('should return false for an invalid emotion entry', () => {
      const invalidEntry = { id: 'e1', emotion: 'happy' };
      expect(validateEmotionEntry(invalidEntry).isValid).toBe(false);
    });
  });

  describe('validateSensoryEntry', () => {
    it('should return true for a valid sensory entry', () => {
      const entry: SensoryEntry = { id: 's1', studentId: '1', sensoryType: 'auditory', response: 'seeking', intensity: 3, timestamp: new Date() };
      expect(validateSensoryEntry(entry).isValid).toBe(true);
    });

    it('should return false for an invalid sensory entry', () => {
      const invalidEntry = { id: 's1', response: 'seeking' };
      expect(validateSensoryEntry(invalidEntry).isValid).toBe(false);
    });
  });

  describe('validateTrackingEntry', () => {
    it('should return true for a valid tracking entry', () => {
      const entry: TrackingEntry = {
        id: 't1',
        studentId: '1',
        timestamp: new Date(),
        emotions: [],
        sensoryInputs: [],
      };
      expect(validateTrackingEntry(entry).isValid).toBe(true);
    });

    it('should return false for an invalid tracking entry', () => {
      const invalidEntry = { id: 't1', studentId: '1' };
      expect(validateTrackingEntry(invalidEntry).isValid).toBe(false);
    });
  });
});