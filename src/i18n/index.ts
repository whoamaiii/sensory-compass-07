import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import Norwegian translations
import commonNB from '../locales/nb/common.json';
import dashboardNB from '../locales/nb/dashboard.json';
import studentNB from '../locales/nb/student.json';
import trackingNB from '../locales/nb/tracking.json';
import analyticsNB from '../locales/nb/analytics.json';
import settingsNB from '../locales/nb/settings.json';

// Import English translations
import commonEN from '../locales/en/common.json';
import dashboardEN from '../locales/en/dashboard.json';
import studentEN from '../locales/en/student.json';
import trackingEN from '../locales/en/tracking.json';
import analyticsEN from '../locales/en/analytics.json';
import settingsEN from '../locales/en/settings.json';

const resources = {
  nb: {
    common: commonNB,
    dashboard: dashboardNB,
    student: studentNB,
    tracking: trackingNB,
    analytics: analyticsNB,
    settings: settingsNB,
  },
  en: {
    common: commonEN,
    dashboard: dashboardEN,
    student: studentEN,
    tracking: trackingEN,
    analytics: analyticsEN,
    settings: settingsEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'nb', // Default to Norwegian Bokmål
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'student', 'tracking', 'analytics', 'settings'],
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sensoryTracker_language',
    },
  });

export default i18n;