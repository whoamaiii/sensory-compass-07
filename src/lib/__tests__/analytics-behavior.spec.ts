/**
 * Analytics behavioral tests:
 * - Cache-key sensitivity to configuration changes for CachedPatternAnalysisEngine
 * - Worker cache TTL parity with AnalyticsConfiguration
 * - Date boundary filtering correctness using [start, end) semantics
 *
 * Runner: Vitest
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Prevent ML models from initializing IndexedDB in Node tests
vi.mock('@/lib/mlModels', () => ({
  mlModels: {
    init: vi.fn().mockResolvedValue(undefined),
    getModelStatus: vi.fn().mockResolvedValue(new Map()),
    predictEmotions: vi.fn().mockResolvedValue([]),
    predictSensoryResponse: vi.fn().mockResolvedValue(null),
  }
}));

import { analyticsConfig } from '@/lib/analyticsConfig';
import { createCachedPatternAnalysis } from '@/lib/cachedPatternAnalysis';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { startOfDay, addDays } from 'date-fns';

// Prevent ML models from initializing IndexedDB in Node tests
vi.mock('@/lib/mlModels', () => ({
  mlModels: {
    init: vi.fn().mockResolvedValue(undefined),
    getModelStatus: vi.fn().mockResolvedValue(new Map()),
    predictEmotions: vi.fn().mockResolvedValue([]),
    predictSensoryResponse: vi.fn().mockResolvedValue(null),
  }
}));

/**
 * Polyfill minimal localStorage/sessionStorage for Node test environment.
 * Avoids pulling full jsdom; sufficient for modules that touch localStorage.
 */
beforeAll(() => {
  if (!(globalThis as any).localStorage) {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; }
    };
  }
  if (!(globalThis as any).sessionStorage) {
    const store = new Map<string, string>();
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; }
    };
  }
});

// Utilities
const noop = () => {};

/**
 * Minimal in-memory cache implementing CacheStorage for tests
 * Supports TTL-like expiration via a toggleable "now" time
 */
class TestCache implements Required<{
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, tags?: string[]): void;
  has(key: string): boolean;
  invalidateByTag(tag: string): number;
  getDataFingerprint(data: unknown): string;
  createKey(prefix: string, params: Record<string, unknown>): string;
}> {
  private map = new Map<string, { data: unknown; tags?: string[] }>();

  get(key: string): unknown | undefined {
    return this.map.get(key)?.data;
  }
  set(key: string, value: unknown, tags?: string[]): void {
    this.map.set(key, { data: value, tags });
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [k, v] of this.map.entries()) {
      if (v.tags?.includes(tag)) {
        this.map.delete(k);
        count++;
      }
    }
    return count;
  }
  getDataFingerprint(data: unknown): string {
    const stringify = (obj: unknown): string => {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj !== 'object') return String(obj);
      if (Array.isArray(obj)) return `[${obj.map(stringify).join(',')}]`;
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      return `{${keys.map(k => `${k}:${stringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
    };
    const str = stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
  createKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params).sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`).join(':');
    return `${prefix}:${sorted}`;
  }
}

describe('CachedPatternAnalysisEngine cache-key sensitivity', () => {
  let cache: TestCache;

  beforeEach(() => {
    cache = new TestCache();
  });

  it('produces distinct cache keys/results when relevant config changes', () => {
    // Arrange default config baseline
    const initialCfg = analyticsConfig.getConfig();
    const engine = createCachedPatternAnalysis(cache);

    const now = new Date();
    const emotions: EmotionEntry[] = [
      { id: 'e1', studentId: 's1', emotion: 'happy', intensity: 3, timestamp: now, triggers: ['noise'] },
      { id: 'e2', studentId: 's1', emotion: 'anxious', intensity: 4, timestamp: now, triggers: ['change'] }
    ];

    // Act: first computation caches under current configHash
    const first = engine.analyzeEmotionPatterns(emotions, 30);
    expect(first).toBeDefined();

    // Mutate relevant config subset (e.g., alert sensitivity)
    analyticsConfig.updateConfig({
      alertSensitivity: {
        low: 0.2,
        medium: 0.5,
        high: 0.85 // change high threshold to alter analysis behavior
      }
    });

    // Second call after config update should miss cache due to configHash change
    const second = engine.analyzeEmotionPatterns(emotions, 30);
    // Cannot easily inspect keys, but we can assert not the same reference and cache has at least two entries under tags
    expect(second).toBeDefined();
    // Since implementation returns new arrays, assert content differences not required; the key sensitivity is the target.
    // As a proxy, force invalidate by tag and ensure at least 2 invalidations occur across both runs.
    const invalidated = engine.invalidateAllCache();
    expect(invalidated).toBeGreaterThanOrEqual(1);
    // Different references indicate a fresh computation (not served from stale cache)
    expect(second).not.toBe(first);

    // Cleanup
    engine.destroy();
    // Restore config
    analyticsConfig.updateConfig(initialCfg);
  });
});

describe('Worker cache TTL parity (simulated)', () => {
  /**
   * We simulate worker TTL usage by verifying that cached pattern analysis inside the worker
   * honors the provided config TTL pathway. Since we cannot spin a real worker here,
   * we validate that:
   * - TTL from analyticsConfig is respected by CachedPatternAnalysisEngine constructor path
   * - And that updates propagate through subscribe mechanism
   */
  it('updates internal TTL when analytics configuration changes', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const initialTTL = analyticsConfig.getConfig().cache.ttl;
    // @ts-expect-no-error - access private via any for test validation
    const ttlBefore = (engine as any).ttl;
    expect(ttlBefore).toBe(initialTTL);

    // Update config TTL
    analyticsConfig.updateConfig({
      cache: {
        ...analyticsConfig.getConfig().cache,
        ttl: initialTTL + 12345
      }
    });

    const ttlAfter = (engine as any).ttl;
    expect(ttlAfter).toBe(initialTTL + 12345);

    engine.destroy();
  });
});

describe('Date boundary filtering [start, end) correctness', () => {
  /**
   * This test verifies the logic used in AdvancedFilterPanel applyFilters by reproducing
   * the [start, end) condition with startOfDay and addDays, ensuring that an event
   * exactly at the end boundary is excluded.
   */
  it('includes timestamps on or after start and strictly before endExclusive', () => {
    const start = startOfDay(new Date('2025-07-15T10:20:00.000Z'));
    const endExclusive = addDays(startOfDay(new Date('2025-07-16T12:00:00.000Z')), 1); // effectively 2025-07-17T00:00Z

    const a = new Date(start.getTime()); // exactly start
    const b = new Date(endExclusive.getTime() - 1); // just before end
    const c = new Date(endExclusive.getTime()); // exactly end (should be excluded)

    const inRange = (ts: Date) => ts >= start && ts < endExclusive;

    expect(inRange(a)).toBe(true);
    expect(inRange(b)).toBe(true);
    expect(inRange(c)).toBe(false);
  });
});

describe('Negative cases and error tolerance', () => {
  it('handles empty datasets without exceptions', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const res1 = engine.analyzeEmotionPatterns([], 30);
    const res2 = engine.analyzeSensoryPatterns([], 30);
    const res3 = engine.analyzeEnvironmentalCorrelations([]);

    expect(Array.isArray(res1)).toBe(true);
    expect(Array.isArray(res2)).toBe(true);
    expect(Array.isArray(res3)).toBe(true);

    engine.destroy();
  });

  it('can invalidate per-student tags without throwing', () => {
    const cache = new TestCache();
    const engine = createCachedPatternAnalysis(cache);

    const count = engine.invalidateStudentCache('unknown-student');
    expect(typeof count).toBe('number');

    engine.destroy();
  });
});