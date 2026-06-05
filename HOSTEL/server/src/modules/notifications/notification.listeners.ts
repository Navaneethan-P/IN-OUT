import { hostelEvents, EVENTS, TransitionEventPayload } from '../../services/events.service';
import { NotificationService } from '../../services/notification.service';
import db from '../../config/db';

/**
 * Register all event listeners for the Notification Engine
 */
export function registerNotificationListeners() {
  
  hostelEvents.onTransition(EVENTS.REQUEST_FINAL_APPROVED, async (payload: TransitionEventPayload) => {
    try {
      const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
      if (!student) return;

      const message = `Dear ${student.name}, your ${payload.request.type} request has been APPROVED. You can exit from ${payload.request.outDatetime.toLocaleString()}`;
      if (student.phone) {
        await NotificationService.sendSMS(student.phone, message);
      }
    } catch (err) {
      console.error('[NotificationError] Failed to send SMS for REQUEST_FINAL_APPROVED', err);
    }
  });

  hostelEvents.onTransition(EVENTS.STUDENT_EXITED, async (payload: TransitionEventPayload) => {
    try {
      const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
      if (!student) return;

      const message = `Security Alert: Your ward ${student.name} has exited the hostel campus at ${new Date().toLocaleString()}`;
      // Send to father/mother
      const parentPhone = student.fatherPhone || student.motherPhone;
      if (parentPhone) {
        await NotificationService.sendSMS(parentPhone, message);
        await NotificationService.sendWhatsApp(parentPhone, 'student_exit_alert', {
          student_name: student.name,
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error('[NotificationError] Failed to notify parent for STUDENT_EXITED', err);
    }
  });

  hostelEvents.onTransition(EVENTS.STUDENT_RETURNED, async (payload: TransitionEventPayload) => {
    try {
      const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
      if (!student) return;

      const message = `Security Alert: Your ward ${student.name} has safely returned to the hostel campus at ${new Date().toLocaleString()}`;
      const parentPhone = student.fatherPhone || student.motherPhone;
      if (parentPhone) {
        await NotificationService.sendSMS(parentPhone, message);
      }
    } catch (err) {
      console.error('[NotificationError] Failed to notify parent for STUDENT_RETURNED', err);
    }
  });

  hostelEvents.onTransition(EVENTS.REQUEST_OVERDUE, async (payload: TransitionEventPayload) => {
    try {
      const [student, settings] = await Promise.all([
        db.student.findUnique({ where: { id: payload.request.studentId } }),
        db.systemSettings.findUnique({ where: { id: 1 } }),
      ]);
      if (!student) return;

      const overdueMsg = `URGENT: Your ward ${student.name} (${student.rollNumber}) has NOT returned to the hostel on time. Please contact them immediately.`;
      const parentPhone = student.fatherPhone || student.motherPhone;
      if (parentPhone) {
        await NotificationService.sendSMS(parentPhone, overdueMsg);
      }

      // Notify the warden using the phone number stored in system settings
      if (settings?.wardenPhone) {
        const wardenMsg = `[OVERDUE ALERT] Student ${student.name} (${student.rollNumber}, ${student.department} Year ${student.year}) has NOT returned on time.`;
        await NotificationService.sendSMS(settings.wardenPhone, wardenMsg);
      }
    } catch (err) {
      console.error('[NotificationError] Failed to send notifications for REQUEST_OVERDUE', err);
    }
  });

  hostelEvents.onTransition(EVENTS.PARENT_VERIFICATION_NEEDED, async (payload: TransitionEventPayload) => {
    try {
      const student = await db.student.findUnique({ where: { id: payload.request.studentId } });
      if (!student) return;

      const parentPhone = student.fatherPhone || student.motherPhone;
      if (parentPhone) {
        await NotificationService.sendWhatsApp(parentPhone, 'parent_verification_request', {
          student_name: student.name,
          request_type: payload.request.type,
          link: `https://hostel.edu/verify/${payload.request.id}`
        });
      }
    } catch (err) {
      console.error('[NotificationError] Failed to notify parent for PARENT_VERIFICATION_NEEDED', err);
    }
  });

  console.log('[NotificationEngine] Registered all event listeners.');
}
