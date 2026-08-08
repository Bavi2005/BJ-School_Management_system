import { Router } from 'express';
import {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  listUpcomingEvents,
} from '../controllers/event.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/upcoming', listUpcomingEvents);
router.get('/', paginationMiddleware, listEvents);
router.get('/:id', getEvent);
router.post('/', isAdmin, createEvent);
router.patch('/:id', isAdmin, updateEvent);
router.delete('/:id', isAdmin, deleteEvent);
router.post('/:id/register', registerForEvent);
router.delete('/:id/register', unregisterFromEvent);

export default router;