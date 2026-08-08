import { Router } from 'express';
import {
  createFee,
  listFees,
  getFee,
  updateFee,
  deleteFee,
  recordPayment,
  getFeeAccount,
  getFeeStats,
} from '../controllers/fee.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', getFeeStats);
router.get('/', paginationMiddleware, listFees);
router.get('/account/:studentId', getFeeAccount);
router.get('/:id', getFee);
router.post('/', isAdmin, createFee);
router.post('/:id/pay', recordPayment);
router.patch('/:id', isAdmin, updateFee);
router.delete('/:id', isAdmin, deleteFee);

export default router;