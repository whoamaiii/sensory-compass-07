import { describe, test, expect, vi } from 'vitest';
import { generateEmotionEntry, generateSensoryEntry, generateTrackingEntry, generateAllMockData } from '@/lib/mockDataGenerator';

vi.mock('@/lib/dataValidation', () => ({
  validateEmotionEntry: vi.fn(() => ({ isValid: true })),
  validateSensoryEntry: vi.fn(() => ({ isValid: true })),
  validateTrackingEntry: vi.fn(() => ({ isValid: true })),
}));

describe('Data Transformation Performance', () => {
  test('should handle large dataset generation efficiently', () => {
    const startTime = performance.now();
    
    // Generate 1000 emotion entries
    const entries = [];
    for (let i = 0; i < 1000; i++) {
      entries.push(generateEmotionEntry(`student-${i}`, new Date()));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within 1 second
    expect(duration).toBeLessThan(1000);
    expect(entries.length).toBe(1000);
  });

  test('should handle concurrent data generation', async () => {
    const promises = [];
    const numConcurrent = 10;
    
    for (let i = 0; i < numConcurrent; i++) {
      promises.push(
        new Promise((resolve) => {
          const data = generateAllMockData();
          resolve(data);
        })
      );
    }
    
    const startTime = performance.now();
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    expect(results.length).toBe(numConcurrent);
    results.forEach(result => {
      expect(result.students.length).toBeGreaterThan(0);
      expect(result.trackingEntries.length).toBeGreaterThan(0);
    });
    
    // Should handle concurrent generation efficiently
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('should not have memory leaks with repeated generation', () => {
    const iterations = 100;
    let lastMemoryUsage = 0;
    
    for (let i = 0; i < iterations; i++) {
      const data = generateAllMockData();
      expect(data).toBeDefined();
      
      if (i === iterations - 1 && global.gc) {
        global.gc();
        const memoryUsage = process.memoryUsage().heapUsed;
        
        // Memory usage should not grow exponentially
        if (lastMemoryUsage > 0) {
          const growth = (memoryUsage - lastMemoryUsage) / lastMemoryUsage;
          expect(growth).toBeLessThan(0.5); // Less than 50% growth
        }
        lastMemoryUsage = memoryUsage;
      }
    }
  });
});
