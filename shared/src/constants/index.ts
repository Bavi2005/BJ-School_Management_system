export const APP_CONFIG = {
  name: 'EduCore Nexus',
  description: 'AI-Powered School Management System',
  version: '2.0.0',
  apiPrefix: '/api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const JWT_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'school-mgmt-system',
  audience: 'school-mgmt-users',
} as const;

export const GOOGLE_CALENDAR_CONFIG = {
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  defaultTimeZone: 'UTC',
  defaultReminders: [
    { method: 'email' as const, minutes: 24 * 60 },
    { method: 'popup' as const, minutes: 30 },
  ],
} as const;

export const AI_CONFIG = {
  models: {
    performancePrediction: 'performance-prediction-v1',
    attendanceRisk: 'attendance-risk-v1',
    smartScheduling: 'smart-scheduling-v1',
    autoGrading: 'auto-grading-v1',
    chatbot: 'chatbot-v1',
    recommendation: 'recommendation-v1',
    anomalyDetection: 'anomaly-detection-v1',
  },
  confidenceThresholds: {
    high: 0.85,
    medium: 0.65,
    low: 0.4,
  },
  cacheTTL: 3600,
} as const;

export const NOTIFICATION_CONFIG = {
  channels: ['IN_APP', 'EMAIL', 'PUSH'] as const,
  defaultChannels: ['IN_APP'] as const,
  batchSize: 100,
  retryAttempts: 3,
  retryDelay: 5000,
} as const;

export const FILE_UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
} as const;

export const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  NOTIFICATION: 'notification',
  ATTENDANCE_UPDATE: 'attendance_update',
  GRADE_POSTED: 'grade_posted',
  ANNOUNCEMENT: 'announcement',
  CHAT_MESSAGE: 'chat_message',
  TYPING: 'typing',
  PRESENCE: 'presence',
} as const;

export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  CLASS_SCHEDULE: (classId: string) => `class:schedule:${classId}`,
  STUDENT_GRADES: (studentId: string, termId: string) => `student:grades:${studentId}:${termId}`,
  TEACHER_CLASSES: (teacherId: string) => `teacher:classes:${teacherId}`,
  AI_PREDICTION: (model: string, entityId: string) => `ai:prediction:${model}:${entityId}`,
  CALENDAR_EVENTS: (userId: string, start: string, end: string) => `calendar:events:${userId}:${start}:${end}`,
} as const;

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 10 },
  api: { windowMs: 60 * 1000, max: 100 },
  ai: { windowMs: 60 * 1000, max: 20 },
  upload: { windowMs: 60 * 60 * 1000, max: 50 },
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  GOOGLE_AUTH_FAILED: 'GOOGLE_AUTH_FAILED',
  CALENDAR_SYNC_FAILED: 'CALENDAR_SYNC_FAILED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;