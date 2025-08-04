/**
 * Standardized error types for the Sensory Compass application
 */

export enum ErrorType {
  // Data errors
  DATA_VALIDATION = 'DATA_VALIDATION',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_CORRUPTED = 'DATA_CORRUPTED',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  
  // Analytics errors
  ANALYTICS_WORKER_FAILURE = 'ANALYTICS_WORKER_FAILURE',
  ANALYTICS_PROCESSING_ERROR = 'ANALYTICS_PROCESSING_ERROR',
  ANALYTICS_INSUFFICIENT_DATA = 'ANALYTICS_INSUFFICIENT_DATA',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // User errors
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: unknown;
  userMessage?: string;
  timestamp: Date;
  recoverable: boolean;
}

export class SensoryCompassError extends Error implements AppError {
  type: ErrorType;
  code?: string;
  details?: unknown;
  userMessage?: string;
  timestamp: Date;
  recoverable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    options?: {
      code?: string;
      details?: unknown;
      userMessage?: string;
      recoverable?: boolean;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SensoryCompassError';
    this.type = type;
    this.code = options?.code;
    this.details = options?.details;
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
    this.timestamp = new Date();
    this.recoverable = options?.recoverable ?? this.isRecoverableError(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.DATA_VALIDATION:
        return 'The data provided is invalid. Please check your input and try again.';
      case ErrorType.DATA_NOT_FOUND:
        return 'The requested data could not be found.';
      case ErrorType.DATA_CORRUPTED:
        return 'The data appears to be corrupted. Please contact support.';
      case ErrorType.STORAGE_QUOTA_EXCEEDED:
        return 'Storage limit exceeded. Please clear some old data and try again.';
      case ErrorType.STORAGE_UNAVAILABLE:
        return 'Storage is currently unavailable. Please try again later.';
      case ErrorType.ANALYTICS_WORKER_FAILURE:
        return 'Analytics processing is temporarily unavailable. Some features may be limited.';
      case ErrorType.ANALYTICS_PROCESSING_ERROR:
        return 'An error occurred while analyzing data. Please try again.';
      case ErrorType.ANALYTICS_INSUFFICIENT_DATA:
        return 'Not enough data available for analysis. Please collect more tracking data.';
      case ErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';
      case ErrorType.TIMEOUT_ERROR:
        return 'The operation took too long. Please try again.';
      case ErrorType.INVALID_INPUT:
        return 'Invalid input provided. Please check your data and try again.';
      case ErrorType.UNAUTHORIZED:
        return 'You are not authorized to perform this action.';
      case ErrorType.CONFIGURATION_ERROR:
        return 'Configuration error detected. Please check your settings.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  private isRecoverableError(type: ErrorType): boolean {
    switch (type) {
      case ErrorType.DATA_CORRUPTED:
      case ErrorType.UNAUTHORIZED:
        return false;
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.ANALYTICS_WORKER_FAILURE:
      case ErrorType.STORAGE_QUOTA_EXCEEDED:
        return true;
      default:
        return true;
    }
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

// Error factory functions for common scenarios
export const createValidationError = (
  field: string,
  value: unknown,
  reason: string
): SensoryCompassError => {
  return new SensoryCompassError(
    ErrorType.DATA_VALIDATION,
    `Validation failed for field '${field}': ${reason}`,
    {
      code: 'VALIDATION_ERROR',
      details: { field, value, reason },
      userMessage: `Invalid ${field}: ${reason}`,
      recoverable: true,
    }
  );
};

export const createStorageError = (
  operation: string,
  cause?: Error
): SensoryCompassError => {
  const isQuotaError = cause?.name === 'QuotaExceededError';
  return new SensoryCompassError(
    isQuotaError ? ErrorType.STORAGE_QUOTA_EXCEEDED : ErrorType.STORAGE_UNAVAILABLE,
    `Storage operation '${operation}' failed`,
    {
      code: isQuotaError ? 'QUOTA_EXCEEDED' : 'STORAGE_ERROR',
      cause,
      recoverable: isQuotaError,
    }
  );
};

export const createAnalyticsError = (
  message: string,
  details?: unknown
): SensoryCompassError => {
  return new SensoryCompassError(
    ErrorType.ANALYTICS_PROCESSING_ERROR,
    message,
    {
      code: 'ANALYTICS_ERROR',
      details,
      recoverable: true,
    }
  );
};

// Type guards
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof Error && 'type' in error && 'timestamp' in error;
};

export const isSensoryCompassError = (error: unknown): error is SensoryCompassError => {
  return error instanceof SensoryCompassError;
};

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError): Promise<void>;
}

export const storageQuotaRecoveryStrategy: ErrorRecoveryStrategy = {
  canRecover(error: AppError): boolean {
    return error.type === ErrorType.STORAGE_QUOTA_EXCEEDED;
  },
  async recover(): Promise<void> {
    // Import dynamically to avoid circular dependencies
    const { storageUtils } = await import('@/lib/storageUtils');
    storageUtils.clearOldTrackingData(7); // Clear data older than 7 days
  },
};
