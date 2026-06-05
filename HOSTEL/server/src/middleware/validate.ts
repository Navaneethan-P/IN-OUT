import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod request validation middleware factory.
 *
 * Usage:
 *   router.post('/', validate(createRequestSchema), handler)
 *
 * On failure: returns 400 with field-level error details.
 * On success: replaces req.body with the parsed (and typed) data.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.errors.map((e) => ({
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

    req.body = result.data;
    next();
  };
}
