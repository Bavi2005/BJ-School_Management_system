import { Router } from 'express';
import {
  markAttendance,
  bulkMarkAttendance,
  getClassAttendance,
  getStudentAttendance,
  getTodayAttendance,
  updateAttendance,
  getAttendanceStats,
} from '../controllers/attendance.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@school-mgmt/shared';

const router = Router();

router.use(requireAuth());

router.get('/stats', getAttendanceStats);
router.get('/today', getTodayAttendance);
router.get('/class/:classId', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getClassAttendance);
router.get('/student/:studentId', getStudentAttendance);
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), markAttendance);
router.post('/bulk', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), bulkMarkAttendance);
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateAttendance);

export default router;