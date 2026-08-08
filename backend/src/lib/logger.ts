import winston from 'winston';
import { config } from '../config/env';

const { combine, timestamp, printf, json, colorize, errors } = winston.format;

const consoleFormat = config.isProd
  ? json()
  : combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      printf(({ level, message, timestamp, context, ...meta }) => {
        const contextStr = context ? ` [${context}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}${contextStr}: ${message}${metaStr}`;
      })
    );

const fileFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  exitOnError: false,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: fileFormat }),
    new winston.transports.File({ filename: 'logs/combined.log', format: fileFormat }),
  ],
});

export function createLogger(context: string) {
  return {
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, { context, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, { context, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, { context, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, { context, ...meta }),
    http: (message: string, meta?: Record<string, unknown>) => logger.info(message, { context, ...meta }),
  };
}

export function getHttpLogger(): (message: string) => void {
  return (message: string) => logger.info(message.trim());
}