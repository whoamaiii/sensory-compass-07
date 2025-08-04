import { AnalyticsManagerService } from './analyticsManager';

let analyticsManagerInstance: AnalyticsManagerService | null = null;

const getAnalyticsManager = async (): Promise<AnalyticsManagerService> => {
  if (!analyticsManagerInstance) {
    const { analyticsManager } = await import('./analyticsManager');
    analyticsManagerInstance = analyticsManager;
  }
  return analyticsManagerInstance;
};

export const lazyAnalyticsManager = {
  getInstance: getAnalyticsManager,
};
