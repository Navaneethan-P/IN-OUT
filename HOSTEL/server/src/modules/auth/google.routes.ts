import { Router } from 'express';
import { getAuthUrl, handleAuthCallback, disconnectGoogle } from './google.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { StaffRole } from '@hostel/shared';

const router = Router();

// Endpoint to get the Google OAuth URL
router.get('/url', authenticate, requireRole(StaffRole.WARDEN), getAuthUrl);

// Endpoint to handle the OAuth callback
router.get('/callback', handleAuthCallback);

// Endpoint to disconnect
router.delete('/disconnect', authenticate, requireRole(StaffRole.WARDEN), disconnectGoogle);

export default router;
