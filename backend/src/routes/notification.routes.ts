import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createAnnouncement,
} from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/', paginationMiddleware, getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/announcement', createAnnouncement);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;