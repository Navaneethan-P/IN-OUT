import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });
const prisma = new PrismaClient();

async function runTests() {
  console.log('\n🔥 RUNNING ARCHITECTURAL WORKFLOW ENGINE AUDIT 🔥\n');

  // --- Step 1: Clean up data and seed default items ---
  const rollNumber = '22BIT0001';
  const student = await prisma.student.findUnique({ where: { rollNumber } });
  if (!student) {
    console.error('Test student 22BIT0001 not found. Please run seed script first.');
    process.exit(1);
  }

  // Helper cleanups
  async function cleanupStudentRequests() {
    const requests = await prisma.leaveRequest.findMany({ where: { studentId: student!.id } });
    const ids = requests.map((r) => r.id);
    await prisma.requestEventLog.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.requestApproval.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.parentVerification.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.leaveRequest.deleteMany({ where: { studentId: student!.id } });
  }

  // Login tokens
  const studentRes = await api.post('/auth/student/login', { rollNumber, password: 'password123' });
  const studentToken = studentRes.data.data.accessToken;

  const wardenRes = await api.post('/auth/staff/login', { email: 'warden@hostel.edu', password: 'password123' });
  const wardenToken = wardenRes.data.data.accessToken;

  const hodRes = await api.post('/auth/staff/login', { email: 'hod.it@hostel.edu', password: 'password123' });
  const hodToken = hodRes.data.data.accessToken;

  const placementRes = await api.post('/auth/staff/login', { email: 'placement@hostel.edu', password: 'password123' });
  const placementToken = placementRes.data.data.accessToken;

  // -------------------------------------------------------------
  // Test Case 1: Outing on a Weekend Holiday (Warden only)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Request on Weekend Holiday (Should require WARDEN only) ---');
  await cleanupStudentRequests();
  
  // Saturday 30th May 2026 (Weekend, defaults to HOLIDAY)
  const holidayDate = new Date('2026-05-30T09:00:00.000Z');
  const holidayReturn = new Date('2026-05-30T17:00:00.000Z');

  // Submit request
  const req1 = await api.post(
    '/requests',
    {
      type: 'OUTING',
      reason: 'Weekend temple visit',
      place: 'Local Temple',
      outDatetime: holidayDate.toISOString(),
      expectedReturnDatetime: holidayReturn.toISOString(),
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  console.assert(req1.status === 200, `Expected 200, got ${req1.status}`);
  const reqId1 = req1.data.data.id;

  // Retrieve approvals
  let approvals1 = await prisma.requestApproval.findMany({ where: { requestId: reqId1 } });
  console.assert(approvals1.length === 1, `Expected 1 required approval, got ${approvals1.length}`);
  console.assert(approvals1[0].approvalType === 'WARDEN', `Expected WARDEN approval type, got ${approvals1[0].approvalType}`);
  console.log('✅ Correctly resolved Holiday requirements: [WARDEN]');

  // Warden approves request
  const wardenAppRes = await api.patch(
    `/warden/requests/${reqId1}/approve`,
    { note: 'Holiday outing approved' },
    { headers: { Authorization: `Bearer ${wardenToken}` } }
  );
  console.assert(wardenAppRes.status === 200, `Warden approval expected 200, got ${wardenAppRes.status}`);

  const checkReq1 = await prisma.leaveRequest.findUnique({ where: { id: reqId1 } });
  console.assert(checkReq1?.status === 'APPROVED', `Expected status APPROVED, got ${checkReq1?.status}`);
  console.log('✅ Request fully APPROVED on Warden decision.');

  // -------------------------------------------------------------
  // Test Case 2: Outing on a Working Day (Warden + HOD in Parallel)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Request on Working Day (Should require WARDEN + HOD) ---');
  await cleanupStudentRequests();

  // Monday 1st June 2026 (Weekday, defaults to WORKING_DAY)
  const workingDate = new Date('2026-06-01T09:00:00.000Z');
  const workingReturn = new Date('2026-06-01T17:00:00.000Z');

  // Submit request
  const req2 = await api.post(
    '/requests',
    {
      type: 'OUTING',
      reason: 'Visiting local library',
      place: 'City Library',
      outDatetime: workingDate.toISOString(),
      expectedReturnDatetime: workingReturn.toISOString(),
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );
  
  console.assert(req2.status === 200, `Expected 200, got ${req2.status}`);
  const reqId2 = req2.data.data.id;

  let approvals2 = await prisma.requestApproval.findMany({ where: { requestId: reqId2 } });
  console.assert(approvals2.length === 2, `Expected 2 required approvals, got ${approvals2.length}`);
  const types2 = approvals2.map((a) => a.approvalType);
  console.assert(types2.includes('WARDEN') && types2.includes('HOD'), 'Expected Warden and HOD requirements');
  console.log('✅ Correctly resolved Working Day requirements: [WARDEN, HOD]');

  // HOD IT approves (Parallel approval - can approve before or after warden)
  const hodAppRes = await api.patch(
    `/approver/requests/${reqId2}/approve`,
    { note: 'Library study permitted' },
    { headers: { Authorization: `Bearer ${hodToken}` } }
  );
  console.assert(hodAppRes.status === 200, `HOD approval expected 200, got ${hodAppRes.status}`);

  // Status should still be PENDING_APPROVALS
  let checkReq2 = await prisma.leaveRequest.findUnique({ where: { id: reqId2 } });
  console.assert(checkReq2?.status === 'PENDING_APPROVALS', `Expected status PENDING_APPROVALS, got ${checkReq2?.status}`);
  console.log('✅ Status correctly remained PENDING_APPROVALS after HOD approved.');

  // Warden approves request
  const wardenAppRes2 = await api.patch(
    `/warden/requests/${reqId2}/approve`,
    { note: 'Outing approved by Warden' },
    { headers: { Authorization: `Bearer ${wardenToken}` } }
  );
  console.assert(wardenAppRes2.status === 200, `Warden approval expected 200, got ${wardenAppRes2.status}`);

  // Request should now be APPROVED
  checkReq2 = await prisma.leaveRequest.findUnique({ where: { id: reqId2 } });
  console.assert(checkReq2?.status === 'APPROVED', `Expected status APPROVED, got ${checkReq2?.status}`);
  console.log('✅ Request transitioned to APPROVED after all required approvals resolved!');

  // -------------------------------------------------------------
  // Test Case 3: Student under Placement on Working Day
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Student under Placement (Should require WARDEN + HOD + PLACEMENT) ---');
  await cleanupStudentRequests();

  // Create placement restriction for student
  await prisma.placementRestriction.upsert({
    where: { studentId: student.id },
    update: { startDate: new Date('2026-06-01'), endDate: new Date('2026-06-05'), isActive: true },
    create: { studentId: student.id, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-05'), isActive: true }
  });

  const req3 = await api.post(
    '/requests',
    {
      type: 'OUTING',
      reason: 'Placement interview prep',
      place: 'Tech park',
      outDatetime: workingDate.toISOString(),
      expectedReturnDatetime: workingReturn.toISOString(),
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  console.assert(req3.status === 200, `Expected 200, got ${req3.status}`);
  const reqId3 = req3.data.data.id;

  let approvals3 = await prisma.requestApproval.findMany({ where: { requestId: reqId3 } });
  console.assert(approvals3.length === 3, `Expected 3 required approvals, got ${approvals3.length}`);
  const types3 = approvals3.map((a) => a.approvalType);
  console.assert(types3.includes('WARDEN') && types3.includes('HOD') && types3.includes('PLACEMENT'), 'Expected Warden, HOD, and Placement requirements');
  console.log('✅ Correctly resolved Placement Day requirements: [WARDEN, HOD, PLACEMENT]');

  // Clean placement restriction
  await prisma.placementRestriction.deleteMany({ where: { studentId: student.id } });

  // -------------------------------------------------------------
  // Test Case 4: Rejection at Any Level Immediately Halts Request
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Rejection immediately sets status to REJECTED ---');
  await cleanupStudentRequests();

  const req4 = await api.post(
    '/requests',
    {
      type: 'OUTING',
      reason: 'Visiting local library',
      place: 'City Library',
      outDatetime: workingDate.toISOString(),
      expectedReturnDatetime: workingReturn.toISOString(),
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  console.assert(req4.status === 200, `Expected 200, got ${req4.status}`);
  const reqId4 = req4.data.data.id;

  // HOD rejects request
  const hodRejRes = await api.patch(
    `/approver/requests/${reqId4}/reject`,
    { reason: 'Examinations scheduled' },
    { headers: { Authorization: `Bearer ${hodToken}` } }
  );
  console.assert(hodRejRes.status === 200, `HOD rejection expected 200, got ${hodRejRes.status}`);

  const checkReq4 = await prisma.leaveRequest.findUnique({ where: { id: reqId4 } });
  console.assert(checkReq4?.status === 'REJECTED', `Expected status REJECTED, got ${checkReq4?.status}`);
  console.log('✅ Request correctly rejected immediately upon HOD rejection.');

  console.log('\n⭐ ALL ARCHITECTURAL ENGINE TESTS PASSED! ⭐\n');
  process.exit(0);
}

runTests().catch((e) => {
  console.error('TEST AUDIT FAILED', e);
  process.exit(1);
});
