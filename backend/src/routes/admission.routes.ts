import { Router } from 'express';
import {
  listApplications, getApplication, createApplication, updateApplicationStatus,
  acceptApplication, deleteApplication, getAdmissionStats,
} from '../controllers/admission.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', isAdmin, getAdmissionStats);
router.get('/', isAdmin, paginationMiddleware, listApplications);
router.get('/:id', isAdmin, getApplication);
router.post('/', createApplication);
router.patch('/:id/status', isAdmin, updateApplicationStatus);
router.post('/:id/accept', isAdmin, acceptApplication);
router.delete('/:id', isAdmin, deleteApplication);

export default router;
