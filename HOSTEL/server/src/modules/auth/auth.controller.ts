import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const studentLoginSchema = z.object({
  rollNumber: z.string().min(5, 'Roll number required'),
  password: z.string().min(4, 'Password required'),
});

const staffLoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(4, 'Password required'),
});

const scanLoginSchema = z.object({
  qrToken: z.string().uuid('Invalid QR token format'),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function studentLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rollNumber, password } = studentLoginSchema.parse(req.body);
    const result = await authService.studentLogin(rollNumber, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function staffLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = staffLoginSchema.parse(req.body);
    const result = await authService.staffLogin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function scanLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { qrToken } = scanLoginSchema.parse(req.body);
    const result = await authService.scanLogin(qrToken);
    sendSuccess(res, result, 'Scan login successful');
  } catch (err) {
    next(err);
  }
}
