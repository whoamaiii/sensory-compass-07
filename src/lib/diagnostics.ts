/**
 * Diagnostic Logger for Debugging
 * Mr. Debugger's specialized diagnostic tool
 */

import { logger } from './logger';

interface DiagnosticInfo {
  timestamp: Date;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  activeTimers?: number;
  activeListeners?: number;
  componentName?: string;
  action?: string;
  data?: unknown;
}

class DiagnosticLogger {
  private static instance: DiagnosticLogger;
  private activeTimers = new Set<number>();
  private activeListeners = new Map<string, number>();
  private diagnosticMode = true;
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Track performance metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.startPerformanceMonitoring();
    }
  }

  static getInstance(): DiagnosticLogger {
    if (!DiagnosticLogger.instance) {
      DiagnosticLogger.instance = new DiagnosticLogger();
    }
    return DiagnosticLogger.instance;
  }

  private startPerformanceMonitoring() {
    // Monitor memory usage every 5 seconds
    this.performanceMonitoringInterval = setInterval(() => {
      const perf = window.performance as PerformanceWithMemory;
      if (this.diagnosticMode && perf.memory) {
        const memInfo = perf.memory;
        const usedMB = (memInfo.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memInfo.totalJSHeapSize / 1048576).toFixed(2);

        logger.info(`[DIAGNOSTIC] Memory Usage: ${usedMB}MB / ${totalMB}MB`);

        // Warning if memory usage is high
        if (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit > 0.9) {
          logger.warn('[DIAGNOSTIC] High memory usage detected!', {
            used: usedMB,
            limit: (memInfo.jsHeapSizeLimit / 1048576).toFixed(2)
          });
        }
      }
    }, 5000);
  }

  logComponentMount(componentName: string) {
    if (!this.diagnosticMode) return;
    
    const info: DiagnosticInfo = {
      timestamp: new Date(),
      componentName,
      action: 'MOUNT',
      activeTimers: this.activeTimers.size,
      activeListeners: Array.from(this.activeListeners.values()).reduce((a, b) => a + b, 0)
    };

    logger.debug('[DIAGNOSTIC] Component Mounted', info);
  }

  logComponentUnmount(componentName: string) {
    if (!this.diagnosticMode) return;
    
    const info: DiagnosticInfo = {
      timestamp: new Date(),
      componentName,
      action: 'UNMOUNT',
      activeTimers: this.activeTimers.size,
      activeListeners: Array.from(this.activeListeners.values()).reduce((a, b) => a + b, 0)
    };

    logger.debug('[DIAGNOSTIC] Component Unmounted', info);
  }

  logUseEffectCleanup(componentName: string, hasCleanup: boolean) {
    if (!this.diagnosticMode) return;
    
    logger.debug('[DIAGNOSTIC] UseEffect Cleanup', {
      componentName,
      hasCleanup,
      timestamp: new Date()
    });

    if (!hasCleanup) {
      logger.warn('[DIAGNOSTIC] Missing cleanup in useEffect!', { componentName });
    }
  }

  logWorkerMessage(workerName: string, messageType: string, data?: unknown) {
    if (!this.diagnosticMode) return;
    
    logger.debug('[DIAGNOSTIC] Worker Message', {
      workerName,
      messageType,
      timestamp: new Date(),
      dataSize: data ? JSON.stringify(data).length : 0
    });
  }

  logWorkerTimeout(workerName: string, timeout: number) {
    if (!this.diagnosticMode) return;
    
    logger.error('[DIAGNOSTIC] Worker Timeout!', {
      workerName,
      timeout,
      timestamp: new Date()
    });
  }

  trackTimer(timerId: number) {
    this.activeTimers.add(timerId);
    logger.debug('[DIAGNOSTIC] Timer Created', { 
      timerId, 
      activeCount: this.activeTimers.size 
    });
  }

  untrackTimer(timerId: number) {
    this.activeTimers.delete(timerId);
    logger.debug('[DIAGNOSTIC] Timer Cleared', { 
      timerId, 
      activeCount: this.activeTimers.size 
    });
  }

  trackEventListener(element: string, event: string) {
    const key = `${element}-${event}`;
    const current = this.activeListeners.get(key) || 0;
    this.activeListeners.set(key, current + 1);
    
    logger.debug('[DIAGNOSTIC] Event Listener Added', {
      element,
      event,
      totalListeners: Array.from(this.activeListeners.values()).reduce((a, b) => a + b, 0)
    });
  }

  untrackEventListener(element: string, event: string) {
    const key = `${element}-${event}`;
    const current = this.activeListeners.get(key) || 0;
    if (current > 0) {
      this.activeListeners.set(key, current - 1);
    }
    
    logger.debug('[DIAGNOSTIC] Event Listener Removed', {
      element,
      event,
      totalListeners: Array.from(this.activeListeners.values()).reduce((a, b) => a + b, 0)
    });
  }

  logAsyncOperation(operationName: string, duration: number, success: boolean) {
    if (!this.diagnosticMode) return;
    
    const logData = {
      operationName,
      duration,
      success,
      timestamp: new Date()
    };

    if (duration > 3000) {
      logger.warn('[DIAGNOSTIC] Slow async operation detected!', logData);
    } else {
      logger.debug('[DIAGNOSTIC] Async operation completed', logData);
    }
  }

  checkForLeaks() {
    if (!this.diagnosticMode) return;
    
    const report = {
      activeTimers: this.activeTimers.size,
      activeListeners: Array.from(this.activeListeners.values()).reduce((a, b) => a + b, 0),
      timestamp: new Date()
    };

    if (report.activeTimers > 10) {
      logger.warn('[DIAGNOSTIC] Potential timer leak detected!', report);
    }

    if (report.activeListeners > 50) {
      logger.warn('[DIAGNOSTIC] Potential event listener leak detected!', report);
    }

    return report;
  }

  setDiagnosticMode(enabled: boolean) {
    this.diagnosticMode = enabled;
    logger.info(`[DIAGNOSTIC] Diagnostic mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  cleanup() {
    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }
  }
}

export const diagnostics = DiagnosticLogger.getInstance();

// Wrap setTimeout and clearTimeout to track timers
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

if (typeof window !== 'undefined') {
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;

  window.setTimeout = function(...args: Parameters<typeof setTimeout>) {
    const timerId = originalSetTimeout.apply(window, args);
    diagnostics.trackTimer(timerId as unknown as number);
    return timerId;
  };

  window.clearTimeout = function(timerId: number) {
    diagnostics.untrackTimer(timerId);
    return originalClearTimeout.call(window, timerId);
  };
}
