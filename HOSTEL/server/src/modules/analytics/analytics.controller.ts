import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/auth.types';
import { sendSuccess } from '../../utils/response';
import db from '../../config/db';

/**
 * GET /api/v1/analytics
 * Compiles real-time aggregated metrics for the staff dashboard:
 * 1. Total active students.
 * 2. Campus presence: INSIDE, OUTSIDE, OVERDUE.
 * 3. Mess attendance forecast for tonight.
 * 4. Approval/Rejection ratios.
 */
export async function getDashboardStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Total active students.
    const totalStudents = await db.student.count({
      where: { isActive: true }
    });

    // 2. Campus presence tracking
    const overdueCount = await db.leaveRequest.count({
      where: { status: 'OVERDUE' }
    });

    const outsideCount = await db.leaveRequest.count({
      where: { status: 'OUT_CONFIRMED' }
    });

    const insideCount = Math.max(0, totalStudents - overdueCount - outsideCount);

    // 3. Mess forecast: Count of students expected to dine on campus tonight.
    // We define dinner peak at 8:00 PM tonight. Any approved, outside, or overdue leave
    // spanning this period means they are dining away.
    const tonightDinner = new Date();
    tonightDinner.setHours(20, 0, 0, 0);

    const absentTonightCount = await db.leaveRequest.count({
      where: {
        status: { in: ['APPROVED', 'OUT_CONFIRMED', 'OVERDUE'] },
        outDatetime: { lte: tonightDinner },
        expectedReturnDatetime: { gte: tonightDinner }
      }
    });

    const messForecast = Math.max(0, totalStudents - absentTonightCount);

    // 4. Approval Metrics
    const approvedCount = await db.leaveRequest.count({
      where: {
        status: { in: ['APPROVED', 'OUT_CONFIRMED', 'RETURNED', 'COMPLETED', 'OVERDUE'] }
      }
    });

    const rejectedCount = await db.leaveRequest.count({
      where: { status: 'REJECTED' }
    });

    const pendingCount = await db.leaveRequest.count({
      where: { status: 'PENDING_APPROVALS' }
    });

    const stats = {
      totalStudents,
      presence: {
        inside: insideCount,
        outside: outsideCount,
        overdue: overdueCount
      },
      messForecast,
      approvals: {
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount
      }
    };

    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}
