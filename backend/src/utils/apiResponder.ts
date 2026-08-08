import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '@school-mgmt/shared';
import { logger } from '../lib/logger';

interface ResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
}

function getRequestId(res: Response): string {
  return (res.locals.requestId as string) ?? `req_${Date.now()}`;
}

function buildMeta(res: Response): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: getRequestId(res),
    version: '1.0.0',
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  extraMeta?: Record<string, unknown>
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: { ...buildMeta(res), ...extraMeta },
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  const totalPages = Math.ceil(total / limit);
  const paginated: PaginatedResponse<T> = {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
  return sendSuccess(res, paginated);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  if (statusCode >= 500) {
    logger.error(`API error: ${message}`, { code, statusCode });
  }
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
    meta: buildMeta(res),
  };
  return res.status(statusCode).json(response);
}