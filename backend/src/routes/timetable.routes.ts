import { Router } from 'express';
import {
  getClassTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  checkConflicts,
} from '../controllers/timetable.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin, requireRole } from '../middleware/rbac';
import { UserRole } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/class/:classId', getClassTimetable);
router.get('/teacher/:teacherId', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getTeacherTimetable);
router.get('/student', getStudentTimetable);
router.post('/conflicts', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), checkConflicts);
router.post('/', isAdmin, createTimetableEntry);
router.patch('/:id', isAdmin, updateTimetableEntry);
router.delete('/:id', isAdmin, deleteTimetableEntry);

export default router;