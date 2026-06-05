import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireStudent } from '../../middleware/roleGuard';
import {
  createRequestHandler,
  getMyRequestsHandler,
  getRequestDetailHandler,
  getTicketHandler,
  cancelRequestHandler,
} from './requests.controller';

export const requestRoutes = Router();

// All routes require student auth
requestRoutes.use(authenticate, requireStudent);

// POST /api/v1/requests         — Submit new request
requestRoutes.post('/', createRequestHandler);

// GET  /api/v1/requests         — My request history (paginated)
requestRoutes.get('/', getMyRequestsHandler);

// GET  /api/v1/requests/:id     — Request detail + event history
requestRoutes.get('/:id', getRequestDetailHandler);

// GET  /api/v1/requests/:id/ticket — Get leave ticket (must be APPROVED+)
requestRoutes.get('/:id/ticket', getTicketHandler);

// DELETE /api/v1/requests/:id  — Cancel request (DRAFT/PENDING_WARDEN only)
requestRoutes.delete('/:id', cancelRequestHandler);
