import { Router } from 'express';
import { GateController } from './gate.controller';
import { authenticate } from '../../middleware/auth';
import { requireSecurity } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

export const gateRoutes = Router();
const controller = new GateController();

// Gate scan body schema — validate req.body directly (no outer 'body:' wrapper)
const scanSchema = z.object({
  rollNumber: z.string().min(1, 'Roll number is required'),
});

// All gate routes require SECURITY role
gateRoutes.use(authenticate, requireSecurity);

gateRoutes.post('/scan-exit', validate(scanSchema), controller.scanExit);
gateRoutes.post('/scan-entry', validate(scanSchema), controller.scanEntry);

