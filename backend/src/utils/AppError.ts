import { HTTP_STATUS, ERROR_CODES } from '@school-mgmt/shared';

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface AppErrorOptions {
  statusCode?: number;
  code?: ErrorCode;
  details?: Record<string, unknown>;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = options.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.code = options.code ?? ERROR_CODES.INTERNAL_ERROR;
    this.details = options.details;
    this.isOperational = options.isOperational ?? this.statusCode < 500;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, details });
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED });
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError(message, { statusCode: 403, code: ERROR_CODES.FORBIDDEN });
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, { statusCode: 404, code: ERROR_CODES.NOT_FOUND });
  }

  static conflict(message: string): AppError {
    return new AppError(message, { statusCode: 409, code: ERROR_CODES.CONFLICT });
  }

  static rateLimited(message = 'Too many requests, please try again later'): AppError {
    return new AppError(message, { statusCode: 429, code: ERROR_CODES.RATE_LIMITED });
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, { statusCode: 500, code: ERROR_CODES.INTERNAL_ERROR });
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): AppError {
    return new AppError(message, { statusCode: 503, code: ERROR_CODES.SERVICE_UNAVAILABLE });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { statusCode: 422, code: ERROR_CODES.VALIDATION_ERROR, details });
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(message, { statusCode: 401, code });
    this.name = 'AuthError';
  }
}

export class CalendarError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.CALENDAR_SYNC_FAILED) {
    super(message, { statusCode: 502, code });
    this.name = 'CalendarError';
  }
}

export class AIServiceError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 502, code: ERROR_CODES.AI_SERVICE_ERROR });
    this.name = 'AIServiceError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 500, code: ERROR_CODES.DATABASE_ERROR });
    this.name = 'DatabaseError';
  }
}