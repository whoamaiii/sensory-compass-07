import { describe, it, expect } from 'vitest';
import {
  validateStudent,
  validateEmotionEntry,
  validateSensoryEntry,
} from './formValidation';

describe('Form Validation', () => {
  describe('validateStudent', () => {
    it('should return success for a valid student', () => {
      const student = { name: 'Valid Name', grade: '5', dateOfBirth: '2010-01-01' };
      expect(validateStudent(student).success).toBe(true);
    });

    it('should return failure for an invalid student', () => {
      const invalidStudent = { name: 'a' };
      expect(validateStudent(invalidStudent).success).toBe(false);
    });
  });

  describe('validateEmotionEntry', () => {
    it('should return success for a valid emotion entry', () => {
      const entry = { emotion: 'happy', intensity: 5 };
      expect(validateEmotionEntry(entry).success).toBe(true);
    });

    it('should return failure for an invalid emotion entry', () => {
      const invalidEntry = { emotion: 'happy', intensity: 6 };
      expect(validateEmotionEntry(invalidEntry).success).toBe(false);
    });
  });

  describe('validateSensoryEntry', () => {
    it('should return success for a valid sensory entry', () => {
      const entry = { type: 'auditory', response: 'seeking' };
      expect(validateSensoryEntry(entry).success).toBe(true);
    });

    it('should return failure for an invalid sensory entry', () => {
      const invalidEntry = { type: '', response: 'seeking' };
      expect(validateSensoryEntry(invalidEntry).success).toBe(false);
    });
  });
});