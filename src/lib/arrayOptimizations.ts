/**
 * Optimized array operations to avoid multiple passes and improve performance
 * Follows project rules for explicit TypeScript typing and performance optimization
 */

/**
 * Combines filter and map operations into a single pass
 * @example
 * // Instead of: array.filter(x => x > 0).map(x => x * 2)
 * // Use: filterMap(array, x => x > 0 ? x * 2 : undefined)
 */
export function filterMap<T, R>(
  array: T[],
  fn: (item: T, index: number, array: T[]) => R | undefined
): R[] {
  const result: R[] = [];
  for (let i = 0; i < array.length; i++) {
    const mapped = fn(array[i], i, array);
    if (mapped !== undefined) {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Combines map and filter operations with optional transformation
 * @example
 * // Instead of: array.map(transform).filter(Boolean)
 * // Use: mapFilter(array, transform, Boolean)
 */
export function mapFilter<T, R>(
  array: T[],
  mapFn: (item: T, index: number, array: T[]) => R,
  filterFn: (item: R, index: number) => boolean
): R[] {
  const result: R[] = [];
  for (let i = 0; i < array.length; i++) {
    const mapped = mapFn(array[i], i, array);
    if (filterFn(mapped, i)) {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Groups array elements by a key function
 * More efficient than reduce for grouping operations
 */
export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of array) {
    const key = keyFn(item);
    if (!(key in result)) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

/**
 * Efficiently counts occurrences of items based on a key function
 */
export function countBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, number> {
  const result = {} as Record<K, number>;
  for (const item of array) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

/**
 * Finds unique items based on a key function
 * More efficient than Array.from(new Set(...))
 */
export function uniqueBy<T, K>(
  array: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Partitions an array into two arrays based on a predicate
 * Single pass instead of two filter operations
 */
export function partition<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      truthy.push(array[i]);
    } else {
      falsy.push(array[i]);
    }
  }
  return [truthy, falsy];
}

/**
 * Computes multiple aggregations in a single pass
 */
export function aggregate<T, R extends Record<string, unknown>>(
  array: T[],
  aggregators: {
    [K in keyof R]: (acc: R[K], item: T, index: number) => R[K];
  },
  initialValues: R
): R {
  const result = { ...initialValues };
  for (let i = 0; i < array.length; i++) {
    for (const key in aggregators) {
      result[key] = aggregators[key](result[key], array[i], i);
    }
  }
  return result;
}

/**
 * Efficient array chunking
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Deep clone using structured cloning (when available) or fallback
 * More efficient than JSON.parse(JSON.stringify())
 */
export function deepClone<T>(obj: T): T {
  // Use structuredClone if available (modern browsers)
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fall back if structuredClone fails
    }
  }
  
  // Fallback for simple cases
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (obj instanceof Set) {
    return new Set(Array.from(obj).map(item => deepClone(item))) as T;
  }
  
  if (obj instanceof Map) {
    return new Map(
      Array.from(obj.entries()).map(([k, v]) => [deepClone(k), deepClone(v)])
    ) as T;
  }
  
  // Plain object
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Efficiently flattens nested arrays
 */
export function flatMap<T, R>(
  array: T[],
  fn: (item: T, index: number, array: T[]) => R | R[]
): R[] {
  const result: R[] = [];
  for (let i = 0; i < array.length; i++) {
    const mapped = fn(array[i], i, array);
    if (Array.isArray(mapped)) {
      result.push(...mapped);
    } else {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Memoized array transformation with cache
 */
export function memoizedMap<T, R>(
  array: T[],
  fn: (item: T) => R,
  keyFn: (item: T) => string | number = (item) => JSON.stringify(item)
): R[] {
  const cache = new Map<string | number, R>();
  return array.map(item => {
    const key = keyFn(item);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(item);
    cache.set(key, result);
    return result;
  });
}
