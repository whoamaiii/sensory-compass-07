/**
 * Type declarations for global window object extensions
 */
declare global {
  interface Window {
    __analyticsWorkerInitLogged?: boolean;
  }
}

export {}; // Make this a module
