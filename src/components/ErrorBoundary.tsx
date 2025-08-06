/**
 * @fileoverview ErrorBoundary - React error boundary for graceful error handling
 * 
 * Provides a fallback UI when React components throw errors during rendering,
 * lifecycle methods, or in constructors. Prevents the entire app from crashing.
 * 
 * Features:
 * - Custom fallback UI
 * - Automatic recovery after multiple errors
 * - Development-mode error details
 * - Toast notifications
 * - Centralized error logging
 * 
 * @module components/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { handleErrorBoundaryError } from '@/lib/errorHandler';

/**
 * Props for the ErrorBoundary component
 */
interface Props {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional callback function called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show toast notifications on error (default: true) */
  showToast?: boolean;
}

/**
 * State for the ErrorBoundary component
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object */
  error?: Error;
  /** Additional error information from React */
  errorInfo?: ErrorInfo;
  /** Count of errors caught (used for auto-recovery) */
  errorCount: number;
}

/**
 * ErrorBoundary Component
 * 
 * A React error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 * 
 * @class
 * @extends {Component<Props, State>}
 */
export class ErrorBoundary extends Component<Props, State> {
  /** Timeout ID for auto-recovery mechanism */
  private resetTimeoutId: NodeJS.Timeout | null = null;
  
  /** Initial component state */
  public state: State = {
    hasError: false,
    errorCount: 0
  };

  /**
   * Static lifecycle method that updates state when an error is thrown.
   * Called during the "render" phase, so side effects are not permitted.
   * 
   * @static
   * @param {Error} error - The error that was thrown
   * @returns {Pick<State, 'hasError' | 'error'>} New state values
   */
  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error has been thrown by a descendant.
   * Used for error logging and side effects.
   * 
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Object with componentStack key containing info about which component threw the error
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use the logger service for proper error tracking
    // This respects environment configuration and doesn't log to console in production
    logger.error('[ErrorBoundary] Component error caught', {
      error: {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      route: typeof window !== 'undefined' ? window.location?.pathname : 'unknown',
      timestamp: new Date().toISOString(),
    });

    // Use centralized error handler
    handleErrorBoundaryError(error, errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-reset after 3 errors to prevent infinite loops
    if (this.state.errorCount >= 2) {
      this.scheduleAutoReset();
    }

    // Only show toast if explicitly enabled (default is true for backward compatibility)
    if (this.props.showToast !== false) {
      // Use built-in toast system if available; also emit a dev-only minimal toast payload
      try {
        toast.error('An unexpected error occurred', {
          description: import.meta.env.DEV && this.state.error
            ? `DEV: ${this.state.error.name}: ${this.state.error.message}`
            : 'Please try again or refresh the page.',
          action: {
            label: 'Dismiss',
            onClick: () => {}
          }
        });
      } catch {
        // no-op; avoid crashing when toast system not mounted
      }
    }
  }

  /**
   * Schedules an automatic reset of the error boundary after multiple errors.
   * This prevents infinite error loops by giving the app a chance to recover.
   * 
   * @private
   */
  private scheduleAutoReset = () => {
    // Clear any existing timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    // Schedule auto-reset after 5 seconds
    this.resetTimeoutId = setTimeout(() => {
      this.handleRetry();
      toast('Page automatically refreshed after multiple errors');
    }, 5000);
  };

  /**
   * Cleanup method called when the component is unmounting.
   * Ensures no memory leaks from pending timeouts.
   */
  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. The application may not be working correctly.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload} 
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              {this.state.errorCount >= 3 && (
                <p className="text-xs text-muted-foreground">
                  Auto-refreshing in 5 seconds...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}