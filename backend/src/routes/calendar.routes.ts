import { Router } from 'express';
import {
  getAuthUrl,
  connectAccount,
  getAccountStatus,
  disconnectAccount,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  syncSchoolEvent,
} from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth());

router.get('/auth-url', getAuthUrl);
router.post('/connect', connectAccount);
router.get('/status', getAccountStatus);
router.post('/disconnect', disconnectAccount);
router.get('/events', listEvents);
router.post('/events', createEvent);
router.patch('/events/:googleEventId', updateEvent);
router.delete('/events/:googleEventId', deleteEvent);
router.post('/sync/:eventId', syncSchoolEvent);

export default router;