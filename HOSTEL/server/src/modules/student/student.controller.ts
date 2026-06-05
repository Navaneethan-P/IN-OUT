import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/auth.types';
import { sendSuccess } from '../../utils/response';
import { Errors } from '../../utils/errors';
import * as studentService from './student.service';

export async function getProfileHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await studentService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function getGateLogsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const logs = await studentService.getGateLogs(req.user!.id);
    sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
}
