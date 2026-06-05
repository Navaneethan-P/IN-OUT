import { RequestStatus, LeaveRequest } from '@prisma/client';
import {
  TransitionAction,
  ActorType,
  TERMINAL_STATES,
} from '@hostel/shared';
import { hostelEvents, STATUS_TO_EVENT } from './events.service';
import db from '../config/db';
import { Errors } from '../utils/errors';

// ─── The Transition Map — Single Source of Truth ──────────────────────────────

const TRANSITION_MAP: Partial<
  Record<RequestStatus, Partial<Record<TransitionAction, { allowedActors: ActorType[], nextStatus: RequestStatus }>>>
> = {
  [RequestStatus.DRAFT]: {
    [TransitionAction.SUBMIT]: { allowedActors: [ActorType.STUDENT], nextStatus: RequestStatus.PENDING_APPROVALS },
    [TransitionAction.STUDENT_CANCEL]: { allowedActors: [ActorType.STUDENT], nextStatus: RequestStatus.CANCELLED },
  },

  [RequestStatus.PENDING_APPROVALS]: {
    [TransitionAction.WARDEN_APPROVE]: { allowedActors: [ActorType.WARDEN], nextStatus: RequestStatus.APPROVED },
    [TransitionAction.WARDEN_REJECT]: { allowedActors: [ActorType.WARDEN], nextStatus: RequestStatus.REJECTED },
    [TransitionAction.STUDENT_CANCEL]: { allowedActors: [ActorType.STUDENT], nextStatus: RequestStatus.CANCELLED },
  },

  [RequestStatus.APPROVED]: {
    [TransitionAction.GATE_EXIT]: { allowedActors: [ActorType.SECURITY, ActorType.SYSTEM], nextStatus: RequestStatus.OUT_CONFIRMED },
    [TransitionAction.SYSTEM_EXPIRE]: { allowedActors: [ActorType.SYSTEM], nextStatus: RequestStatus.EXPIRED },
  },

  [RequestStatus.OUT_CONFIRMED]: {
    [TransitionAction.GATE_ENTRY]: { allowedActors: [ActorType.SECURITY, ActorType.SYSTEM], nextStatus: RequestStatus.RETURNED },
    [TransitionAction.SYSTEM_OVERDUE]: { allowedActors: [ActorType.SYSTEM], nextStatus: RequestStatus.OVERDUE },
  },

  [RequestStatus.OVERDUE]: {
    [TransitionAction.GATE_ENTRY]: { allowedActors: [ActorType.SECURITY, ActorType.SYSTEM], nextStatus: RequestStatus.RETURNED },
  },

  [RequestStatus.RETURNED]: {
    [TransitionAction.SYSTEM_COMPLETE]: { allowedActors: [ActorType.SYSTEM], nextStatus: RequestStatus.COMPLETED },
  },
};

// ─── Public Interface ─────────────────────────────────────────────────────────

export interface ExecuteTransitionParams {
  requestId: string;
  action: TransitionAction;
  actorType: ActorType;
  actorId?: string | null;
  note?: string;
  metadata?: Record<string, unknown>;
}

export async function executeTransition(params: ExecuteTransitionParams): Promise<LeaveRequest> {
  const { requestId, action, actorType, actorId, note, metadata } = params;

  const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
  if (!request) throw Errors.notFound('Leave request');

  if ((TERMINAL_STATES as string[]).includes(request.status)) {
    if (action === TransitionAction.STUDENT_CANCEL && request.status === RequestStatus.CANCELLED) return request;
    if (action === TransitionAction.WARDEN_REJECT && request.status === RequestStatus.REJECTED) return request;
    throw Errors.terminalState(request.status);
  }

  const progressiveStates: RequestStatus[] = [
    RequestStatus.DRAFT, RequestStatus.PENDING_APPROVALS, RequestStatus.APPROVED,
    RequestStatus.OUT_CONFIRMED, RequestStatus.RETURNED, RequestStatus.COMPLETED
  ];
  const currentStateIndex = progressiveStates.indexOf(request.status as RequestStatus);
  
  if (currentStateIndex !== -1) {
    if (action === TransitionAction.SUBMIT && currentStateIndex >= progressiveStates.indexOf(RequestStatus.PENDING_APPROVALS)) return request;
    if (action === TransitionAction.WARDEN_APPROVE && currentStateIndex >= progressiveStates.indexOf(RequestStatus.APPROVED)) return request;
  }

  const stateMap = TRANSITION_MAP[request.status as RequestStatus];
  if (!stateMap) throw Errors.invalidTransition(request.status, action);

  const rule = stateMap[action];
  if (!rule) throw Errors.invalidTransition(request.status, action);

  if (!rule.allowedActors.includes(actorType)) {
    throw Errors.unauthorizedTransition(actorType, action);
  }

  const updatedRequest = await db.$transaction(async (tx) => {
    let nextStatus = rule.nextStatus as RequestStatus;

    const updateData: Partial<{
      status: RequestStatus;
      ticketCode: string;
      isOverdue: boolean;
      actualReturnDatetime: Date;
      updatedAt: Date;
    }> = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (nextStatus === RequestStatus.APPROVED && !request.ticketCode) {
      updateData.ticketCode = generateTicketCode(request.id);
    }
    if (nextStatus === RequestStatus.RETURNED) {
      updateData.actualReturnDatetime = new Date();
    }
    if (nextStatus === RequestStatus.OVERDUE) {
      updateData.isOverdue = true;
    }

    const updateResult = await tx.leaveRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: updateData,
    });

    if (updateResult.count === 0) {
      throw Errors.conflict('Action failed due to a concurrent update. Please refresh.');
    }

    const updated = await tx.leaveRequest.findUnique({ where: { id: requestId } });
    if (!updated) throw Errors.notFound('Leave request after update');

    await tx.requestEventLog.create({
      data: {
        requestId,
        fromStatus: request.status,
        toStatus: nextStatus,
        actorType: actorType as unknown as import('@prisma/client').ActorType,
        actorId: actorId ?? null,
        note: note ?? null,
        metadata: metadata as import('@prisma/client').Prisma.InputJsonValue ?? undefined,
      },
    });

    return updated;
  });

  const eventName = STATUS_TO_EVENT[updatedRequest.status as RequestStatus];
  if (eventName) {
    setImmediate(() => {
      hostelEvents.emitTransition(eventName as any, {
        requestId,
        fromStatus: request.status,
        toStatus: updatedRequest.status,
        actorType,
        actorId: actorId ?? null,
        request: updatedRequest,
        timestamp: new Date(),
      });
    });
  }

  return updatedRequest;
}

function generateTicketCode(requestId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const suffix = requestId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `HMS-${ts}-${suffix}`;
}

export function isTransitionValid(currentStatus: RequestStatus, action: TransitionAction, actorType: ActorType): boolean {
  const stateMap = TRANSITION_MAP[currentStatus];
  if (!stateMap) return false;
  const rule = stateMap[action];
  if (!rule) return false;
  return rule.allowedActors.includes(actorType);
}

export function getAvailableActions(currentStatus: RequestStatus, actorType: ActorType): TransitionAction[] {
  const stateMap = TRANSITION_MAP[currentStatus];
  if (!stateMap) return [];
  return Object.entries(stateMap)
    .filter(([, rule]) => rule.allowedActors.includes(actorType))
    .map(([action]) => action as TransitionAction);
}
