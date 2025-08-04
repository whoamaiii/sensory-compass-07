# Critical Fixes Needed for Development

## Priority 1: Memory Leaks (Can crash the app)

### 1. Missing Event Listener Cleanup in TimelineVisualization.tsx

**File:** `src/components/TimelineVisualization.tsx`  
**Lines:** 268-269

**Problem:** Event listeners added without cleanup
```javascript
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
```

**Fix:** Store cleanup in useEffect
```javascript
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => { /* ... */ };
  const handleMouseUp = () => { /* ... */ };
  
  // Add listeners
  if (isDragging) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  // Cleanup
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDragging]);
```

### 2. Worker Not Properly Terminated

**File:** `src/hooks/useAnalyticsWorker.ts`  
**Issue:** Worker cleanup happens but may have race conditions

**Quick Fix:** Add null check and clear all references
```javascript
return () => {
  if (workerRef.current) {
    workerRef.current.terminate();
    workerRef.current = null;
  }
  if (idleCallbackRef.current) {
    cancelIdleCallback(idleCallbackRef.current);
    idleCallbackRef.current = null;
  }
  if (watchdogRef.current) {
    clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }
};
```

### 3. Multiple setInterval without cleanup

**Files with issues:**
- `src/components/TimelineVisualization.tsx` (lines 276, 294)
- `src/components/MockDataLoader.tsx` (lines 30, 67)

**Template Fix:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // your code
  }, 1000);
  
  return () => clearInterval(interval); // MUST HAVE THIS
}, [dependencies]);
```

## Priority 2: Security Vulnerabilities

### Fix npm vulnerabilities (Run these commands):
```bash
# Try automatic fixes first
npm audit fix

# For high severity that can't be auto-fixed:
npm update @tensorflow/tfjs@latest
npm update vite@latest
npm update eslint@latest
```

## Priority 3: TypeScript Configuration

### Create a new tsconfig for scripts
**File:** `tsconfig.scripts.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2022",
    "outDir": "./dist/scripts"
  },
  "include": [
    "scripts/**/*.ts",
    "tailwind.config.ts",
    "vite.config.ts",
    "vitest.config.ts",
    "tests/**/*.ts"
  ]
}
```

### Update main tsconfig.json
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.scripts.json" }
  ],
  // ... rest of config
}
```

## Priority 4: React Hook Dependencies

### Most Critical Hook Fix
**File:** `src/hooks/useAnalyticsWorker.ts`  
**Line:** 235

Change:
```javascript
}, [cache]);
```

To:
```javascript
}, [cache, extractTagsFromData]);
```

## Quick Fix Script

Here's a script to fix the most critical issues:

```bash
#!/bin/bash

# 1. Fix npm vulnerabilities
echo "Fixing npm vulnerabilities..."
npm audit fix

# 2. Update critical packages
echo "Updating critical packages..."
npm update vite@latest
npm update @tensorflow/tfjs@latest

# 3. Create tsconfig.scripts.json
echo "Creating tsconfig.scripts.json..."
cat > tsconfig.scripts.json << EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2022",
    "outDir": "./dist/scripts"
  },
  "include": [
    "scripts/**/*.ts",
    "tailwind.config.ts",
    "vite.config.ts",
    "vitest.config.ts",
    "tests/**/*.ts"
  ]
}
EOF

# 4. Test the build
echo "Testing build..."
npm run build

echo "Critical fixes applied! Check for any build errors above."
```

## What to do NOW:

1. **First:** Fix the memory leaks in `TimelineVisualization.tsx` - these are the most dangerous
2. **Second:** Run `npm audit fix` to fix security issues
3. **Third:** Add the TypeScript config for scripts
4. **Fourth:** Fix the React hook dependencies one by one

These fixes will prevent:
- Memory leaks that could crash the browser
- Security vulnerabilities being exploited
- Build errors in production
- Unexpected behavior from stale closures
