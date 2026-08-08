import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import {
  RegisterInput,
  CreateUserInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  UserRole,
} from '@school-mgmt/shared';
import { logger } from '../lib/logger';
import { cache } from '../lib/cache';

// Store only a SHA-256 hash of refresh tokens so a DB leak cannot be used
// to forge sessions.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    throw AppError.conflict('A user with this email already exists');
  }

  const user = await UserService.createUser({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role ?? UserRole.STUDENT,
    phone: input.phone,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
    address: input.address,
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'OTHER',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 255),
    },
  });

  sendCreated(res, user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.password) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const isValid = await authService.verifyPassword(password, user.password);
  if (!isValid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  if (user.status !== 'ACTIVE') {
    throw AppError.forbidden('Account is not active');
  }

  const permissions = await UserService.getPermissions(user.id);
  const tokens = authService.buildTokenPair({
    id: user.id,
    email: user.email,
    role: user.role as unknown as UserRole,
    permissions,
  });

  await prisma.refreshToken.create({
    data: {
      token: hashRefreshToken(tokens.refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 255),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    tokens,
    permissions,
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body as RefreshTokenInput;

  const payload = authService.verifyRefreshToken(token);
  const tokenHash = hashRefreshToken(token);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!storedToken || storedToken.revokedAt) {
    // Attempting to reuse a revoked token is a strong indicator of theft.
    // Invalidate the entire token family for that user.
    if (storedToken?.replacedByToken) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      logger.warn('Refresh token reuse detected; revoking token family', {
        userId: storedToken.userId,
      });
    }
    throw AppError.unauthorized('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token expired');
  }

  const user = await prisma.user.findUnique({
    where: { id: storedToken.userId },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw AppError.unauthorized('User account is not active');
  }

  const permissions = await UserService.getPermissions(user.id);
  const tokens = authService.buildTokenPair({
    id: user.id,
    email: user.email,
    role: user.role as unknown as UserRole,
    permissions,
  });

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date(), replacedByToken: tokens.refreshToken },
    }),
    prisma.refreshToken.create({
      data: {
        token: hashRefreshToken(tokens.refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 255),
      },
    }),
  ]);

  sendSuccess(res, { tokens, permissions });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body?.refreshToken;

  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token: hashRefreshToken(String(token)) },
      data: { revokedAt: new Date() },
    });
  }

  if (req.userId) {
    await prisma.activityLog.create({
      data: {
        userId: req.userId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: req.userId,
        ipAddress: req.ip,
      },
    });
  }

  sendSuccess(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const user = await UserService.getProfileWithDetails(req.userId);
  if (!user) throw AppError.notFound('User not found');
  sendSuccess(res, user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.password) {
    throw AppError.badRequest('This account does not have a password set');
  }

  const isValid = await authService.verifyPassword(currentPassword, user.password);
  if (!isValid) {
    throw AppError.badRequest('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw AppError.badRequest('New password must be different from current password');
  }

  const hashed = await authService.hashPassword(newPassword);
  await prisma.user.update({
    where: { id: req.userId },
    data: { password: hashed, passwordChangedAt: new Date() },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: req.userId },
    data: { revokedAt: new Date() },
  });

  // Invalidate all other active sessions by bumping the token version.
  await cache.increment(`auth:token-version:${req.userId}`);

  sendSuccess(res, { message: 'Password changed successfully' });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { firstName, lastName, phone, address, bio, avatarUrl } = req.body;
  const user = await UserService.updateUser(req.userId, {
    firstName,
    lastName,
    phone,
    address,
    bio,
    avatarUrl,
  });
  sendSuccess(res, user);
});

export const oauthGoogleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw AppError.badRequest('Missing authorization code');
  }

  logger.warn('Google OAuth callback - implement GoogleAuthService');
  throw AppError.serviceUnavailable('Google OAuth is not fully configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
});