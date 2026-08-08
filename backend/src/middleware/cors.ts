import cors from 'cors';
import { config } from '../config/env';

export const corsOptions: cors.CorsOptions = {
  origin: config.frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

export const corsMiddleware = cors(corsOptions);