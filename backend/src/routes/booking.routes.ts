import { Router } from 'express';
import {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  getBookingStats,
} from '../controllers/booking.controller';
import { requireAuth } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { paginationMiddleware } from '../middleware/pagination';

const router = Router();

router.use(requireAuth());

router.get('/stats', getBookingStats);
router.get('/rooms', paginationMiddleware, listRooms);
router.get('/rooms/:id', getRoom);
router.post('/rooms', isAdmin, createRoom);
router.patch('/rooms/:id', isAdmin, updateRoom);
router.delete('/rooms/:id', isAdmin, deleteRoom);

router.get('/bookings', paginationMiddleware, listBookings);
router.post('/bookings', createBooking);
router.patch('/bookings/:id', updateBooking);
router.delete('/bookings/:id', cancelBooking);

export default router;
