import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth(), getDashboardStats);

export default router;