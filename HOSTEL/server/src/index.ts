import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { studentRoutes } from './modules/student/student.routes';
import { requestRoutes } from './modules/requests/requests.routes';
import { wardenRoutes } from './modules/warden/warden.routes';
import { gateRoutes } from './modules/gate/gate.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { initializeSocket } from './services/socket.service';
import { registerSocketListeners } from './modules/notifications/socket.listeners';

const app = express();

// ─── Security Headers & Rate Limiting ─────────────────────────────────────────
import { securityHeaders, apiRateLimiter } from './middleware/security';
app.use(securityHeaders);

// ─── CORS ────────────────────────────────────────────────────────────────────
// In intranet/single-port mode the client is served from the same origin,
// so CORS is only needed for dev (Vite dev server on :5173).
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header) and the configured dev origin
      if (!origin || origin === env.CORS_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for intranet — all internal IPs are trusted
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Logger ───────────────────────────────────────────────────────────────────
import { requestLogger, logger } from './middleware/logger';
app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', apiRateLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check (no auth) ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'Hostel Management API',
      version: '1.0.0',
      phase: 'Phase 7 — Intranet Deployment',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Static Client (Single-Port Intranet Serving) ───────────────────────────
// Serve the compiled React app from client/dist.
// This runs BEFORE API routes so the static middleware can short-circuit
// file requests efficiently, while /api/* always hits the routes below.
const CLIENT_DIST = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_DIST));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/warden', wardenRoutes);
app.use('/api/v1/gate', gateRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── API 404 Handler ─────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
});

// ─── SPA Catch-All ───────────────────────────────────────────────────────────
// For any non-API route, serve the React app's index.html so that
// React Router can handle client-side navigation (e.g. /login, /dashboard).
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Initialize Event Listeners ──────────────────────────────────────────────────
import { registerNotificationListeners } from './modules/notifications/notification.listeners';
registerNotificationListeners();

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = createServer(app);

// Initialize Sockets
initializeSocket(server);
registerSocketListeners();

server.listen(env.PORT, () => {
  console.log('');
  logger.info('╔══════════════════════════════════════════════════╗');
  logger.info('║   Hostel Management System — Intranet Server     ║');
  logger.info('╠══════════════════════════════════════════════════╣');
  logger.info(`║   Port:    ${env.PORT}                                  ║`);
  logger.info(`║   Env:     ${env.NODE_ENV}                          ║`);
  logger.info(`║   App:     http://localhost:${env.PORT}                  ║`);
  logger.info(`║   Health:  http://localhost:${env.PORT}/api/health       ║`);
  logger.info('╠══════════════════════════════════════════════════╣');
  logger.info('║   🔥 FIREWALL: Open port 3000 in Windows Defender║');
  logger.info('║   Control Panel > Firewall > Advanced > Inbound  ║');
  logger.info('║   New Rule > Port > TCP 3000 > Allow connection   ║');
  logger.info('╚══════════════════════════════════════════════════╝');
  console.log('');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('[SERVER] SIGTERM received. Closing server...');
  server.close(() => {
    logger.info('[SERVER] HTTP server closed.');
    process.exit(0);
  });
});

export default app;
