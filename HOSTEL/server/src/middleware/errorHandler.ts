import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Zod Validation Errors
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        fields: fieldErrors,
      },
    });
    return;
  }
  // Known operational errors (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  // Prisma known errors
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err
  ) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };

    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: `A record with this ${prismaErr.meta?.target?.join(', ')} already exists`,
          code: 'DUPLICATE_RECORD',
        },
      });
      return;
    }

    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      });
      return;
    }
  }

  // Unknown errors — log and return generic message
  console.error('[ERROR]', {
    message: err.message,
    stack: env.isDev ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      message: env.isDev ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
