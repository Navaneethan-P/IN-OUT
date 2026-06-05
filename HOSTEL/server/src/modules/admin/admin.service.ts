import bcrypt from 'bcryptjs';
import db from '../../config/db';
import { Errors } from '../../utils/errors';
import { StaffRole } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

export async function createStudent(data: any) {
  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Default block logic based on room number can be here if needed
  // For simplicity, we just create the student

  // Ensure room exists, or create placeholder
  let roomId = null;
  if (data.roomNumber) {
    let room = await db.hostelRoom.findUnique({
      where: { roomNumber: data.roomNumber }
    });
    if (!room) {
      room = await db.hostelRoom.create({
        data: {
          roomNumber: data.roomNumber,
          capacity: 3,
        }
      });
    }
    roomId = room.id;
  }

  const student = await db.student.create({
    data: {
      name: data.name,
      rollNumber: data.rollNumber.toUpperCase(),
      fatherPhone: data.parentsNo, // mapping parentsNo to fatherPhone
      department: data.department,
      year: parseInt(data.year, 10),
      hostelType: data.hostelType === 'MANAGEMENT' ? 'MANAGEMENT' : 'MERIT',
      passwordHash,
      roomId
    }
  });

  return student;
}

export async function createStaff(data: any) {
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const staff = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role as StaffRole,
      passwordHash
    }
  });

  return staff;
}
