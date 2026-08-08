import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateUserSchema,
} from '@school-mgmt/shared';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), register);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/refresh', authRateLimiter, validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', authRateLimiter, requireAuth(), logout);
router.get('/me', requireAuth(), getMe);
router.patch('/me', requireAuth(), validateBody(updateUserSchema), updateMe);
router.post(
  '/change-password',
  authRateLimiter,
  requireAuth(),
  validateBody(changePasswordSchema),
  changePassword
);

export default router;