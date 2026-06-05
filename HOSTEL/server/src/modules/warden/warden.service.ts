import { z } from 'zod';
import { ParentCallMethod, ParentResponse, ActorType, TransitionAction } from '@hostel/shared';
import db from '../../config/db';
import { Errors } from '../../utils/errors';
import { executeTransition } from '../../services/transition.service';

import { StaffRole } from '@hostel/shared';
import { sendGatePassEmail, sendRejectionEmail } from '../email/email.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const approveSchema = z.object({
  note: z.string().optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason required (min 5 chars)').max(500),
});

export const parentVerifySchema = z.object({
  phoneCalled: z.string().min(10, 'Valid phone number required'),
  callMethod: z.nativeEnum(ParentCallMethod),
  response: z.nativeEnum(ParentResponse),
  note: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  isWorkingDay: z.boolean().optional(),
  isPlacementActive: z.boolean().optional(),
  hostelName: z.string().optional(),
  wardenPhone: z.string().optional(),
  defaultOutingLimitHours: z.number().int().min(1).max(48).optional(),
});

// ─── Request Management ───────────────────────────────────────────────────────

export async function getAllRequests(filters: {
  status?: string;
  department?: string;
  year?: number;
  page?: number;
  limit?: number;
}) {
  const { status, department, year, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (department) where.student = { department };
  if (year) where.student = { ...((where.student as object) ?? {}), year };

  const [items, total] = await Promise.all([
    db.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        student: {
          select: {
            name: true,
            rollNumber: true,
            department: true,
            year: true,
            section: true,
            fatherPhone: true,
            motherPhone: true,
            room: { select: { roomNumber: true } },
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
    }),
    db.leaveRequest.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRequestDetail(requestId: string) {
  const request = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        include: {
          room: true,
        },
      },
      eventLogs: {
        orderBy: { createdAt: 'asc' },
      },

      approvals: {
        include: { approver: { select: { name: true } } },
      },
      parentVerifications: true,
    },
  });

  if (!request) throw Errors.notFound('Request');
  return request;
}

// ─── Warden Approval ──────────────────────────────────────────────────────────

export async function approveRequest(
  requestId: string,
  wardenId: string,
  note?: string
) {
  const result = await executeTransition({
    requestId,
    action: TransitionAction.WARDEN_APPROVE,
    actorType: ActorType.WARDEN,
    actorId: wardenId,
    note,
  });

  const request = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { student: { include: { room: true } } }
  });

  if (request && request.student.email) {
    await sendGatePassEmail(
      wardenId,
      request.student.email,
      request.student.name,
      request.student.rollNumber,
      request.student.room?.roomNumber || 'N/A',
      request.outDatetime,
      request.expectedReturnDatetime,
      request.reason
    );
  }

  return result;
}

export async function rejectRequest(
  requestId: string,
  wardenId: string,
  reason: string
) {
  const result = await executeTransition({
    requestId,
    action: TransitionAction.WARDEN_REJECT,
    actorType: ActorType.WARDEN,
    actorId: wardenId,
    note: reason,
  });

  const request = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { student: true }
  });

  if (request && request.student.email) {
    await sendRejectionEmail(
      wardenId,
      request.student.email,
      request.student.name,
      request.student.rollNumber,
      reason
    );
  }

  return result;
}

// ─── Parent Verification ──────────────────────────────────────────────────────

export async function recordParentVerification(
  requestId: string,
  wardenId: string,
  input: z.infer<typeof parentVerifySchema>
) {
  // Verify the request is in PENDING_APPROVALS state
  const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
  if (!request) throw Errors.notFound('Request');
  if (request.status !== 'PENDING_APPROVALS') {
    throw Errors.badRequest(
      `Request must be in PENDING_APPROVALS state. Current: ${request.status}`
    );
  }

  // Log the parent call
  await db.parentVerification.create({
    data: {
      requestId,
      phoneCalled: input.phoneCalled,
      callMethod: input.callMethod,
      response: input.response,
      respondedAt: new Date(),
      calledById: wardenId,
    },
  });

  // Parent approval acts as the Warden's approval decision
  const decision =
    input.response === ParentResponse.APPROVED || input.response === ParentResponse.CONNECTED_WARDEN
      ? 'APPROVED'
      : 'REJECTED';

  const result = await executeTransition({
    requestId,
    action: decision === 'APPROVED' ? TransitionAction.WARDEN_APPROVE : TransitionAction.WARDEN_REJECT,
    actorType: ActorType.WARDEN,
    actorId: wardenId,
    note: `Parent call (${input.callMethod}): ${input.response}. ${input.note ?? ''}`.trim(),
  });

  const fullRequest = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { student: { include: { room: true } } }
  });

  if (fullRequest && fullRequest.student.email) {
    if (decision === 'APPROVED') {
      await sendGatePassEmail(
        wardenId,
        fullRequest.student.email,
        fullRequest.student.name,
        fullRequest.student.rollNumber,
        fullRequest.student.room?.roomNumber || 'N/A',
        fullRequest.outDatetime,
        fullRequest.expectedReturnDatetime,
        fullRequest.reason
      );
    } else {
      await sendRejectionEmail(
        wardenId,
        fullRequest.student.email,
        fullRequest.student.name,
        fullRequest.student.rollNumber,
        `Parent call (${input.callMethod}): ${input.response}. ${input.note ?? ''}`.trim()
      );
    }
  }

  return result;
}

// ─── Presence / Live Dashboard ────────────────────────────────────────────────

export async function getPresenceStats() {
  const totalStudents = await db.student.count({ where: { isActive: true } });

  const outStatuses = ['OUT_CONFIRMED', 'OVERDUE'];
  const leaveStatuses = [
    'PENDING_APPROVALS',
    'APPROVED',
  ];

  const [studentsOut, studentsOnLeave, overdueCount] = await Promise.all([
    db.leaveRequest.count({
      where: { status: { in: outStatuses as any } },
    }),
    db.leaveRequest.count({
      where: { status: { in: leaveStatuses as any } },
    }),
    db.leaveRequest.count({
      where: { status: 'OVERDUE' },
    }),
  ]);

  const currentlyPresent = totalStudents - studentsOut;

  // Year-wise breakdown
  const years = [1, 2, 3, 4, 5];
  const byYear = await Promise.all(
    years.map(async (year) => {
      const yearTotal = await db.student.count({
        where: { isActive: true, year },
      });
      const yearOut = await db.leaveRequest.count({
        where: {
          status: { in: outStatuses as any },
          student: { year },
        },
      });
      return { year, present: yearTotal - yearOut, out: yearOut };
    })
  );

  return {
    totalStudents,
    currentlyPresent,
    studentsOut,
    onLeave: studentsOnLeave,
    overdue: overdueCount,
    byYear: byYear.filter((y) => y.present + y.out > 0),
  };
}

// ─── Student List ─────────────────────────────────────────────────────────────

export async function getStudentList(filters: {
  search?: string;
  department?: string;
  year?: number;
  page?: number;
  limit?: number;
}) {
  const { search, department, year, page = 1, limit = 30 } = filters;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };
  if (department) where.department = department;
  if (year) where.year = year;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    db.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ department: 'asc' }, { year: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        rollNumber: true,
        name: true,
        department: true,
        year: true,
        section: true,
        fatherPhone: true,
        phone: true,
        room: { select: { roomNumber: true } },
        leaveRequests: {
          where: {
            status: { in: ['OUT_CONFIRMED', 'OVERDUE'] }
          },
          take: 1
        }
      },
    }),
    db.student.count({ where }),
  ]);

  const formattedItems = items.map(student => ({
    ...student,
    isOut: student.leaveRequests.length > 0,
    activeRequest: student.leaveRequests[0] || null,
    leaveRequests: undefined
  }));

  return { items: formattedItems, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function toggleStudentPresence(studentId: string, wardenId: string) {
  // Check if student is currently out
  const activeRequest = await db.leaveRequest.findFirst({
    where: {
      studentId,
      status: { in: ['OUT_CONFIRMED', 'OVERDUE'] }
    }
  });

  if (activeRequest) {
    // Student is OUT -> Mark IN (Return)
    return executeTransition({
      requestId: activeRequest.id,
      action: TransitionAction.GATE_ENTRY,
      actorType: ActorType.WARDEN,
      actorId: wardenId,
      note: 'Manually marked IN by Warden via Dashboard'
    });
  } else {
    // Student is IN -> Mark OUT
    
    // First check if there is a pending request to approve, or an approved one to dispatch
    const pendingOrApproved = await db.leaveRequest.findFirst({
      where: {
        studentId,
        status: { in: ['PENDING_APPROVALS', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (pendingOrApproved) {
        await executeTransition({
          requestId: pendingOrApproved.id,
          action: TransitionAction.WARDEN_APPROVE,
          actorType: ActorType.WARDEN,
          actorId: wardenId,
          note: 'Auto-approved for manual OUT mark',
        });
      return executeTransition({
        requestId: pendingOrApproved.id,
        action: TransitionAction.GATE_EXIT,
        actorType: ActorType.WARDEN,
        actorId: wardenId,
        note: 'Manually marked OUT by Warden via Dashboard'
      });
    }

    // Otherwise, create a completely manual OUT request
    const now = new Date();
    const returnDt = new Date(now);
    returnDt.setHours(returnDt.getHours() + 12); // Default 12 hours out

    const request = await db.leaveRequest.create({
      data: {
        studentId,
        type: 'OUTING',
        reason: 'Manual Warden Override',
        place: 'Manual Departure',
        outDatetime: now,
        expectedReturnDatetime: returnDt,
        status: 'APPROVED', 
        hasHodLetter: false,
        submittedPhysicalCopy: false,
        isEmergency: false,
        ticketCode: `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      }
    });

    return executeTransition({
      requestId: request.id,
      action: TransitionAction.GATE_EXIT,
      actorType: ActorType.WARDEN,
      actorId: wardenId,
      note: 'Manually marked OUT by Warden via Dashboard (Override)'
    });
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  return db.systemSettings.findUnique({ where: { id: 1 } });
}

export async function updateSettings(
  wardenId: string,
  data: z.infer<typeof updateSettingsSchema>
) {
  return db.systemSettings.upsert({
    where: { id: 1 },
    update: { ...data, updatedById: wardenId },
    create: {
      id: 1,
      ...data,
      updatedById: wardenId,
    },
  });
}
