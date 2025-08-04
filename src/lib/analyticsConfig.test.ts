import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsConfig, AnalyticsConfiguration } from './analyticsConfig';

describe('AnalyticsConfiguration', () => {
  beforeEach(() => {
    // Reset to default config before each test
    analyticsConfig.resetToDefaults();
  });

  it('should have a default configuration', () => {
    const config = analyticsConfig.getConfig();
    expect(config).toBeDefined();
    expect(config.timeWindows.defaultAnalysisDays).toBe(30);
  });

  it('should update the configuration', () => {
    const config = analyticsConfig.getConfig();
    const newTimeWindows = { ...config.timeWindows, defaultAnalysisDays: 60, shortTermDays: 5 };
    analyticsConfig.updateConfig({ timeWindows: newTimeWindows });
    const updatedConfig = analyticsConfig.getConfig();
    expect(updatedConfig.timeWindows.defaultAnalysisDays).toBe(60);
    expect(updatedConfig.timeWindows.shortTermDays).toBe(5);
  });

  it('should subscribe to configuration changes', () => {
    const subscriber = vi.fn();
    analyticsConfig.subscribe(subscriber);

    const config = analyticsConfig.getConfig();
    const newPatternAnalysis = { ...config.patternAnalysis, minDataPoints: 20 };
    analyticsConfig.updateConfig({ patternAnalysis: newPatternAnalysis });

    expect(subscriber).toHaveBeenCalledTimes(1);
    const newConfig = subscriber.mock.calls[0][0] as AnalyticsConfiguration;
    expect(newConfig.patternAnalysis.minDataPoints).toBe(20);
  });

  it('should unsubscribe from configuration changes', () => {
    const subscriber = vi.fn();
    const unsubscribe = analyticsConfig.subscribe(subscriber);
    
    unsubscribe();
    
    const config = analyticsConfig.getConfig();
    analyticsConfig.updateConfig({ timeWindows: { ...config.timeWindows, defaultAnalysisDays: 90 } });
    
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should reset to default configuration', () => {
    const config = analyticsConfig.getConfig();
    analyticsConfig.updateConfig({ timeWindows: { ...config.timeWindows, defaultAnalysisDays: 100 } });
    analyticsConfig.resetToDefaults();
    const newConfig = analyticsConfig.getConfig();
    expect(newConfig.timeWindows.defaultAnalysisDays).toBe(30);
  });
});