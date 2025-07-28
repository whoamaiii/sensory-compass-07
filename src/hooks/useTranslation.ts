import { useTranslation as useI18nTranslation } from 'react-i18next';

// Type-safe translation hook with Norwegian context
export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace);
  
  const changeLanguage = (lng: 'nb' | 'en') => {
    i18n.changeLanguage(lng);
    localStorage.setItem('sensoryTracker_language', lng);
  };
  
  const currentLanguage = i18n.language as 'nb' | 'en';
  
  // Helper functions for common translations
  const tCommon = (key: string, options?: any) => t(key, { ns: 'common', ...options });
  const tDashboard = (key: string, options?: any) => t(key, { ns: 'dashboard', ...options });
  const tStudent = (key: string, options?: any) => t(key, { ns: 'student', ...options });
  const tTracking = (key: string, options?: any) => t(key, { ns: 'tracking', ...options });
  const tAnalytics = (key: string, options?: any) => t(key, { ns: 'analytics', ...options });
  const tSettings = (key: string, options?: any) => t(key, { ns: 'settings', ...options });
  
  // Norwegian-specific date formatting
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(currentLanguage === 'nb' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };
  
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat(currentLanguage === 'nb' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return {
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
  };
};