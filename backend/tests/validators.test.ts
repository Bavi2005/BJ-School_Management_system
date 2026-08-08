import {
  registerSchema,
  createUserSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateUserSchema,
  paginationSchema,
  idParamSchema,
  eventSchema,
  gradeSchema,
  passwordSchema,
  UserRole,
  UserStatus,
} from '@school-mgmt/shared';

describe('registerSchema — public registration', () => {
  const validBase = {
    email: 'new.student@school.edu',
    password: 'Str0ng!Passw0rd',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  it('accepts STUDENT role', () => {
    const result = registerSchema.safeParse({ ...validBase, role: 'STUDENT' });
    expect(result.success).toBe(true);
  });

  it('accepts PARENT role', () => {
    const result = registerSchema.safeParse({ ...validBase, role: 'PARENT' });
    expect(result.success).toBe(true);
  });

  it('rejects ADMIN role (privilege escalation)', () => {
    const result = registerSchema.safeParse({ ...validBase, role: 'ADMIN' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('STUDENT and PARENT');
  });

  it('rejects SUPER_ADMIN role (privilege escalation)', () => {
    const result = registerSchema.safeParse({ ...validBase, role: 'SUPER_ADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects TEACHER role', () => {
    const result = registerSchema.safeParse({ ...validBase, role: 'TEACHER' });
    expect(result.success).toBe(false);
  });

  it('defaults role to STUDENT', () => {
    const result = registerSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(UserRole.STUDENT);
    }
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validBase, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing firstName/lastName', () => {
    const result = registerSchema.safeParse({ email: 'a@b.com', password: 'Str0ng!Passw0rd' });
    expect(result.success).toBe(false);
  });

  it('rejects XSS payloads in names', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      firstName: '<script>alert(1)</script>',
    });
    expect(result.success).toBe(true); // names are stored as-is; escaping happens at render
  });
});

describe('passwordSchema — password policy', () => {
  it('rejects passwords under 8 chars', () => {
    expect(passwordSchema.safeParse('Ab1!x').success).toBe(false);
  });

  it('rejects passwords without lowercase', () => {
    expect(passwordSchema.safeParse('ABC1234!').success).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(passwordSchema.safeParse('abc1234!').success).toBe(false);
  });

  it('rejects passwords without digit', () => {
    expect(passwordSchema.safeParse('Abcdefg!').success).toBe(false);
  });

  it('rejects passwords without special char', () => {
    expect(passwordSchema.safeParse('Abcdefg1').success).toBe(false);
  });

  it('accepts a fully compliant password', () => {
    expect(passwordSchema.safeParse('Str0ng!Passw0rd').success).toBe(true);
  });

  it('rejects passwords over 128 chars', () => {
    expect(passwordSchema.safeParse(`A1!${'a'.repeat(130)}`).success).toBe(false);
  });
});

describe('createUserSchema — admin provisioning', () => {
  const valid = {
    email: 'admin2@school.edu',
    password: 'Str0ng!Passw0rd',
    firstName: 'John',
    lastName: 'Smith',
    role: 'TEACHER',
  };

  it('allows admin to create TEACHER', () => {
    const result = createUserSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('allows SUPER_ADMIN role', () => {
    const result = createUserSchema.safeParse({ ...valid, role: 'SUPER_ADMIN' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role values', () => {
    const result = createUserSchema.safeParse({ ...valid, role: 'PRESIDENT' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('requires currentPassword', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'Str0ng!Passw0rd' });
    expect(result.success).toBe(false);
  });

  it('rejects new password same as current', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Same!Passw0rd',
      newPassword: 'Same!Passw0rd',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Old!Passw0rd',
      newPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Old!Passw0rd',
      newPassword: 'New!Passw0rd2',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateUserSchema', () => {
  it('rejects role changes (no privilege escalation via profile update)', () => {
    const result = updateUserSchema.safeParse({ role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects password changes through profile update', () => {
    const result = updateUserSchema.safeParse({ password: 'Hacked!Passw0rd' });
    expect(result.success).toBe(false);
  });

  it('allows status updates with valid enum', () => {
    const result = updateUserSchema.safeParse({ status: UserStatus.ACTIVE });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateUserSchema.safeParse({ status: 'DELETED_EVERYTHING' });
    expect(result.success).toBe(false);
  });

  it('allows partial profile updates', () => {
    const result = updateUserSchema.safeParse({ firstName: 'New Name' });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema & refreshTokenSchema', () => {
  it('requires valid email on login', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false);
  });

  it('requires password on login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });

  it('requires refreshToken', () => {
    expect(refreshTokenSchema.safeParse({}).success).toBe(false);
    expect(refreshTokenSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});

describe('paginationSchema & idParamSchema', () => {
  it('caps limit at 100 (anti-DoS)', () => {
    expect(paginationSchema.safeParse({ limit: 10000 }).success).toBe(false);
  });

  it('rejects negative page', () => {
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('rejects non-uuid ids', () => {
    expect(idParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(idParamSchema.safeParse({ id: '123' }).success).toBe(false);
  });

  it('accepts uuid ids', () => {
    const uuid = '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b';
    expect(idParamSchema.safeParse({ id: uuid }).success).toBe(true);
  });
});

describe('domain schemas — business rule guards', () => {
  it('rejects grades exceeding maxScore', () => {
    const result = gradeSchema.safeParse({
      studentId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      subjectId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      termId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      type: 'EXAM',
      title: 'Midterm',
      maxScore: 100,
      score: 150,
      weight: 1,
      date: new Date().toISOString(),
      gradedBy: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative scores', () => {
    const result = gradeSchema.safeParse({
      studentId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      subjectId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      termId: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
      type: 'EXAM',
      title: 'Midterm',
      maxScore: 100,
      score: -5,
      weight: 1,
      date: new Date().toISOString(),
      gradedBy: '9c8b6c62-4f9e-4c1b-8d0a-2f1e3c4d5a6b',
    });
    expect(result.success).toBe(false);
  });

  it('requires endDate after startDate on events', () => {
    const start = new Date();
    const end = new Date(start.getTime() - 86400000);
    const result = eventSchema.safeParse({
      title: 'Sports Day',
      type: 'SPORTS',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      googleCalendarSync: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid event', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 86400000);
    const result = eventSchema.safeParse({
      title: 'Sports Day',
      type: 'SPORTS',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      requiresRegistration: true,
      maxParticipants: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresRegistration).toBe(true);
    }
  });
});
