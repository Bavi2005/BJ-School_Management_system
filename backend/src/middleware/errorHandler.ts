import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logger } from '../lib/logger';
import { sendError } from '../utils/apiResponder';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const details = err.errors.reduce(
      (acc, e) => {
        const path = e.path.join('.');
        acc[path] = e.message;
        return acc;
      },
      {} as Record<string, string>
    );
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', details);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Database validation failed');
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  logger.error('Unhandled error:', { error: err, stack: (err as Error).stack });

  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case 'P2002':
      sendError(res, 409, 'CONFLICT', 'A record with this value already exists');
      break;
    case 'P2003':
      sendError(res, 400, 'BAD_REQUEST', 'Referenced record does not exist');
      break;
    case 'P2025':
      sendError(res, 404, 'NOT_FOUND', 'Record not found');
      break;
    default:
      logger.error('Prisma error:', { code: err.code, message: err.message });
      sendError(res, 500, 'DATABASE_ERROR', 'Database error occurred');
  }
}