import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireWarden } from '../../middleware/roleGuard';
import { getDashboardStats } from './analytics.controller';

export const analyticsRoutes = Router();

// GET /api/v1/analytics
// Secured: Requires authenticating as Warden or Admin
analyticsRoutes.get('/', authenticate, requireWarden, getDashboardStats);
