export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum AcademicYearStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TermType {
  SEMESTER = 'SEMESTER',
  TRIMESTER = 'TRIMESTER',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  HALF_DAY = 'HALF_DAY',
}

export enum GradeType {
  ASSIGNMENT = 'ASSIGNMENT',
  QUIZ = 'QUIZ',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  PROJECT = 'PROJECT',
  PARTICIPATION = 'PARTICIPATION',
  OTHER = 'OTHER',
}

export enum EventType {
  ACADEMIC = 'ACADEMIC',
  SPORTS = 'SPORTS',
  CULTURAL = 'CULTURAL',
  MEETING = 'MEETING',
  HOLIDAY = 'HOLIDAY',
  EXAM = 'EXAM',
  OTHER = 'OTHER',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  GRADE_POSTED = 'GRADE_POSTED',
  ATTENDANCE_ALERT = 'ATTENDANCE_ALERT',
  FEE_DUE = 'FEE_DUE',
  EVENT_REMINDER = 'EVENT_REMINDER',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum FeeStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
  REFUNDED = 'REFUNDED',
}

export enum FeeType {
  TUITION = 'TUITION',
  TRANSPORT = 'TRANSPORT',
  HOSTEL = 'HOSTEL',
  UNIFORM = 'UNIFORM',
  BOOKS = 'BOOKS',
  EXAM = 'EXAM',
  ACTIVITY = 'ACTIVITY',
  OTHER = 'OTHER',
}

export enum HealthRecordType {
  GENERAL = 'GENERAL',
  VACCINATION = 'VACCINATION',
  ALLERGY = 'ALLERGY',
  MEDICATION = 'MEDICATION',
  INJURY = 'INJURY',
  ILLNESS = 'ILLNESS',
  CHECKUP = 'CHECKUP',
}

export enum AIModelType {
  PERFORMANCE_PREDICTION = 'PERFORMANCE_PREDICTION',
  ATTENDANCE_RISK = 'ATTENDANCE_RISK',
  SMART_SCHEDULING = 'SMART_SCHEDULING',
  AUTO_GRADING = 'AUTO_GRADING',
  CHATBOT = 'CHATBOT',
  RECOMMENDATION = 'RECOMMENDATION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  version?: number;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: string[];
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

export interface AIPredictionResult {
  modelType: AIModelType;
  prediction: number | string | Record<string, unknown>;
  confidence: number;
  factors: Record<string, number>;
  explanation: string;
  generatedAt: string;
}

export interface AIServiceResponse<T = AIPredictionResult> {
  success: boolean;
  data: T;
  meta?: {
    generatedAt?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}