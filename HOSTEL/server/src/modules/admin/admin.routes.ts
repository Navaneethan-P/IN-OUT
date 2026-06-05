import { Router } from 'express';
import { createStudentHandler, createStaffHandler } from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roleGuard';

const router = Router();

// All admin routes require a valid JWT token AND the ADMIN role.
// These routes must only be called from the encrypted admin panel or trusted tooling.
router.use(authenticate, requireAdmin);

router.post('/student', createStudentHandler);
router.post('/staff', createStaffHandler);

export { router as adminRoutes };

