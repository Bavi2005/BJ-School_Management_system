import { Router } from 'express';
import { listUsers, getUser, createUser, updateUser, deleteUser, getUserActivity } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin, requireRole } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';
import { validateBody, validateQuery } from '../middleware/validate';
import { UserRole, updateUserSchema, createUserSchema } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/', isAdmin, paginationMiddleware, listUsers);
router.post('/', isAdmin, validateBody(createUserSchema), createUser);
router.get('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), getUser);
router.get('/:id/activity', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), paginationMiddleware, getUserActivity);
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), validateBody(updateUserSchema), updateUser);
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN), deleteUser);

export default router;