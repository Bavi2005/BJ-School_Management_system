import { Router } from 'express';
import {
  listStaff, getStaff, updateStaff, deleteStaff,
  listPayroll, createPayroll, markPayrollPaid,
  listLeaves, createLeave, decideLeave, getHRStats,
} from '../controllers/hr.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', getHRStats);
router.get('/staff', paginationMiddleware, listStaff);
router.get('/staff/:id', getStaff);
router.patch('/staff/:id', isAdmin, updateStaff);
router.delete('/staff/:id', isAdmin, deleteStaff);
router.get('/payroll', paginationMiddleware, listPayroll);
router.post('/payroll', isAdmin, createPayroll);
router.patch('/payroll/:id/paid', isAdmin, markPayrollPaid);
router.get('/leaves', paginationMiddleware, listLeaves);
router.post('/leaves', createLeave);
router.patch('/leaves/:id/decide', isAdmin, decideLeave);

export default router;
