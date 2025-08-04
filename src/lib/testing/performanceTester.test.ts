import { describe, it, expect } from 'vitest';

function trainToyModel(iterations = 5000): { avg: number; timeMs: number } {
  // Simple computation loop to emulate "work"
  const start = performance.now();
  let sum = 0;
  for (let i = 1; i <= iterations; i++) {
    sum += Math.sin(i) * Math.cos(i / 2);
  }
  const timeMs = performance.now() - start;
  const avg = sum / iterations;
  return { avg, timeMs };
}

describe('performanceTester', () => {
  it('completes toy workload under threshold', () => {
    const { avg, timeMs } = trainToyModel(10000);
    // Basic sanity check on result and crude perf threshold
    expect(Number.isFinite(avg)).toBe(true);

    // CI threshold gate: fail if slower than 1500ms
    const THRESHOLD_MS = Number(process.env.CI_PERF_THRESHOLD_MS || 1500);
    expect(timeMs).toBeLessThan(THRESHOLD_MS);
  });
});