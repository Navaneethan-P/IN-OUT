import { Response, NextFunction } from 'express';
import { StaffRole } from '@hostel/shared';
import { AuthRequest } from '../types/auth.types';
import { Errors } from '../utils/errors';

type AllowedRole = StaffRole | 'STUDENT';

/**
 * Role guard middleware factory.
 *
 * Usage:
 *   router.patch('/approve', authenticate, requireRole('WARDEN', 'ADMIN'), handler)
 *
 * RULE: HOD department isolation is enforced in the service layer,
 *       not here. This middleware only checks the role type.
 */
export function requireRole(...roles: AllowedRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(Errors.unauthorized());
      return;
    }

    if (!roles.includes(req.user.role as AllowedRole)) {
      next(
        Errors.forbidden(
          `This action requires one of: [${roles.join(', ')}]. Your role: ${req.user.role}`
        )
      );
      return;
    }

    next();
  };
}

// Convenience guards
export const requireStudent = requireRole('STUDENT');
export const requireWarden = requireRole(StaffRole.WARDEN, StaffRole.ADMIN);
export const requireSecurity = requireRole(StaffRole.SECURITY, StaffRole.ADMIN);
export const requireAdmin = requireRole(StaffRole.ADMIN);
export const requireWardenOrAdmin = requireRole(StaffRole.WARDEN, StaffRole.ADMIN);
