import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { UserRole, JWTPayload, TokenPair } from '@school-mgmt/shared';
import { AuthError } from '../utils/AppError';
import { createLogger } from '../lib/logger';

const log = createLogger('auth');

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  signAccessToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'school-mgmt-system',
      audience: 'school-mgmt-users',
    };
    return jwt.sign(payload, config.jwt.accessSecret, options);
  }

  signRefreshToken(userId: string): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'school-mgmt-system',
      audience: 'school-mgmt-users',
    };
    return jwt.sign({ sub: userId }, config.jwt.refreshSecret, options);
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.accessSecret, {
        issuer: 'school-mgmt-system',
        audience: 'school-mgmt-users',
      }) as JWTPayload;
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw new AuthError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new AuthError('Invalid access token', 'TOKEN_INVALID');
    }
  }

  verifyRefreshToken(token: string): { sub: string } {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'school-mgmt-system',
        audience: 'school-mgmt-users',
      }) as { sub: string };
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw new AuthError('Refresh token has expired', 'TOKEN_EXPIRED');
      }
      throw new AuthError('Invalid refresh token', 'TOKEN_INVALID');
    }
  }

  buildTokenPair(user: { id: string; email: string; role: UserRole; permissions: string[] }): TokenPair {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      version: 1,
    };
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(user.id),
      expiresIn: 15 * 60,
    };
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

export const authService = AuthService.getInstance();