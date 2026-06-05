import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  res.status(statusCode).json({ success: true, message, data });
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message: string,
  code: string,
  statusCode = 500
): void {
  res.status(statusCode).json({ success: false, error: { message, code } });
}
