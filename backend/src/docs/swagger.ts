export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'EduCore Nexus - School Management System API',
    version: '2.0.0',
    description:
      'AI-powered School Management System API with Google Calendar integration, real-time notifications, and comprehensive academic management features.',
  },
  servers: [
    { url: 'http://localhost:4000/api/v1', description: 'Local Development' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and user management' },
    { name: 'Users', description: 'User management' },
    { name: 'Academic', description: 'Academic management (years, terms, classes, subjects)' },
    { name: 'Attendance', description: 'Attendance tracking' },
    { name: 'Grades', description: 'Grade management' },
    { name: 'Events', description: 'School events' },
    { name: 'Calendar', description: 'Google Calendar integration' },
    { name: 'AI', description: 'AI-powered features' },
    { name: 'Notifications', description: 'Notifications' },
    { name: 'Fees', description: 'Fee management' },
    { name: 'Health', description: 'Health records' },
    { name: 'Timetable', description: 'Timetable management' },
    { name: 'Dashboard', description: 'Dashboard analytics' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          rememberMe: { type: 'boolean' },
        },
      },
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'number' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array' },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    tokens: { $ref: '#/components/schemas/TokenPair' },
                    permissions: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'User created successfully' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        responses: {
          '200': { description: 'New tokens issued' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile retrieved' },
        },
      },
    },
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'List school events',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Events retrieved' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create a school event',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Event created' },
        },
      },
    },
    '/calendar/auth-url': {
      get: {
        tags: ['Calendar'],
        summary: 'Get Google OAuth URL',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Auth URL generated' },
        },
      },
    },
    '/calendar/connect': {
      post: {
        tags: ['Calendar'],
        summary: 'Connect Google Calendar account',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Account connected' },
        },
      },
    },
    '/ai/predict/performance': {
      post: {
        tags: ['AI'],
        summary: 'Predict student performance',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Prediction generated' },
        },
      },
    },
    '/ai/chat/message': {
      post: {
        tags: ['AI'],
        summary: 'Send chat message to AI assistant',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'AI response generated' },
        },
      },
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard analytics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard data retrieved' },
        },
      },
    },
  },
};