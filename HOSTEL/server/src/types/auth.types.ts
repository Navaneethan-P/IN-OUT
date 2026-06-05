import { Request } from 'express';
import { StaffRole } from '@hostel/shared';

export interface AuthPayload {
  id: string;
  role: StaffRole | 'STUDENT';
  type: 'student' | 'staff';
}

// Extend Express Request to carry the decoded JWT payload
export interface AuthRequest extends Request {
  user?: AuthPayload;
}
