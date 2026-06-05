import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireWarden } from '../../middleware/roleGuard';
import {
  getRequestsHandler,
  getRequestDetailHandler,
  approveRequestHandler,
  rejectRequestHandler,
  parentVerifyHandler,
  getPresenceHandler,
  getStudentsHandler,
  getSettingsHandler,
  updateSettingsHandler,
  exportRequestsHandler,
  exportStudentsHandler,
  exportOverdueHandler,
  exportAuditHandler,
  togglePresenceHandler,
} from './warden.controller';

export const wardenRoutes = Router();

// All warden routes require JWT + WARDEN or ADMIN role
wardenRoutes.use(authenticate, requireWarden);

// ── Requests ──────────────────────────────────────────────────────────────────
// GET    /api/v1/warden/requests
wardenRoutes.get('/requests', getRequestsHandler);

// GET    /api/v1/warden/requests/:id
wardenRoutes.get('/requests/:id', getRequestDetailHandler);

// PATCH  /api/v1/warden/requests/:id/approve
wardenRoutes.patch('/requests/:id/approve', approveRequestHandler);

// PATCH  /api/v1/warden/requests/:id/reject
wardenRoutes.patch('/requests/:id/reject', rejectRequestHandler);

// POST   /api/v1/warden/requests/:id/parent-verify
wardenRoutes.post('/requests/:id/parent-verify', parentVerifyHandler);

// ── Dashboard ─────────────────────────────────────────────────────────────────
// GET    /api/v1/warden/presence
wardenRoutes.get('/presence', getPresenceHandler);

// GET    /api/v1/warden/students
wardenRoutes.get('/students', getStudentsHandler);

// POST   /api/v1/warden/students/:id/toggle-presence
wardenRoutes.post('/students/:id/toggle-presence', togglePresenceHandler);

// ── Settings ──────────────────────────────────────────────────────────────────
// GET    /api/v1/warden/settings
wardenRoutes.get('/settings', getSettingsHandler);

// PATCH  /api/v1/warden/settings
wardenRoutes.patch('/settings', updateSettingsHandler);

// ── Exports (CSV Downloads) ───────────────────────────────────────────────────
// GET    /api/v1/warden/export/requests?status=&department=&year=&fromDate=&toDate=
wardenRoutes.get('/export/requests', exportRequestsHandler);

// GET    /api/v1/warden/export/students?department=&year=
wardenRoutes.get('/export/students', exportStudentsHandler);

// GET    /api/v1/warden/export/overdue
wardenRoutes.get('/export/overdue', exportOverdueHandler);

// GET    /api/v1/warden/export/audit?fromDate=&toDate=
wardenRoutes.get('/export/audit', exportAuditHandler);

