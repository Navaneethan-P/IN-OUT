/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   GATE SCANNER AUDIT — Full Black & White Test Suite        ║
 * ║   Tests: Exit, Entry, Anti-Passback, Early Scan, Auth       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Run: npx tsx test-gate.ts
 * Requires: server running on localhost:3000
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });
const prisma = new PrismaClient();

// ─── Assert helper — halts on failure ────────────────────────────────────────
function assert(condition: boolean, message: string, extra?: any) {
  if (!condition) {
    console.error(`\n❌ GATE TEST FAILED: ${message}`);
    if (extra !== undefined) {
      console.error('   Detail:', JSON.stringify(extra, null, 2));
    }
    process.exit(1);
  } else {
    console.log(`   ✅ ${message}`);
  }
}

async function runGateTests() {
  console.log('\n🔥 RUNNING HOSTILE GATE AUDIT 🔥\n');

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  // Gate guard login
  const securityRes = await api.post('/auth/staff/login', { email: 'gate@hostel.edu', password: 'password123' });
  assert(securityRes.status === 200, 'Gate guard login → 200 OK', securityRes.data);
  const gateToken = securityRes.data.data.accessToken;
  api.defaults.headers.common['Authorization'] = `Bearer ${gateToken}`;

  // Warden token for setup
  const wardenRes = await api.post('/auth/staff/login', { email: 'warden@hostel.edu', password: 'password123' });
  assert(wardenRes.status === 200, 'Warden login → 200 OK');
  const wardenToken = wardenRes.data.data.accessToken;

  // ─── RESET TEST STATE ─────────────────────────────────────────────────────
  const rollNumber = '22BIT0001';
  const student = await prisma.student.findUnique({ where: { rollNumber } });
  assert(!!student, `Student ${rollNumber} exists in DB`);

  const requests = await prisma.leaveRequest.findMany({ where: { studentId: student!.id } });
  const requestIds = requests.map(r => r.id);

  if (requestIds.length > 0) {
    await prisma.requestApproval.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.requestEventLog.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.attendanceLog.deleteMany({ where: { studentId: student!.id } });
    await prisma.parentVerification.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.approval.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.notification.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.leaveRequest.deleteMany({ where: { studentId: student!.id } });
  }
  console.log('   ✅ Test state reset cleanly\n');

  // =========================================================================
  // TEST 1: Exit scan with NO approved request → 403 DENIED
  // =========================================================================
  console.log('━━━ TEST 1: Exit with no approved request ━━━');
  const res1 = await api.post('/gate/scan-exit', { rollNumber });
  assert(res1.status === 403, `No-request exit denied → 403 (got ${res1.status})`);

  // ─── Create an APPROVED request with outDatetime in the past (valid window) ─
  const now = new Date();
  const outTime = new Date(now.getTime() - 10 * 60 * 1000);   // 10 min ago
  const inTime = new Date(now.getTime() + 60 * 60 * 1000);    // 1 hour from now

  const req1 = await prisma.leaveRequest.create({
    data: {
      studentId: student!.id,
      type: 'OUTING',
      reason: 'Gate Test',
      place: 'Test Gate',
      outDatetime: outTime,
      expectedReturnDatetime: inTime,
      status: 'APPROVED',
      requiresHodApproval: false,
      requiresPlacementApproval: false,
      ticketCode: `HMS-GATETEST-${Date.now()}`
    }
  });
  console.log('\n   ✅ APPROVED request seeded directly into DB');

  // =========================================================================
  // TEST 2: Valid Exit Scan → 200 OK & status = OUT_CONFIRMED
  // =========================================================================
  console.log('\n━━━ TEST 2: Valid exit scan ━━━');
  const res2 = await api.post('/gate/scan-exit', { rollNumber });
  assert(res2.status === 200, `Valid exit scan → 200 OK (got ${res2.status})`, res2.data);

  const afterExit = await prisma.leaveRequest.findUnique({ where: { id: req1.id } });
  assert(afterExit!.status === 'OUT_CONFIRMED', `DB status → OUT_CONFIRMED (got ${afterExit!.status})`);
  assert(!!res2.data.data.studentName, 'Response includes student name');

  // =========================================================================
  // TEST 3: Anti-Passback — Second Exit Scan → 403 DENIED
  // =========================================================================
  console.log('\n━━━ TEST 3: Anti-passback (double exit) ━━━');
  const res3 = await api.post('/gate/scan-exit', { rollNumber });
  assert(res3.status === 403, `Double exit denied → 403 (got ${res3.status})`);

  // =========================================================================
  // TEST 4: Valid Entry Scan → 200 OK & status = RETURNED
  // =========================================================================
  console.log('\n━━━ TEST 4: Valid entry scan ━━━');
  const res4 = await api.post('/gate/scan-entry', { rollNumber });
  assert(res4.status === 200, `Valid entry scan → 200 OK (got ${res4.status})`, res4.data);

  const afterEntry = await prisma.leaveRequest.findUnique({ where: { id: req1.id } });
  assert(afterEntry!.status === 'RETURNED', `DB status → RETURNED (got ${afterEntry!.status})`);
  assert(afterEntry!.actualReturnDatetime !== null, 'actualReturnDatetime recorded');

  // =========================================================================
  // TEST 5: Double Entry → 403 DENIED
  // =========================================================================
  console.log('\n━━━ TEST 5: Double entry (anti-passback) ━━━');
  const res5 = await api.post('/gate/scan-entry', { rollNumber });
  assert(res5.status === 403, `Double entry denied → 403 (got ${res5.status})`);

  // =========================================================================
  // TEST 6: Exit scan TOO EARLY → 403 DENIED
  // =========================================================================
  console.log('\n━━━ TEST 6: Exit scan too early (>30min window) ━━━');
  const futureOut = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const futureIn = new Date(now.getTime() + 3 * 60 * 60 * 1000);  // 3 hours from now

  await prisma.leaveRequest.create({
    data: {
      studentId: student!.id,
      type: 'OUTING',
      reason: 'Early Scan Test',
      place: 'Early Test',
      outDatetime: futureOut,
      expectedReturnDatetime: futureIn,
      status: 'APPROVED',
      requiresHodApproval: false,
      requiresPlacementApproval: false,
      ticketCode: `HMS-EARLYTEST-${Date.now()}`
    }
  });

  const res6 = await api.post('/gate/scan-exit', { rollNumber });
  assert(res6.status === 403, `Too-early exit denied → 403 (got ${res6.status})`);

  // =========================================================================
  // TEST 7: Gate route requires authentication → 401
  // =========================================================================
  console.log('\n━━━ TEST 7: Unauthenticated gate access ━━━');
  const unauthedApi = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });
  const res7 = await unauthedApi.post('/gate/scan-exit', { rollNumber });
  assert(res7.status === 401, `No token → 401 Unauthorized (got ${res7.status})`);

  // =========================================================================
  // TEST 8: Student token cannot access gate route → 403
  // =========================================================================
  console.log('\n━━━ TEST 8: Student token rejected at gate ━━━');
  const studentLoginRes = await unauthedApi.post('/auth/student/login', { rollNumber: '22BIT0001', password: 'password123' });
  const studentToken = studentLoginRes.data.data.accessToken;
  const res8 = await unauthedApi.post('/gate/scan-exit', { rollNumber }, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(res8.status === 403, `Student token at gate → 403 Forbidden (got ${res8.status})`);

  // =========================================================================
  // TEST 9: Audit Log Verification
  // =========================================================================
  console.log('\n━━━ TEST 9: Attendance log audit trail ━━━');
  const logs = await prisma.attendanceLog.findMany({
    where: { studentId: student!.id },
    orderBy: { scannedAt: 'asc' }
  });

  // Expected logs:
  // 1. Unauthorized exit (no request) — Test 1
  // 2. Authorized exit → OUT_CONFIRMED — Test 2
  // 3. Unauthorized exit (already out) — Test 3
  // 4. Authorized entry → RETURNED — Test 4
  // 5. Unauthorized entry (not out) — Test 5
  // 6. Unauthorized exit (too early) — Test 6
  assert(logs.length >= 4, `At least 4 attendance log entries created (got ${logs.length})`);

  const authorizedLogs = logs.filter(l => l.isAuthorized);
  const deniedLogs = logs.filter(l => !l.isAuthorized);
  assert(authorizedLogs.length >= 2, `At least 2 authorized scans logged (exit + entry) — got ${authorizedLogs.length}`);
  assert(deniedLogs.length >= 2, `At least 2 denied scans logged — got ${deniedLogs.length}`);

  console.log(`   Detail: ${authorizedLogs.length} authorized, ${deniedLogs.length} denied, ${logs.length} total`);

  // =========================================================================
  // DONE
  // =========================================================================
  await prisma.$disconnect();
  console.log('\n' + '═'.repeat(60));
  console.log('  ⭐  ALL GATE ATTACK TESTS PASSED! GATE IS IRONCLAD.  ⭐');
  console.log('═'.repeat(60) + '\n');
  process.exit(0);
}

runGateTests().catch(async e => {
  console.error('\n💥 Gate test crashed unexpectedly:', e.message || e);
  await prisma.$disconnect();
  process.exit(1);
});
