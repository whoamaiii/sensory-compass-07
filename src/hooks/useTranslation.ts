import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';

// Type-safe translation hook with Norwegian context
export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace);
  
  const changeLanguage = useCallback((lng: 'nb' | 'en') => {
    i18n.changeLanguage(lng);
    localStorage.setItem('sensoryTracker_language', lng);
  }, [i18n]);
  
  const currentLanguage = i18n.language as 'nb' | 'en';
  
  // Helper functions for common translations
  const tCommon = useCallback((key: string, options?: any) => t(key, { ns: 'common', ...options }), [t]);
  const tDashboard = useCallback((key: string, options?: any) => t(key, { ns: 'dashboard', ...options }), [t]);
  const tStudent = useCallback((key: string, options?: any) => t(key, { ns: 'student', ...options }), [t]);
  const tTracking = useCallback((key: string, options?: any) => t(key, { ns: 'tracking', ...options }), [t]);
  const tAnalytics = useCallback((key: string, options?: any) => t(key, { ns: 'analytics', ...options }), [t]);
  const tSettings = useCallback((key: string, options?: any) => t(key, { ns: 'settings', ...options }), [t]);
  
  // Norwegian-specific date formatting
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat(currentLanguage === 'nb' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }, [currentLanguage]);
  
  const formatDateTime = useCallback((date: Date) => {
    return new Intl.DateTimeFormat(currentLanguage === 'nb' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [currentLanguage]);
  
  // Don't include i18n in deps as it can cause infinite loops
  return useMemo(() => ({
    t,
    tCommon,
    tDashboard,
    tStudent,
    tTracking,
    tAnalytics,
    tSettings,
    changeLanguage,
    currentLanguage,
    formatDate,
    formatDateTime,
    i18n,
  }), [t, tCommon, tDashboard, tStudent, tTracking, tAnalytics, tSettings, changeLanguage, currentLanguage, formatDate, formatDateTime]);
};