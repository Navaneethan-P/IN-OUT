import db from '../../config/db';
import { Errors } from '../../utils/errors';

// ─── Get student profile ──────────────────────────────────────────────────────
export async function getProfile(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      rollNumber: true,
      name: true,
      department: true,
      year: true,
      section: true,
      phone: true,
      email: true,
      fatherName: true,
      fatherPhone: true,
      motherName: true,
      motherPhone: true,
      qrToken: true,
      isActive: true,
      createdAt: true,
      room: {
        select: { roomNumber: true, block: true, floor: true },
      },
    },
  });

  if (!student) throw Errors.notFound('Student');
  return student;
}

// ─── Get student's gate logs ──────────────────────────────────────────────────
export async function getGateLogs(studentId: string, limit = 20) {
  return db.attendanceLog.findMany({
    where: { studentId },
    orderBy: { scannedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      eventType: true,
      scanMethod: true,
      location: true,
      isAuthorized: true,
      scannedAt: true,
      request: {
        select: { type: true, place: true },
      },
    },
  });
}
