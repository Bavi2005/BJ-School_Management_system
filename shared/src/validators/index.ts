import { z } from 'zod';
import {
  UserRole,
  UserStatus,
  AttendanceStatus,
  GradeType,
  EventType,
  NotificationType,
  FeeStatus,
  FeeType,
  HealthRecordType,
  AcademicYearStatus,
  TermType,
} from '../types';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Strong password policy: 8-128 chars, at least one uppercase, lowercase,
// digit, and special character.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

// Roles that can be self-registered by the public. Admins are provisioned
// by existing admins only, never via open registration.
export const PUBLIC_REGISTRATION_ROLES = [UserRole.STUDENT, UserRole.PARENT] as const;

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z
    .nativeEnum(UserRole)
    .refine((role) => PUBLIC_REGISTRATION_ROLES.includes(role as (typeof PUBLIC_REGISTRATION_ROLES)[number]), {
      message: 'Only STUDENT and PARENT roles can self-register',
    })
    .default(UserRole.STUDENT),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().max(500).optional(),
  parentIds: z.array(z.string().uuid()).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.nativeEnum(UserRole),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().max(500).optional(),
  parentIds: z.array(z.string().uuid()).optional(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true, role: true })
  .extend({
    status: z.nativeEnum(UserStatus).optional(),
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

export const academicYearSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.nativeEnum(AcademicYearStatus).default(AcademicYearStatus.UPCOMING),
  description: z.string().max(1000).optional(),
});

export const termSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(TermType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().default(false),
});

export const classSchema = z.object({
  name: z.string().min(1).max(100),
  gradeLevel: z.number().int().min(1).max(12),
  section: z.string().max(10).optional(),
  academicYearId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  roomNumber: z.string().max(20).optional(),
  capacity: z.number().int().positive().default(30),
  description: z.string().max(1000).optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  description: z.string().max(1000).optional(),
  credits: z.number().int().positive().default(1),
  isCore: z.boolean().default(true),
});

export const enrollmentSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  enrollmentDate: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'DROPPED', 'TRANSFERRED', 'GRADUATED']).default('ACTIVE'),
});

export const attendanceSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  date: z.string().datetime(),
  status: z.nativeEnum(AttendanceStatus),
  remarks: z.string().max(500).optional(),
  recordedBy: z.string().uuid(),
});

export const bulkAttendanceSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  date: z.string().datetime(),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.nativeEnum(AttendanceStatus),
    remarks: z.string().max(500).optional(),
  })).min(1),
  recordedBy: z.string().uuid(),
});

export const gradeSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  type: z.nativeEnum(GradeType),
  title: z.string().min(1).max(200),
  maxScore: z.number().positive(),
  score: z.number().min(0),
  weight: z.number().positive().default(1),
  date: z.string().datetime(),
  gradedBy: z.string().uuid(),
  feedback: z.string().max(1000).optional(),
  attachments: z.array(z.string().url()).optional(),
});

export const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.nativeEnum(EventType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().max(500).optional(),
  isAllDay: z.boolean().default(false),
  targetAudience: z.array(z.nativeEnum(UserRole)).optional(),
  classIds: z.array(z.string().uuid()).optional(),
  requiresRegistration: z.boolean().default(false),
  maxParticipants: z.number().int().positive().optional(),
  googleCalendarSync: z.boolean().default(true),
});

export const notificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH'])).default(['IN_APP']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const feeSchema = z.object({
  studentId: z.string().uuid(),
  feeType: z.nativeEnum(FeeType),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  description: z.string().max(1000).optional(),
  discountAmount: z.number().min(0).default(0),
  discountReason: z.string().max(500).optional(),
});

export const paymentSchema = z.object({
  feeId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'ONLINE']),
  transactionId: z.string().max(100).optional(),
  paidAt: z.string().datetime().optional(),
  receiptNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export const healthRecordSchema = z.object({
  studentId: z.string().uuid(),
  type: z.nativeEnum(HealthRecordType),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  date: z.string().datetime(),
  recordedBy: z.string().uuid(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  isConfidential: z.boolean().default(false),
  attachments: z.array(z.string().url()).optional(),
  followUpDate: z.string().datetime().optional(),
  followUpNotes: z.string().max(1000).optional(),
});

export const timetableSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  roomNumber: z.string().max(20).optional(),
  isRecurring: z.boolean().default(true),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
});

export const aiPredictionRequestSchema = z.object({
  modelType: z.enum([
    'PERFORMANCE_PREDICTION',
    'ATTENDANCE_RISK',
    'SMART_SCHEDULING',
    'AUTO_GRADING',
    'CHATBOT',
    'RECOMMENDATION',
    'ANOMALY_DETECTION',
  ]),
  entityId: z.string().uuid(),
  context: z.record(z.unknown()).optional(),
});

export const chatMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  context: z.record(z.unknown()).optional(),
});

export const googleCalendarSyncSchema = z.object({
  eventId: z.string().uuid(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  calendarId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AcademicYearInput = z.infer<typeof academicYearSchema>;
export type TermInput = z.infer<typeof termSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type FeeInput = z.infer<typeof feeSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type HealthRecordInput = z.infer<typeof healthRecordSchema>;
export type TimetableInput = z.infer<typeof timetableSchema>;
export type AIPredictionRequest = z.infer<typeof aiPredictionRequestSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type GoogleCalendarSyncInput = z.infer<typeof googleCalendarSyncSchema>;