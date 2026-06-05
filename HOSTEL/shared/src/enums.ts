/**
 * SHARED ENUMS — Single source of truth for all enum values.
 *
 * These must EXACTLY match the enum values defined in server/prisma/schema.prisma.
 * If you add a value here, add it to schema.prisma too, then run: npx prisma migrate dev
 *
 * Used by: server (Node.js) and client (React) — do NOT import @prisma/client here.
 */

// ─── Request Types ────────────────────────────────────────────────────────────
export enum RequestType {
  OUTING = 'OUTING',
  LEAVE = 'LEAVE',
  EMERGENCY = 'EMERGENCY',
}

// ─── Request Lifecycle States ─────────────────────────────────────────────────
export enum RequestStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVALS = 'PENDING_APPROVALS',
  APPROVED = 'APPROVED',
  OUT_CONFIRMED = 'OUT_CONFIRMED',
  RETURNED = 'RETURNED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  OVERDUE = 'OVERDUE',
}

export enum CalendarDayType {
  HOLIDAY = 'HOLIDAY',
  WORKING_DAY = 'WORKING_DAY',
}



export enum StaffRole {
  WARDEN = 'WARDEN',
  SECURITY = 'SECURITY',
  ADMIN = 'ADMIN',
}

// ─── Actor Types (who performs transitions) ───────────────────────────────────
export enum ActorType {
  STUDENT = 'STUDENT',
  WARDEN = 'WARDEN',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

// ─── State Machine Actions ────────────────────────────────────────────────────
// These are the ONLY valid ways to change a request's status.
// Direct status assignment is NEVER allowed.
export enum TransitionAction {
  // Student actions
  SUBMIT = 'SUBMIT',
  STUDENT_CANCEL = 'STUDENT_CANCEL',

  // Warden actions
  WARDEN_APPROVE = 'WARDEN_APPROVE',
  WARDEN_REJECT = 'WARDEN_REJECT',

  // Parent verification actions (recorded by warden)
  PARENT_VERIFIED_APPROVE = 'PARENT_VERIFIED_APPROVE',
  PARENT_VERIFIED_REJECT = 'PARENT_VERIFIED_REJECT',



  // Gate actions
  GATE_EXIT = 'GATE_EXIT',
  GATE_ENTRY = 'GATE_ENTRY',

  // System-automated actions (cron jobs)
  SYSTEM_EXPIRE = 'SYSTEM_EXPIRE',
  SYSTEM_OVERDUE = 'SYSTEM_OVERDUE',
  SYSTEM_COMPLETE = 'SYSTEM_COMPLETE',
}

// ─── Scan Methods ─────────────────────────────────────────────────────────────
export enum ScanMethod {
  QR = 'QR',
  RFID = 'RFID',
  MANUAL = 'MANUAL',
  ROLL_NUMBER = 'ROLL_NUMBER',
}

// ─── Notification ─────────────────────────────────────────────────────────────
export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
}

// ─── Approvals ────────────────────────────────────────────────────────────────
export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HELD = 'HELD',
}

// ─── Parent Verification ──────────────────────────────────────────────────────
export enum ParentCallMethod {
  MANUAL = 'MANUAL',
  IVR = 'IVR',
}

export enum ParentResponse {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NO_ANSWER = 'NO_ANSWER',
  CONNECTED_WARDEN = 'CONNECTED_WARDEN',
}

// ─── Gate Event Types ─────────────────────────────────────────────────────────
export enum GateEventType {
  EXIT = 'EXIT',
  ENTRY = 'ENTRY',
}

// ─── Terminal States (no further transitions) ─────────────────────────────────
export const TERMINAL_STATES: RequestStatus[] = [
  RequestStatus.COMPLETED,
  RequestStatus.REJECTED,
  RequestStatus.CANCELLED,
  RequestStatus.EXPIRED,
];

// ─── States visible on student dashboard as "active" ─────────────────────────
export const ACTIVE_REQUEST_STATES: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.PENDING_APPROVALS,
  RequestStatus.APPROVED,
  RequestStatus.OUT_CONFIRMED,
  RequestStatus.OVERDUE,
];

// ─── Human-readable labels for each status ───────────────────────────────────
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'Draft',
  [RequestStatus.PENDING_APPROVALS]: 'Awaiting Approvals',
  [RequestStatus.APPROVED]: 'Approved',
  [RequestStatus.OUT_CONFIRMED]: 'Outside Hostel',
  [RequestStatus.RETURNED]: 'Returned',
  [RequestStatus.COMPLETED]: 'Completed',
  [RequestStatus.REJECTED]: 'Rejected',
  [RequestStatus.CANCELLED]: 'Cancelled',
  [RequestStatus.EXPIRED]: 'Expired',
  [RequestStatus.OVERDUE]: 'Overdue',
};
