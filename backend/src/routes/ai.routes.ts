import { Router } from 'express';
import {
  predictPerformance,
  predictAttendanceRisk,
  generateSchedule,
  autoGrade,
  chat,
  generateRecommendations,
  detectAnomalies,
  getChatHistory,
  checkHealth,
} from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/health', checkHealth);
router.get('/chat/history', requireAuth(), getChatHistory);

router.use(requireAuth(), aiRateLimiter);

router.post('/predict/performance', predictPerformance);
router.post('/predict/attendance-risk', predictAttendanceRisk);
router.post('/schedule/generate', generateSchedule);
router.post('/grade/auto', autoGrade);
router.post('/chat/message', chat);
router.post('/recommend/generate', generateRecommendations);
router.post('/detect/anomalies', detectAnomalies);

export default router;