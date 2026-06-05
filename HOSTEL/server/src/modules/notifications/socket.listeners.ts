import { hostelEvents, EVENTS, TransitionEventPayload } from '../../services/events.service';
import { SocketService } from '../../services/socket.service';
import db from '../../config/db';

export function registerSocketListeners() {
  
  // 1. A new request is submitted -> Broadcast to WARDEN room and specific student HOD / PLACEMENT rooms
  hostelEvents.onTransition(EVENTS.REQUEST_SUBMITTED, async (payload: TransitionEventPayload) => {
    try {
      const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
      if (!student) return;

      const eventPayload = {
        requestId: payload.requestId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        type: payload.request.type,
        outDatetime: payload.request.outDatetime
      };

      // Broadcast to Wardens
      SocketService.sendToRoom('role:warden', 'request:new', eventPayload);

      // Broadcast to specific HOD (if HOD is required)
      SocketService.sendToRoom(`role:hod:${student.department}`, 'request:new', eventPayload);

      // Broadcast to Placement (if placement is required)
      SocketService.sendToRoom('role:placement', 'request:new', eventPayload);
    } catch (err) {
      console.error('[SocketListenerError] Failed to emit request:new', err);
    }
  });

  // 2. Request is updated (e.g. approved, rejected, cancelled, overdue) -> Broadcast to specific student
  const updateEvents = [
    EVENTS.REQUEST_FINAL_APPROVED,
    EVENTS.REQUEST_REJECTED,
    EVENTS.REQUEST_CANCELLED,
    EVENTS.REQUEST_OVERDUE
  ];

  for (const event of updateEvents) {
    hostelEvents.onTransition(event, async (payload: TransitionEventPayload) => {
      try {
        const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
        if (!student) return;

        const eventPayload = {
          requestId: payload.requestId,
          status: payload.toStatus,
          actorType: payload.actorType
        };

        // Notify student room
        SocketService.sendToRoom(`student:${student.id}`, 'request:updated', eventPayload);

        // Notify Wardens if request becomes overdue or changes status
        SocketService.sendToRoom('role:warden', 'request:updated', eventPayload);
        
        // Notify HOD and Placement rooms too so their queues automatically refresh in real time
        SocketService.sendToRoom(`role:hod:${student.department}`, 'request:updated', eventPayload);
        SocketService.sendToRoom('role:placement', 'request:updated', eventPayload);
      } catch (err) {
        console.error(`[SocketListenerError] Failed to emit request:updated for ${event}`, err);
      }
    });
  }

  console.log('[SocketEngine] Registered all event-driven Socket listeners.');
}
