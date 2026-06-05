export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Pre-defined common errors
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

  unauthorized: (msg = 'Authentication required') =>
    new AppError(msg, 401, 'UNAUTHORIZED'),

  forbidden: (msg = 'You do not have permission for this action') =>
    new AppError(msg, 403, 'FORBIDDEN'),

  badRequest: (msg: string) =>
    new AppError(msg, 400, 'BAD_REQUEST'),

  conflict: (msg: string) =>
    new AppError(msg, 409, 'CONFLICT'),

  invalidTransition: (from: string, action: string) =>
    new AppError(
      `Action '${action}' is not valid from state '${from}'`,
      409,
      'INVALID_TRANSITION'
    ),

  terminalState: (status: string) =>
    new AppError(
      `Request is in terminal state '${status}'. No further changes allowed.`,
      409,
      'TERMINAL_STATE'
    ),

  unauthorizedTransition: (role: string, action: string) =>
    new AppError(
      `Role '${role}' cannot perform action '${action}'`,
      403,
      'UNAUTHORIZED_TRANSITION'
    ),
};
