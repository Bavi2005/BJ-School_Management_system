import { Router } from 'express';
import {
  listExams, getExam, createExam, updateExam, deleteExam,
  publishResults, upsertResult,
} from '../controllers/exam.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/', paginationMiddleware, listExams);
router.get('/:id', getExam);
router.post('/', isAdmin, createExam);
router.patch('/:id', isAdmin, updateExam);
router.patch('/:id/publish', isAdmin, publishResults);
router.delete('/:id', isAdmin, deleteExam);
router.post('/:examId/results', upsertResult);

export default router;
