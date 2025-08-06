/**
 * Global window properties used by the application
 */
declare global {
  interface Window {
    dataLayer?: any[];
    __analyticsWorkerInitLogged?: boolean;
  }
}

export {};
