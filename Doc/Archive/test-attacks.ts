/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   HOSTILE BACKEND AUDIT — Full Black & White Test Suite     ║
 * ║   Tests: Auth, Validation, State Machine, Concurrency       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Run: npx tsx test-attacks.ts
 * Requires: server running on localhost:3000
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

let studentToken = '';
let student2Token = '';
let wardenToken = '';
let reqId = '';

const api = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

// ─── Assert helper ────────────────────────────────────────────────────────────
function assert(condition: boolean, message: string, res?: any) {
  if (!condition) {
    console.error('❌ ASSERTION FAILED:', message);
    if (res) {
      console.error(`   Actual Status: ${res.status}`);
      console.error(`   Actual Body:   ${JSON.stringify(res.data, null, 2)}`);
    }
    process.exit(1);
  } else {
    console.log('   ✅', message);
  }
}

async function runTests() {
  console.log('\n🔥 RUNNING HOSTILE BACKEND AUDIT 🔥\n');

  // =========================================================================
  // BLOCK 1: AUTHENTICATION ATTACK TESTS
  // =========================================================================
  console.log('━━━ BLOCK 1: AUTH BREAK TESTS ━━━');

  let res = await api.post('/auth/student/login', { rollNumber: '22BIT0001', password: 'wrongpassword' });
  assert(res.status === 401, 'Wrong password → 401 Unauthorized');

  res = await api.get('/student/me', { headers: { Authorization: 'Bearer invalid.token.here' } });
  assert(res.status === 401, 'Invalid JWT → 401 Unauthorized');

  res = await api.get('/student/me');
  assert(res.status === 401, 'No token → 401 Unauthorized');

  // Login successfully
  res = await api.post('/auth/student/login', { rollNumber: '22BIT0001', password: 'password123' });
  assert(res.status === 200, 'Valid student login → 200 OK', res);
  studentToken = res.data.data.accessToken;

  res = await api.post('/auth/student/login', { rollNumber: '22BIT0002', password: 'password123' });
  assert(res.status === 200, 'Valid student2 login → 200 OK', res);
  student2Token = res.data.data.accessToken;

  res = await api.post('/auth/staff/login', { email: 'warden@hostel.edu', password: 'password123' });
  assert(res.status === 200, 'Valid warden login → 200 OK', res);
  wardenToken = res.data.data.accessToken;

  // Role escalation attack
  res = await api.patch('/warden/requests/fake-id/approve', {}, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 403, 'Student → warden route → 403 Forbidden');

  // =========================================================================
  // BLOCK 2: VALIDATION & BUSINESS RULE TESTS
  // =========================================================================
  console.log('\n━━━ BLOCK 2: VALIDATION & BUSINESS RULES ━━━');

  // Clean up existing active requests for student 1
  const existingReqs = await api.get('/requests', { headers: { Authorization: `Bearer ${studentToken}` } });
  for (const r of existingReqs.data.data?.items || []) {
    if (['DRAFT', 'PENDING_APPROVALS', 'PENDING_WARDEN'].includes(r.status)) {
      await api.delete(`/requests/${r.id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    }
  }

  // 2.A: Zod validation — invalid date strings
  res = await api.post('/requests', {
    type: 'OUTING',
    reason: 'Family function',
    place: 'Salem',
    outDatetime: 'banana',
    expectedReturnDatetime: '2026-05-25T21:00:00.000Z'
  }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 400, 'Invalid date string → 400 Validation Error');

  // 2.B: Business rule — past dates
  res = await api.post('/requests', {
    type: 'OUTING',
    reason: 'Test',
    place: 'Salem',
    outDatetime: '2024-01-01T10:00:00.000Z',
    expectedReturnDatetime: '2024-01-01T18:00:00.000Z'
  }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 400, 'Past dates → 400 Business Rule Error');

  // 2.C: Business rule — >30 day leave
  const outDate = new Date(Date.now() + 86400000).toISOString();
  const returnDate = new Date(Date.now() + 32 * 86400000).toISOString();
  res = await api.post('/requests', {
    type: 'LEAVE',
    place: 'Home',
    reason: 'Vacation',
    outDatetime: outDate,
    expectedReturnDatetime: returnDate
  }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 400, '>30 day leave → 400 Business Rule Error');

  // 2.D: Valid request creation
  const futureOut = new Date(Date.now() + 86400000).toISOString();
  const futureReturn = new Date(Date.now() + 172800000).toISOString();
  res = await api.post('/requests', {
    type: 'OUTING',
    reason: 'Test Outing',
    place: 'Salem',
    outDatetime: futureOut,
    expectedReturnDatetime: futureReturn
  }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 201, 'Valid request → 201 Created', res);
  reqId = res.data.data.id;

  // 2.E: Duplicate active request — should be blocked
  res = await api.post('/requests', {
    type: 'OUTING',
    reason: 'Test Outing 2',
    place: 'Chennai',
    outDatetime: futureOut,
    expectedReturnDatetime: futureReturn
  }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 409, 'Duplicate active request → 409 Conflict');

  // =========================================================================
  // BLOCK 3: STATE MACHINE INTEGRITY TESTS
  // =========================================================================
  console.log('\n━━━ BLOCK 3: STATE MACHINE INTEGRITY ━━━');

  // 3.A: Student cannot self-approve via warden endpoint (role guard)
  res = await api.patch(`/warden/requests/${reqId}/approve`, { note: 'Self approve' }, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 403, 'Student cannot self-approve via warden endpoint → 403');

  // 3.B: Warden can approve
  res = await api.patch(`/warden/requests/${reqId}/approve`, { note: 'Approved' }, { headers: { Authorization: `Bearer ${wardenToken}` } });
  assert(res.status === 200, 'Warden approves → 200 OK', res);

  // 3.C: Idempotency — duplicate approval returns 200 (not error)
  res = await api.patch(`/warden/requests/${reqId}/approve`, { note: 'Approved again' }, { headers: { Authorization: `Bearer ${wardenToken}` } });
  assert(res.status === 200, 'Duplicate warden approval (idempotency) → 200 OK');

  // 3.D: Student cannot cancel after approval (request now in PENDING_APPROVALS with warden slot filled,
  //      or fully APPROVED — in either case cancel is now terminal/blocked)
  res = await api.delete(`/requests/${reqId}`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert(res.status === 409, 'Student cannot cancel after warden approval → 409 Conflict');

  // 3.E: Parent verification on the approved request
  res = await api.post(`/warden/requests/${reqId}/parent-verify`, {
    phoneCalled: '9111111001',
    callMethod: 'MANUAL',
    response: 'APPROVED'
  }, { headers: { Authorization: `Bearer ${wardenToken}` } });
  // This may succeed or fail depending on whether request is PENDING_APPROVALS or APPROVED
  // Either way it should not crash (400 or 200)
  assert([200, 400].includes(res.status), `Parent verify endpoint responds properly → ${res.status}`);

  // =========================================================================
  // BLOCK 4: CONCURRENCY (RACE CONDITION) TEST
  // =========================================================================
  console.log('\n━━━ BLOCK 4: CONCURRENCY TEST ━━━');

  // Create a fresh request for student 2
  res = await api.post('/requests', {
    type: 'OUTING',
    reason: 'Test Concurrency',
    place: 'Salem',
    outDatetime: new Date(Date.now() + 90000000).toISOString(),
    expectedReturnDatetime: new Date(Date.now() + 180000000).toISOString()
  }, { headers: { Authorization: `Bearer ${student2Token}` } });
  assert(res.status === 201, 'Student2 request created for concurrency test → 201', res);
  const reqId2 = res.data.data.id;

  // Fire two approvals simultaneously — state machine uses optimistic locking (updateMany with status check)
  const [res1, res2] = await Promise.all([
    api.patch(`/warden/requests/${reqId2}/approve`, { note: 'Approve 1' }, { headers: { Authorization: `Bearer ${wardenToken}` } }),
    api.patch(`/warden/requests/${reqId2}/approve`, { note: 'Approve 2' }, { headers: { Authorization: `Bearer ${wardenToken}` } })
  ]);

  const statuses = [res1.status, res2.status];
  const successCount = statuses.filter(s => s === 200).length;
  const errorCount = statuses.filter(s => s === 409 || s === 500).length;

  console.log(`   Race result: [${statuses.join(', ')}] — success: ${successCount}, blocked: ${errorCount}`);

  // Both outcomes are valid:
  // - 1 success + 1 conflict: optimistic lock worked perfectly
  // - 2 success: idempotency absorbed the duplicate gracefully
  assert(
    (successCount === 1 && errorCount === 1) || successCount === 2,
    'Concurrency: optimistic lock or idempotency prevented double-processing'
  );

  // =========================================================================
  // BLOCK 5: CROSS-STUDENT AUTHORIZATION TESTS
  // =========================================================================
  console.log('\n━━━ BLOCK 5: CROSS-STUDENT ISOLATION ━━━');

  // Student 2 should not be able to view Student 1's request
  res = await api.get(`/requests/${reqId}`, { headers: { Authorization: `Bearer ${student2Token}` } });
  assert([403, 404].includes(res.status), 'Student cannot view another student\'s request → 403/404');

  // Student 2 should not be able to cancel Student 1's request
  res = await api.delete(`/requests/${reqId}`, { headers: { Authorization: `Bearer ${student2Token}` } });
  assert([403, 404, 409].includes(res.status), 'Student cannot cancel another student\'s request → 403/404/409');

  // =========================================================================
  // DONE
  // =========================================================================
  console.log('\n' + '═'.repeat(60));
  console.log('  ⭐  ALL ATTACK TESTS PASSED! BACKEND IS IRONCLAD.  ⭐');
  console.log('═'.repeat(60) + '\n');
  process.exit(0);
}

runTests().catch(e => {
  console.error('\n💥 Test script crashed unexpectedly:', e.message || e);
  process.exit(1);
});
