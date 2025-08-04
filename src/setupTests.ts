/*
 * Test setup file: Provides a minimal in-memory implementation of the
 * `localStorage` Web API so that logic depending on it can run inside Vitest’s
 * Node environment.
 *
 * Why is this needed?
 * Vitest runs in Node, which has no `window` nor `localStorage`. Our data-
 * management utilities (DataStorageManager, AnalyticsConfigManager, etc.) use
 * `localStorage` directly, causing every test that touches them to throw
 * `ReferenceError: localStorage is not defined`.
 *
 * Instead of mocking `localStorage` in every individual test file we register
 * a single global stub that satisfies the API surface we use (getItem,
 * setItem, removeItem, clear, key, length). It is backed by an in-memory
 * `Map`, so each test run starts with a clean, empty storage.
 */

import { beforeAll, afterEach } from 'vitest';

// Runs once before any test suites execute
beforeAll(() => {
  // Only register the polyfill if it doesn’t already exist (e.g. jsdom)
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();

    // Define the minimal Storage interface we need
    const localStorageStub: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    } as Storage;

    // Attach to global scope so application code can access it directly
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageStub,
      configurable: true,
    });
  }
});

// Ensure each test starts with a clean slate
afterEach(() => {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.clear();
  }
});
