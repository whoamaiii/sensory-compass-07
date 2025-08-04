import { describe, it, expect } from 'vitest';
import { generateUUID, generateId, generateTimestampId } from './uuid';

describe('UUID Utilities', () => {
  describe('generateUUID', () => {
    it('should generate a valid v4 UUID', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('generateId', () => {
    it('should generate an ID with the correct prefix', () => {
      const id = generateId('test');
      expect(id.startsWith('test_')).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTimestampId', () => {
    it('should generate a timestamp-based ID with the correct prefix', () => {
        const id = generateTimestampId('test');
        expect(id.startsWith('test_')).toBe(true);
    });

    it('should contain a timestamp part', () => {
      const id = generateTimestampId('test');
      const parts = id.split('_');
      const timestampPart = parts[1];
      // A simple check to see if it resembles a base-36 timestamp
      expect(timestampPart).toMatch(/^[a-z0-9]+$/);
      const recentPastTimestamp = (Date.now() - 20000).toString(36);
      expect(timestampPart.length).toBeGreaterThanOrEqual(recentPastTimestamp.length - 1);
    });

    it('should generate unique IDs', () => {
      // To ensure timestamps are different
      setTimeout(() => {
        const id1 = generateTimestampId('test');
        const id2 = generateTimestampId('test');
        expect(id1).not.toBe(id2);
      }, 1);
    });
  });
});