/**
 * HOSTEL EVENT BUS — Decoupled notification system
 *
 * ARCHITECTURE RULE:
 *   Transition engine fires events.
 *   Notification handlers LISTEN to events.
 *   They are NEVER called directly from business logic.
 *
 * WHY THIS MATTERS:
 *   Today: SMS via Fast2SMS
 *   Phase 3: WhatsApp via WATI
 *   Phase 4: Push notifications + IVR
 *   Phase 5: Email reports
 *
 *   All of these plug in HERE — zero changes to transition.service.ts
 *
 * USAGE:
 *   Emitting (transition engine does this automatically):
 *     hostelEvents.emit(EVENTS.REQUEST_APPROVED, eventPayload)
 *
 *   Listening (notification handlers register here):
 *     hostelEvents.on(EVENTS.REQUEST_APPROVED, async (e) => { sendSMS(e) })
 */

import { EventEmitter } from 'events';
import { LeaveRequest } from '@prisma/client';

// ─── Event Payload ────────────────────────────────────────────────────────────

export interface TransitionEventPayload {
  requestId: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  actorId: string | null;
  request: LeaveRequest;
  timestamp: Date;
}

// ─── Event Names ──────────────────────────────────────────────────────────────
// One event per meaningful state transition.
// Use these constants everywhere — never hardcode string names.

export const EVENTS = {
  // Warden needs to act
  REQUEST_SUBMITTED: 'request.submitted',

  // Parent needs to be called
  PARENT_VERIFICATION_NEEDED: 'request.parent_verification_needed',

  // HOD/Placement needs to act
  HOD_APPROVAL_NEEDED: 'request.hod_approval_needed',
  PLACEMENT_APPROVAL_NEEDED: 'request.placement_approval_needed',

  // Student receives result
  REQUEST_FINAL_APPROVED: 'request.final_approved',
  REQUEST_REJECTED: 'request.rejected',
  REQUEST_CANCELLED: 'request.cancelled',

  // Gate events — parent receives notification
  STUDENT_EXITED: 'gate.exit',
  STUDENT_RETURNED: 'gate.entry',

  // System-generated alerts — warden receives notification
  REQUEST_OVERDUE: 'request.overdue',
  REQUEST_EXPIRED: 'request.expired',
} as const;

export type HostelEventName = (typeof EVENTS)[keyof typeof EVENTS];

// ─── Event Bus ────────────────────────────────────────────────────────────────

class HostelEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Prevent memory leak warning for many registered listeners
    this.setMaxListeners(20);
  }

  /**
   * Emit a typed transition event.
   * Called by transition.service.ts after every successful state change.
   */
  emitTransition(eventName: HostelEventName, payload: TransitionEventPayload): boolean {
    return super.emit(eventName, payload);
  }

  /**
   * Register a typed listener.
   * Called by notification handlers during app startup.
   */
  onTransition(
    eventName: HostelEventName,
    listener: (payload: TransitionEventPayload) => void | Promise<void>
  ): this {
    return super.on(eventName, listener);
  }
}

export const hostelEvents = new HostelEventEmitter();

// ─── Map: status transitions → event names ────────────────────────────────────
// Used by transition.service.ts to determine which event to emit.

export const STATUS_TO_EVENT: Partial<Record<string, HostelEventName>> = {
  PENDING_APPROVALS: EVENTS.REQUEST_SUBMITTED,
  APPROVED: EVENTS.REQUEST_FINAL_APPROVED,
  REJECTED: EVENTS.REQUEST_REJECTED,
  CANCELLED: EVENTS.REQUEST_CANCELLED,
  OUT_CONFIRMED: EVENTS.STUDENT_EXITED,
  RETURNED: EVENTS.STUDENT_RETURNED,
  OVERDUE: EVENTS.REQUEST_OVERDUE,
  EXPIRED: EVENTS.REQUEST_EXPIRED,
};
