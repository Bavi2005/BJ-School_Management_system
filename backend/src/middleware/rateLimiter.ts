import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@school-mgmt/shared';
import { config } from '../config/env';

export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.api.windowMs,
  max: RATE_LIMITS.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later',
    },
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.ai.windowMs,
  max: config.isDev ? 1000 : RATE_LIMITS.ai.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'AI request limit exceeded. Please try again later',
    },
  },
});