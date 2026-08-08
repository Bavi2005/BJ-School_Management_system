import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';
import { getUserPermissions } from '../services/permission.service';
import { cache } from '../lib/cache';
import { UserRole, JWTPayload } from '@school-mgmt/shared';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: UserRole;
      permissions?: string[];
      token?: string;
    }
  }
}

export function authenticate(required = true) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        if (required) {
          throw AppError.unauthorized('No token provided');
        }
        return next();
      }

      const token = authHeader.split(' ')[1];
      const payload = authService.verifyAccessToken(token);

      // Reject tokens issued before a password change (session invalidation).
      const versionKey = `auth:token-version:${payload.sub}`;
      const tokenVersion = await cache.get<number>(versionKey);
      if (tokenVersion != null && (payload.version ?? 0) < tokenVersion) {
        throw AppError.unauthorized('Session has been revoked');
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, status: true },
      });

      if (!user) {
        throw AppError.unauthorized('User no longer exists');
      }

      if (user.status !== 'ACTIVE') {
        throw AppError.forbidden(`Account is ${user.status.toLowerCase()}`);
      }

      req.userId = user.id;
      req.userEmail = user.email;
      req.userRole = user.role as unknown as UserRole;
      req.token = token;

      const cacheKey = `user:permissions:${user.id}`;
      const permissions = await cache.remember(cacheKey, () => getUserPermissions(user.id));
      req.permissions = Array.isArray(permissions) ? permissions : [];

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth() {
  return authenticate(true);
}

export function optionalAuth() {
  return authenticate(false);
}