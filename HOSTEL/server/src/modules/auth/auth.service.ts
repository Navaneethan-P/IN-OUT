import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';
import { env } from '../../config/env';
import { AuthPayload } from '../../types/auth.types';
import { Errors } from '../../utils/errors';

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

// ─── Student Login ────────────────────────────────────────────────────────────
export async function studentLogin(rollNumber: string, password: string) {
  const student = await db.student.findUnique({
    where: { rollNumber },
    include: { room: true },
  });

  if (!student || !student.isActive) {
    throw Errors.unauthorized('Invalid roll number or password');
  }

  const passwordMatch = await bcrypt.compare(password, student.passwordHash);
  if (!passwordMatch) {
    throw Errors.unauthorized('Invalid roll number or password');
  }

  const payload: AuthPayload = {
    id: student.id,
    role: 'STUDENT',
    type: 'student',
  };

  const accessToken = signToken(payload);

  // Update last login
  await db.student.update({
    where: { id: student.id },
    data: { updatedAt: new Date() },
  });

  return {
    accessToken,
    user: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      year: student.year,
      section: student.section,
      room: student.room?.roomNumber ?? null,
      role: 'STUDENT',
    },
  };
}

// ─── Staff Login ──────────────────────────────────────────────────────────────
export async function staffLogin(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw Errors.unauthorized('Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw Errors.unauthorized('Invalid email or password');
  }

  const payload: AuthPayload = {
    id: user.id,
    role: user.role as AuthPayload['role'],
    type: 'staff',
  };

  const accessToken = signToken(payload);

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

// ─── Scan Login (QR / RFID on identity card) ──────────────────────────────────
export async function scanLogin(qrToken: string) {
  const student = await db.student.findUnique({
    where: { qrToken },
    include: { room: true },
  });

  if (!student || !student.isActive) {
    throw Errors.unauthorized('QR token not recognized');
  }

  const payload: AuthPayload = {
    id: student.id,
    role: 'STUDENT',
    type: 'student',
  };

  // Scan logins get shorter 1-hour tokens — for kiosk use
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });

  return {
    accessToken,
    user: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      year: student.year,
      room: student.room?.roomNumber ?? null,
      role: 'STUDENT',
    },
  };
}
