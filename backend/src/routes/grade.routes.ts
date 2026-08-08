import { Router } from 'express';
import {
  createGrade,
  listGrades,
  getGrade,
  updateGrade,
  deleteGrade,
  getStudentGrades,
  getStudentTranscript,
  bulkCreateGrades,
} from '../controllers/grade.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';
import { UserRole } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/', paginationMiddleware, listGrades);
router.get('/student/:studentId', getStudentGrades);
router.get('/student/:studentId/transcript', getStudentTranscript);
router.get('/:id', getGrade);
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), createGrade);
router.post('/bulk', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), bulkCreateGrades);
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateGrade);
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), deleteGrade);

export default router;