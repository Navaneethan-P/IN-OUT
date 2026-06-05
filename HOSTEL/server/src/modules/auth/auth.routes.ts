import { Router } from 'express';
import {
  studentLoginHandler,
  staffLoginHandler,
  scanLoginHandler,
} from './auth.controller';
import { loginRateLimiter } from '../../middleware/security';

export const authRoutes = Router();

// POST /api/v1/auth/student/login
authRoutes.post(
  '/student/login',
  loginRateLimiter,
  studentLoginHandler
);

// POST /api/v1/auth/staff/login
authRoutes.post(
  '/staff/login',
  loginRateLimiter,
  staffLoginHandler
);

// POST /api/v1/auth/scan-login  (QR / RFID identity scan at kiosk)
authRoutes.post('/scan-login', scanLoginHandler);

// Google OAuth routes
import googleRoutes from './google.routes';
authRoutes.use('/google', googleRoutes);
