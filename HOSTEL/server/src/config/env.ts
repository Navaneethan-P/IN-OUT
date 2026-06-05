import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3000'), 10),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '24h'),

  FAST2SMS_API_KEY: optional('FAST2SMS_API_KEY', ''),
  
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
} as const;
