import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireStudent } from '../../middleware/roleGuard';
import { getProfileHandler, getGateLogsHandler } from './student.controller';

export const studentRoutes = Router();

// All student routes require JWT auth + STUDENT role
studentRoutes.use(authenticate, requireStudent);

// GET /api/v1/student/me
studentRoutes.get('/me', getProfileHandler);

// GET /api/v1/student/gate-logs
studentRoutes.get('/gate-logs', getGateLogsHandler);

// GET /api/v1/student/settings
studentRoutes.get('/settings', async (req, res) => {
  const db = require('../../config/db').default;
  const settings = await db.systemSettings.findUnique({ where: { id: 1 } });
  res.json({ success: true, data: settings });
});
