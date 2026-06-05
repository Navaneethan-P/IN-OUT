/**
 * EXPORT SERVICE
 * Generates CSV reports for Warden dashboard downloads.
 * Supports: leave requests, student list, overdue report, audit trail.
 * No external dependencies — pure CSV generation using built-in JS.
 */

import db from '../../config/db';

// ─── CSV Utilities ─────────────────────────────────────────────────────────────

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Export: All Leave Requests ───────────────────────────────────────────────

export async function exportRequests(filters: {
  status?: string;
  department?: string;
  year?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<{ csv: string; filename: string }> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.department) where.student = { department: filters.department };
  if (filters.year) {
    where.student = { ...((where.student as object) ?? {}), year: filters.year };
  }
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate + 'T23:59:59') } : {}),
    };
  }

  const requests = await db.leaveRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000, // Safety cap
    include: {
      student: {
        select: {
          name: true,
          rollNumber: true,
          department: true,
          year: true,
          phone: true,
          fatherPhone: true,
          room: { select: { roomNumber: true } },
        },
      },
    },
  });

  const headers = [
    'TicketCode',
    'StudentName',
    'RollNumber',
    'Department',
    'Year',
    'Room',
    'Phone',
    'ParentPhone',
    'Type',
    'Status',
    'Reason',
    'Destination',
    'OutDateTime',
    'ExpectedReturn',
    'ActualReturn',
    'IsOverdue',
    'SubmittedAt',
  ];

  const rows = requests.map((r) => ({
    TicketCode: r.ticketCode ?? '',
    StudentName: r.student.name,
    RollNumber: r.student.rollNumber,
    Department: r.student.department,
    Year: r.student.year,
    Room: r.student.room?.roomNumber ?? '',
    Phone: r.student.phone ?? '',
    ParentPhone: r.student.fatherPhone,
    Type: r.type,
    Status: r.status,
    Reason: r.reason,
    Destination: r.place,
    OutDateTime: formatDate(r.outDatetime),
    ExpectedReturn: formatDate(r.expectedReturnDatetime),
    ActualReturn: formatDate(r.actualReturnDatetime),
    IsOverdue: r.isOverdue ? 'YES' : 'NO',
    SubmittedAt: formatDate(r.createdAt),
  }));

  const date = new Date().toISOString().split('T')[0];
  return {
    csv: toCSV(headers, rows),
    filename: `leave_requests_${date}.csv`,
  };
}

// ─── Export: Student Directory ─────────────────────────────────────────────────

export async function exportStudents(filters: {
  department?: string;
  year?: number;
}): Promise<{ csv: string; filename: string }> {
  const where: Record<string, unknown> = { isActive: true };
  if (filters.department) where.department = filters.department;
  if (filters.year) where.year = filters.year;

  const students = await db.student.findMany({
    where,
    orderBy: [{ department: 'asc' }, { year: 'asc' }, { name: 'asc' }],
    include: {
      room: { select: { roomNumber: true } },
      leaveRequests: {
        where: { status: { in: ['PENDING_APPROVALS', 'APPROVED', 'OUT_CONFIRMED', 'OVERDUE'] } },
        select: { status: true },
        take: 1,
      },
    },
  });

  const headers = [
    'RollNumber',
    'Name',
    'Department',
    'Year',
    'Section',
    'Room',
    'StudentPhone',
    'FatherName',
    'FatherPhone',
    'MotherPhone',
    'Email',
    'CurrentStatus',
  ];

  const rows = students.map((s) => ({
    RollNumber: s.rollNumber,
    Name: s.name,
    Department: s.department,
    Year: s.year,
    Section: s.section ?? '',
    Room: s.room?.roomNumber ?? 'Not Assigned',
    StudentPhone: s.phone ?? '',
    FatherName: s.fatherName ?? '',
    FatherPhone: s.fatherPhone,
    MotherPhone: s.motherPhone ?? '',
    Email: s.email ?? '',
    CurrentStatus:
      s.leaveRequests.length > 0 ? s.leaveRequests[0].status : 'IN_HOSTEL',
  }));

  const date = new Date().toISOString().split('T')[0];
  return {
    csv: toCSV(headers, rows),
    filename: `students_directory_${date}.csv`,
  };
}

// ─── Export: Overdue Report ────────────────────────────────────────────────────

export async function exportOverdueReport(): Promise<{ csv: string; filename: string }> {
  const overdueRequests = await db.leaveRequest.findMany({
    where: { status: { in: ['OVERDUE', 'OUT_CONFIRMED'] } },
    orderBy: { expectedReturnDatetime: 'asc' },
    include: {
      student: {
        select: {
          name: true,
          rollNumber: true,
          department: true,
          year: true,
          phone: true,
          fatherPhone: true,
          motherPhone: true,
        },
      },
    },
  });

  const now = new Date();
  const headers = [
    'TicketCode',
    'StudentName',
    'RollNumber',
    'Department',
    'Year',
    'StudentPhone',
    'FatherPhone',
    'MotherPhone',
    'Status',
    'ExpectedReturn',
    'HoursOverdue',
    'Destination',
  ];

  const rows = overdueRequests.map((r) => {
    const expectedReturn = new Date(r.expectedReturnDatetime);
    const hoursOverdue =
      r.status === 'OVERDUE'
        ? Math.round((now.getTime() - expectedReturn.getTime()) / 3600000 * 10) / 10
        : 0;
    return {
      TicketCode: r.ticketCode ?? '',
      StudentName: r.student.name,
      RollNumber: r.student.rollNumber,
      Department: r.student.department,
      Year: r.student.year,
      StudentPhone: r.student.phone ?? '',
      FatherPhone: r.student.fatherPhone,
      MotherPhone: r.student.motherPhone ?? '',
      Status: r.status,
      ExpectedReturn: formatDate(r.expectedReturnDatetime),
      HoursOverdue: hoursOverdue > 0 ? `${hoursOverdue}h` : 'On time',
      Destination: r.place,
    };
  });

  const date = new Date().toISOString().split('T')[0];
  return {
    csv: toCSV(headers, rows),
    filename: `overdue_report_${date}.csv`,
  };
}

// ─── Export: Audit Trail ───────────────────────────────────────────────────────

export async function exportAuditTrail(filters: {
  fromDate?: string;
  toDate?: string;
}): Promise<{ csv: string; filename: string }> {
  const where: Record<string, unknown> = {};
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate + 'T23:59:59') } : {}),
    };
  }

  const logs = await db.requestEventLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000,
    include: {
      request: {
        select: {
          ticketCode: true,
          student: { select: { name: true, rollNumber: true } },
        },
      },
    },
  });

  const headers = [
    'Timestamp',
    'TicketCode',
    'StudentName',
    'RollNumber',
    'FromStatus',
    'ToStatus',
    'ActorType',
    'Note',
  ];

  const rows = logs.map((l) => ({
    Timestamp: formatDate(l.createdAt),
    TicketCode: l.request.ticketCode ?? '',
    StudentName: l.request.student.name,
    RollNumber: l.request.student.rollNumber,
    FromStatus: l.fromStatus ?? 'NEW',
    ToStatus: l.toStatus,
    ActorType: l.actorType,
    Note: l.note ?? '',
  }));

  const date = new Date().toISOString().split('T')[0];
  return {
    csv: toCSV(headers, rows),
    filename: `audit_trail_${date}.csv`,
  };
}
