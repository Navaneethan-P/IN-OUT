import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ─── SMS UTILITY ─────────────────────────────────────────────────────────────

async function sendSMS(phone: string, message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

  if (!apiKey) {
    console.log(`[SMS] No API key — would send to ${cleanPhone}: "${message}"`);
    return;
  }

  try {
    const body = new URLSearchParams({
      authorization: apiKey,
      message,
      language: 'english',
      route: 'q',
      numbers: cleanPhone,
    });

    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: body.toString(),
    });
    const json = await res.json() as { return: boolean; request_id?: string };
    if (json.return) {
      console.log(`[SMS] Sent to ${cleanPhone} | ID: ${json.request_id}`);
    } else {
      console.warn(`[SMS] Fast2SMS rejected request for ${cleanPhone}`, json);
    }
  } catch (err) {
    console.error(`[SMS] Failed to send to ${cleanPhone}:`, err);
  }
}

// ─── STUDENTS CRUD ──────────────────────────────────────────

// GET all students
app.get('/api/students', async (req: any, res: any) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST new student
app.post('/api/students', async (req: any, res: any) => {
  try {
    const student = await prisma.student.create({
      data: req.body
    });
    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create student. Roll No might exist.' });
  }
});

// PUT update student
app.put('/api/students/:id', async (req: any, res: any) => {
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE student
app.delete('/api/students/:id', async (req: any, res: any) => {
  try {
    await prisma.student.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ─── SCANNER API ────────────────────────────────────────────

// GET student info by Roll No
app.get('/api/scan/:rollNo', async (req: any, res: any) => {
  try {
    const student = await prisma.student.findUnique({
      where: { rollNo: req.params.rollNo },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!student) {
       res.status(404).json({ error: 'Student not found' });
       return;
    }

    const lastAction = student.logs.length > 0 ? student.logs[0].action : 'IN';
    res.json({ student, lastAction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark attendance — sends a REAL SMS to the parent via Fast2SMS
app.post('/api/scan', async (req: any, res: any) => {
  try {
    const { studentId, action } = req.body;

    const log = await prisma.gateLog.create({
      data: { studentId, action },
      include: { student: true }
    });

    // Build a human-friendly SMS message
    const timeStr = log.timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const smsMessage = action === 'OUT'
      ? `Your ward ${log.student.name} has LEFT the hostel campus at ${timeStr}. — College Gate System`
      : `Your ward ${log.student.name} has RETURNED to the hostel campus at ${timeStr}. — College Gate System`;

    // Fire-and-forget so the scan response is instant (< 200ms)
    sendSMS(log.student.parentPhone, smsMessage).catch(() => {});

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// ─── DASHBOARD API ──────────────────────────────────────────

app.get('/api/dashboard/history', async (req: any, res: any) => {
  try {
    const logs = await prisma.gateLog.findMany({
      include: { student: true },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.listen(PORT, () => {
  console.log(`GATE Backend Server running on http://localhost:${PORT}`);
});
