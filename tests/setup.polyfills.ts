/**
 * Global storage and window polyfills for Node test environment.
 * Loaded by Vitest via setupFiles in vitest.config.ts before any test imports.
 */
const defineStorage = (targetKey: 'localStorage' | 'sessionStorage') => {
  if (!(globalThis as any)[targetKey]) {
    const store = new Map<string, string>();
    (globalThis as any)[targetKey] = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; }
    };
  }
};

defineStorage('localStorage');
defineStorage('sessionStorage');

// Provide a minimal window shim for tests that reference window.*
// In Node environment, window is undefined by default.
if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis as any;
}