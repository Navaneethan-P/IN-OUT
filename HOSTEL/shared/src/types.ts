/**
 * SHARED TYPES — API contracts and common interfaces.
 * These are plain TypeScript interfaces — no framework dependencies.
 */

import { RequestStatus, RequestType, StaffRole } from './enums';

// ─── Standard API Response Shape ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: string;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokenPayload {
  id: string;
  role: StaffRole | 'STUDENT';
  type: 'student' | 'staff';
  department?: string; // HOD's department
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
}

// ─── Leave Request ────────────────────────────────────────────────────────────
export interface CreateRequestDto {
  type: RequestType;
  reason: string;
  place: string;
  outDatetime: string;       // ISO 8601
  expectedReturnDatetime: string; // ISO 8601
}

export interface RequestSummary {
  id: string;
  type: RequestType;
  reason: string;
  place: string;
  status: RequestStatus;
  outDatetime: string;
  expectedReturnDatetime: string;
  createdAt: string;
  requiresHodApproval: boolean;
  requiresPlacementApproval: boolean;
  ticketCode?: string | null;
}

// ─── Presence Analytics ───────────────────────────────────────────────────────
export interface PresenceStats {
  totalStudents: number;
  currentlyPresent: number;
  onLeave: number;
  outToday: number;
  overdue: number;
  byYear: Array<{ year: number; present: number; out: number }>;
  byDepartment: Array<{ department: string; present: number; out: number }>;
}
