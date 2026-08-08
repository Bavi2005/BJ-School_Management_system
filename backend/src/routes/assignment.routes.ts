import { Router } from 'express';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
  listSubmissions,
  getMySubmissions,
} from '../controllers/assignment.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';
import { UserRole } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/', paginationMiddleware, listAssignments);
router.get('/my-submissions', getMySubmissions);
router.get('/:id', getAssignment);
router.get('/:id/submissions', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), listSubmissions);
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), createAssignment);
router.post('/:id/submit', requireRole(UserRole.STUDENT), submitAssignment);
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateAssignment);
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), deleteAssignment);
router.post('/submissions/:submissionId/grade', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), gradeSubmission);

export default router;