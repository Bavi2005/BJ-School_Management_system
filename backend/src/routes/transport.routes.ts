import { Router } from 'express';
import {
  listRoutes, createRoute, updateRoute, deleteRoute,
  listBuses, createBus, updateBus, deleteBus,
  listAssignments, createAssignment, updateAssignment, deleteAssignment, getTransportStats,
} from '../controllers/transport.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', getTransportStats);
router.get('/routes', listRoutes);
router.post('/routes', isAdmin, createRoute);
router.patch('/routes/:id', isAdmin, updateRoute);
router.delete('/routes/:id', isAdmin, deleteRoute);
router.get('/buses', listBuses);
router.post('/buses', isAdmin, createBus);
router.patch('/buses/:id', isAdmin, updateBus);
router.delete('/buses/:id', isAdmin, deleteBus);
router.get('/assignments', paginationMiddleware, listAssignments);
router.post('/assignments', isAdmin, createAssignment);
router.patch('/assignments/:id', isAdmin, updateAssignment);
router.delete('/assignments/:id', isAdmin, deleteAssignment);

export default router;
