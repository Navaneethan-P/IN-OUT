/**
 * SEED SCRIPT — Development data for testing all roles and flows
 *
 * Run: npm run db:seed --workspace=server
 * (or from server/): npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'password123';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function main() {
  console.log('[SEED] Starting database seed...');

  const hash = await hashPassword(DEFAULT_PASSWORD);

  // ─── Clean existing data ────────────────────────────────────────────────────
  await db.notification.deleteMany();
  await db.attendanceLog.deleteMany();
  await db.parentVerification.deleteMany();
  await db.approval.deleteMany();
  await db.requestEventLog.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.student.deleteMany();
  await db.hostelRoom.deleteMany();
  await db.systemSettings.deleteMany();
  await db.user.deleteMany();

  console.log('[SEED] Cleared existing data.');

  // ─── Staff Users ────────────────────────────────────────────────────────────
  const admin = await db.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@hostel.edu',
      phone: '9000000001',
      role: 'ADMIN',
      passwordHash: hash,
    },
  });

  const warden = await db.user.create({
    data: {
      name: 'Mr. Suresh',
      email: 'warden@hostel.edu',
      phone: '9000000002',
      role: 'WARDEN',
      passwordHash: hash,
    },
  });

  await db.user.create({
    data: {
      name: 'Gate Security Officer',
      email: 'gate@hostel.edu',
      phone: '9000000006',
      role: 'SECURITY',
      passwordHash: hash,
    },
  });

  console.log('[SEED] Created 3 staff users.');

  // ─── Hostel Rooms ────────────────────────────────────────────────────────────
  const roomA101 = await db.hostelRoom.create({
    data: { roomNumber: 'A-101', floor: 1, block: 'A', capacity: 3 },
  });

  console.log('[SEED] Created 1 room.');

  // ─── Students ────────────────────────────────────────────────────────────────
  await db.student.createMany({
    data: [
      {
        rollNumber: '22BIT0001',
        name: 'Navaneethan',
        phone: '9111111001',
        fatherName: 'Prakash',
        fatherPhone: '9222221001',
        motherName: 'Mother',
        motherPhone: '9222221002',
        email: 'navaneethan@student.edu',
        roomId: roomA101.id,
        department: 'IT',
        year: 3,
        section: 'A',
        passwordHash: hash,
      }
    ],
  });

  console.log('[SEED] Created 1 student.');

  // ─── System Settings ─────────────────────────────────────────────────────────
  await db.systemSettings.create({
    data: {
      id: 1,
      hostelName: 'Engineering College Boys Hostel',
      wardenPhone: warden.phone!,
      isWorkingDay: true,
      defaultOutingLimitHours: 12,
      overdueCheckIntervalMins: 15,
      smsEnabled: false,
      whatsappEnabled: false,
      updatedById: admin.id,
    },
  });

  console.log('[SEED] Created system settings.');

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n[SEED] ✅ Database seeded successfully!\n');
  console.log('═══════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS (all roles)');
  console.log('───────────────────────────────────────');
  console.log('  Password for ALL accounts: password123\n');
  console.log('  STAFF (use email):');
  console.log('  admin@hostel.edu       → ADMIN');
  console.log('  warden@hostel.edu      → WARDEN (Suresh)');
  console.log('  gate@hostel.edu        → SECURITY\n');
  console.log('  STUDENTS (use roll number):');
  console.log('  22BIT0001  → Navaneethan (IT, Year 3)');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('[SEED] ❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
