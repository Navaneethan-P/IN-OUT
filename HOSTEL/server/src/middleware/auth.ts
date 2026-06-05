import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload, AuthRequest } from '../types/auth.types';
import { Errors } from '../utils/errors';

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(Errors.unauthorized('Authorization header missing or malformed'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(Errors.unauthorized('Token has expired. Please login again.'));
    } else {
      next(Errors.unauthorized('Invalid token.'));
    }
  }
}
