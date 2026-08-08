import { Router } from 'express';
import {
  createHealthRecord,
  listHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getStudentHealthSummary,
} from '../controllers/health.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';
import { UserRole } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/', paginationMiddleware, listHealthRecords);
router.get('/student/:studentId/summary', getStudentHealthSummary);
router.get('/:id', getHealthRecord);
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), createHealthRecord);
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateHealthRecord);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteHealthRecord);

export default router;