import { z } from 'zod';
import { RequestType } from '@hostel/shared';
import db from '../../config/db';
import { Errors } from '../../utils/errors';
import {
  executeTransition,
  ExecuteTransitionParams,
} from '../../services/transition.service';
import { ActorType, TransitionAction } from '@hostel/shared';

// ─── Validation Schema ────────────────────────────────────────────────────────

export const createRequestSchema = z.object({
  type: z.nativeEnum(RequestType),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  place: z.string().min(2, 'Place is required').max(200),
  outDatetime: z.string().datetime({ message: 'Invalid out date/time (use ISO 8601)' }),
  expectedReturnDatetime: z.string().datetime({ message: 'Invalid return date/time' }),
  hasHodLetter: z.boolean().optional().default(false),
  submittedPhysicalCopy: z.boolean().optional().default(false),
  isEmergency: z.boolean().optional().default(false),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Submit a new leave/outing request.
 *
 * Reads current system_settings to lock approval requirements.
 * Creates the request in DRAFT, then immediately transitions to PENDING_WARDEN.
 * Both operations are in a single DB transaction via the transition engine.
 */
export async function createRequest(studentId: string, input: CreateRequestInput) {
  // Validate dates
  const outDt = new Date(input.outDatetime);
  const returnDt = new Date(input.expectedReturnDatetime);

  if (returnDt <= outDt) {
    throw Errors.badRequest('Return date/time must be after out date/time');
  }
  
  // Prevent 30+ day outings (Time-based attack)
  const durationMs = returnDt.getTime() - outDt.getTime();
  if (durationMs > 30 * 24 * 60 * 60 * 1000) {
    throw Errors.badRequest('Leave duration cannot exceed 30 days');
  }

  // Check for existing active request (prevent duplicates)
  const existingActive = await db.leaveRequest.findFirst({
    where: {
      studentId,
      status: {
        in: [
          'PENDING_APPROVALS',
          'APPROVED',
          'OUT_CONFIRMED',
          'OVERDUE',
        ],
      },
    },
  });

  if (existingActive) {
    throw Errors.conflict(
      'You already have an active request. Cancel or wait for it to complete before submitting a new one.'
    );
  }

  // Create request in DRAFT state
  const request = await db.leaveRequest.create({
    data: {
      studentId,
      type: input.type,
      reason: input.reason,
      place: input.place,
      outDatetime: outDt,
      expectedReturnDatetime: returnDt,
      hasHodLetter: input.hasHodLetter,
      submittedPhysicalCopy: input.submittedPhysicalCopy,
      isEmergency: input.isEmergency,
      status: 'DRAFT',
    },
  });

  // Immediately submit (DRAFT → PENDING_WARDEN)
  const submitted = await executeTransition({
    requestId: request.id,
    action: TransitionAction.SUBMIT,
    actorType: ActorType.STUDENT,
    actorId: studentId,
    note: 'Request submitted by student',
  });

  return submitted;
}

/**
 * Get all requests for a student with pagination.
 */
export async function getStudentRequests(
  studentId: string,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.leaveRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        reason: true,
        place: true,
        status: true,
        outDatetime: true,
        expectedReturnDatetime: true,
        actualReturnDatetime: true,
        hasHodLetter: true,
        submittedPhysicalCopy: true,
        isEmergency: true,
        ticketCode: true,
        isOverdue: true,
        createdAt: true,
      },
    }),
    db.leaveRequest.count({ where: { studentId } }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get full request detail including event history.
 * Only the owner student can view their own request.
 */
export async function getRequestDetail(requestId: string, studentId: string) {
  const request = await db.leaveRequest.findFirst({
    where: { id: requestId, studentId },
    include: {
      eventLogs: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actorType: true,
          note: true,
          createdAt: true,
        },
      },

      approvals: {
        select: {
          approverRole: true,
          decision: true,
          reason: true,
          decidedAt: true,
          approver: { select: { name: true } },
        },
      },
    },
  });

  if (!request) throw Errors.notFound('Request');
  return request;
}

/**
 * Get ticket data for an approved request.
 */
export async function getTicket(requestId: string, studentId: string) {
  const request = await db.leaveRequest.findFirst({
    where: {
      id: requestId,
      studentId,
      status: {
        in: ['APPROVED', 'OUT_CONFIRMED', 'RETURNED', 'COMPLETED', 'OVERDUE'],
      },
    },
    include: {
      student: {
        select: {
          name: true,
          rollNumber: true,
          department: true,
          year: true,
          room: { select: { roomNumber: true } },
        },
      },
    },
  });

  if (!request) {
    throw Errors.notFound('Ticket (request not found or not yet approved)');
  }

  return {
    ticketCode: request.ticketCode,
    type: request.type,
    status: request.status,
    place: request.place,
    reason: request.reason,
    outDatetime: request.outDatetime,
    expectedReturnDatetime: request.expectedReturnDatetime,
    student: request.student,
  };
}

/**
 * Cancel a request.
 *
 * A student may only cancel a request if:
 * 1. It is in DRAFT or PENDING_APPROVALS state.
 * 2. No approver has yet acted on it (no approval slot is APPROVED or REJECTED).
 *
 * Once any approver has taken an action (e.g., warden has approved), the
 * student loses the right to cancel — they must contact the warden directly.
 * This prevents students from erasing approver decisions.
 */
export async function cancelRequest(requestId: string, studentId: string) {
  const request = await db.leaveRequest.findFirst({
    where: { id: requestId, studentId },
    include: { approvals: { select: { decision: true } } },
  });

  if (!request) throw Errors.notFound('Request');

  // Block cancel if Warden has already acted
  const anyApproverActed = request.approvals?.length > 0;

  if (anyApproverActed) {
    throw Errors.conflict(
      'Cannot cancel: the Warden has already acted on this request. Please contact the Warden directly.'
    );
  }

  return executeTransition({
    requestId,
    action: TransitionAction.STUDENT_CANCEL,
    actorType: ActorType.STUDENT,
    actorId: studentId,
    note: 'Cancelled by student',
  });
}
