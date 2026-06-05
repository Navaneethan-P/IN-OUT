import { Response } from 'express';
import { AuthRequest } from '../../types/auth.types';
import db from '../../config/db';
import { AppError } from '../../utils/errors';
import { executeTransition } from '../../services/transition.service';
import { TransitionAction, ActorType } from '@hostel/shared';

export class GateController {
  
  scanExit = async (req: AuthRequest, res: Response) => {
    const { rollNumber } = req.body;
    const guardId = req.user!.id;

    // 1. Find student
    const student = await db.student.findUnique({
      where: { rollNumber }
    });

    if (!student) {
      throw new AppError('Student not found with this roll number', 404);
    }

    // 2. Find active APPROVED request
    const request = await db.leaveRequest.findFirst({
      where: {
        studentId: student.id,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      // Log unauthorized attempt
      await db.attendanceLog.create({
        data: {
          studentId: student.id,
          eventType: 'EXIT',
          scanMethod: 'ROLL_NUMBER',
          scannedById: guardId,
          isAuthorized: false,
          notes: 'No APPROVED request found'
        }
      });
      throw new AppError('EXIT DENIED: No approved request found.', 403);
    }

    // 3. Validate Timing
    const now = new Date();
    // Allow scanning out up to 30 mins before outDatetime
    const earlyWindow = new Date(request.outDatetime);
    earlyWindow.setMinutes(earlyWindow.getMinutes() - 30);
    
    if (now < earlyWindow) {
      await db.attendanceLog.create({
        data: {
          studentId: student.id,
          requestId: request.id,
          eventType: 'EXIT',
          scanMethod: 'ROLL_NUMBER',
          scannedById: guardId,
          isAuthorized: false,
          notes: 'Attempted to exit too early'
        }
      });
      throw new AppError(`EXIT DENIED: Too early. Valid from ${earlyWindow.toLocaleTimeString()}`, 403);
    }

    // If expected return time passed, they can't exit
    if (now > request.expectedReturnDatetime) {
      await db.attendanceLog.create({
        data: {
          studentId: student.id,
          requestId: request.id,
          eventType: 'EXIT',
          scanMethod: 'ROLL_NUMBER',
          scannedById: guardId,
          isAuthorized: false,
          notes: 'Request has expired'
        }
      });
      // The cron should catch this, but just in case
      await executeTransition({
        requestId: request.id,
        action: TransitionAction.SYSTEM_EXPIRE,
        actorType: ActorType.SYSTEM
      });
      throw new AppError('EXIT DENIED: Request window has expired.', 403);
    }

    // 4. Transition State & Create Log
    
    // We do the transition. If they click twice fast, the executeTransition prevents race conditions.
    await executeTransition({
      requestId: request.id,
      action: TransitionAction.GATE_EXIT,
      actorType: ActorType.SECURITY,
      actorId: guardId,
      note: 'Gate exit scan'
    });

    // Create the successful log
    await db.attendanceLog.create({
      data: {
        studentId: student.id,
        requestId: request.id,
        eventType: 'EXIT',
        scanMethod: 'ROLL_NUMBER',
        scannedById: guardId,
        isAuthorized: true
      }
    });

    res.json({
      success: true,
      data: {
        studentName: student.name,
        roomNo: student.roomId,
        type: request.type,
        returnTime: request.expectedReturnDatetime
      }
    });
  };

  scanEntry = async (req: AuthRequest, res: Response) => {
    const { rollNumber } = req.body;
    const guardId = req.user!.id;

    const student = await db.student.findUnique({
      where: { rollNumber }
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Find active OUT_CONFIRMED (or OVERDUE) request
    const request = await db.leaveRequest.findFirst({
      where: {
        studentId: student.id,
        status: {
          in: ['OUT_CONFIRMED', 'OVERDUE']
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      // Just logging an entry when they aren't out officially
      await db.attendanceLog.create({
        data: {
          studentId: student.id,
          eventType: 'ENTRY',
          scanMethod: 'ROLL_NUMBER',
          scannedById: guardId,
          isAuthorized: false,
          notes: 'Returned but was never marked OUT'
        }
      });
      throw new AppError('ENTRY DENIED: Student is not marked as currently out.', 403);
    }

    // Transition State
    await executeTransition({
      requestId: request.id,
      action: TransitionAction.GATE_ENTRY,
      actorType: ActorType.SECURITY,
      actorId: guardId,
      note: 'Gate entry scan'
    });

    // Update actual return time
    await db.leaveRequest.update({
      where: { id: request.id },
      data: { actualReturnDatetime: new Date() }
    });

    // Create successful log
    await db.attendanceLog.create({
      data: {
        studentId: student.id,
        requestId: request.id,
        eventType: 'ENTRY',
        scanMethod: 'ROLL_NUMBER',
        scannedById: guardId,
        isAuthorized: true
      }
    });

    res.json({
      success: true,
      data: {
        studentName: student.name,
        roomNo: student.roomId,
        wasOverdue: request.isOverdue
      }
    });
  };

}
