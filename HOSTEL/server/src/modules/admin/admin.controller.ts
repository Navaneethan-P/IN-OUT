import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as adminService from './admin.service';
import { sendSuccess } from '../../utils/response';

const createStudentSchema = z.object({
  name: z.string().min(2),
  rollNumber: z.string().min(5),
  password: z.string().min(4),
  parentsNo: z.string().min(10),
  roomNumber: z.string().min(1).optional(),
  department: z.string().min(2),
  year: z.number().or(z.string()).transform(v => Number(v)),
  hostelType: z.enum(['MERIT', 'MANAGEMENT'])
});

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4),
  role: z.enum(['WARDEN', 'SECURITY', 'ADMIN'])
});

export async function createStudentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createStudentSchema.parse(req.body);
    const result = await adminService.createStudent(data);
    sendSuccess(res, result, 'Student created successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function createStaffHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createStaffSchema.parse(req.body);
    const result = await adminService.createStaff(data);
    sendSuccess(res, result, 'Staff created successfully', 201);
  } catch (err) {
    next(err);
  }
}
