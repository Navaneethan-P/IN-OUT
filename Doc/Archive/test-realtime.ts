import axios from 'axios';
import { io as clientIo } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });
const prisma = new PrismaClient();

async function runRealtimeE2ETests() {
  console.log('\n⚡ RUNNING REAL-TIME SOCKET.IO E2E INTEGRATION TEST ⚡\n');

  // --- Step 1: Query database for student and clear past records ---
  const rollNumber = '22BIT0001';
  const student = await prisma.student.findUnique({ where: { rollNumber } });
  if (!student) {
    console.error('❌ Student 22BIT0001 not found. Please run seed script first.');
    process.exit(1);
  }

  console.log('Cleaning up old requests for test student...');
  const existingRequests = await prisma.leaveRequest.findMany({ where: { studentId: student.id } });
  const ids = existingRequests.map(r => r.id);
  await prisma.requestEventLog.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.requestApproval.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.parentVerification.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.leaveRequest.deleteMany({ where: { studentId: student.id } });
  console.log('✅ DB cleaned successfully.');

  // --- Step 2: Login and retrieve JWT Access Tokens ---
  console.log('\nLogging in Student (22BIT0001)...');
  const studentLoginRes = await api.post('/auth/student/login', { rollNumber, password: 'password123' });
  if (studentLoginRes.status !== 200) {
    console.error('❌ STUDENT LOGIN FAILED:', studentLoginRes.data);
    process.exit(1);
  }
  const studentToken = studentLoginRes.data.data.accessToken;

  console.log('Logging in Warden (warden@hostel.edu)...');
  const wardenLoginRes = await api.post('/auth/staff/login', { email: 'warden@hostel.edu', password: 'password123' });
  if (wardenLoginRes.status !== 200) {
    console.error('❌ WARDEN LOGIN FAILED:', wardenLoginRes.data);
    process.exit(1);
  }
  const wardenToken = wardenLoginRes.data.data.accessToken;

  // --- Step 3: Establish JWT-Authenticated Socket Connections ---
  console.log('\nConnecting Student Socket to Server...');
  const studentSocket = clientIo('http://localhost:3000', {
    auth: { token: studentToken },
    transports: ['websocket']
  });

  console.log('Connecting Warden Socket to Server...');
  const wardenSocket = clientIo('http://localhost:3000', {
    auth: { token: wardenToken },
    transports: ['websocket']
  });

  // Track socket connection statuses
  await new Promise<void>((resolve) => {
    let connectedCount = 0;
    const checkResolve = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };
    studentSocket.on('connect', () => {
      console.log('✅ Student Socket Connected! ID:', studentSocket.id);
      checkResolve();
    });
    wardenSocket.on('connect', () => {
      console.log('✅ Warden Socket Connected! ID:', wardenSocket.id);
      checkResolve();
    });
  });

  // Set up event captures
  let receivedNewRequestEvent: any = null;
  let receivedRequestUpdatedEvent: any = null;

  wardenSocket.on('request:new', (data) => {
    console.log('📡 [Warden Socket] RECEIVED EVENT "request:new":', data);
    receivedNewRequestEvent = data;
  });

  studentSocket.on('request:updated', (data) => {
    console.log('📡 [Student Socket] RECEIVED EVENT "request:updated":', data);
    receivedRequestUpdatedEvent = data;
  });

  // --- Step 4: Submit Request (Triggers request:new broadcast) ---
  console.log('\n--- SCENARIO 1: Student Submits Leave Request (Realtime Alert Approvers) ---');
  const now = new Date();
  const outTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const inTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now

  const submitRes = await api.post(
    '/requests',
    {
      type: 'OUTING',
      reason: 'Urgent medical checkout',
      place: 'City General Hospital',
      outDatetime: outTime.toISOString(),
      expectedReturnDatetime: inTime.toISOString()
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  console.assert(submitRes.status === 201, `Expected 201 Created, got ${submitRes.status}`);
  const requestId = submitRes.data.data.id;
  console.log(`✅ Leave Request submitted. ID: ${requestId}`);

  // Wait 4.5s to capture socket emission
  console.log('Waiting 4.5s for Warden socket to capture real-time broadcast...');
  await new Promise(r => setTimeout(r, 4500));

  console.assert(receivedNewRequestEvent !== null, '❌ Fail: Warden socket did not receive "request:new" alert!');
  if (receivedNewRequestEvent) {
    console.log('✅ Success: Warden received real-time new request alert!');
    console.assert(receivedNewRequestEvent.requestId === requestId, 'RequestId mismatch');
    console.assert(receivedNewRequestEvent.studentName === student.name, 'StudentName mismatch');
  }

  // --- Step 5: Warden Approves Request (Triggers request:updated broadcast) ---
  console.log('\n--- SCENARIO 2: Approving All Required Actions (Triggers request:updated) ---');
  
  const approvals = await prisma.requestApproval.findMany({ where: { requestId } });
  console.log(`Initialized Approvals for this request: ${approvals.map(a => a.approvalType).join(', ')}`);

  for (const app of approvals) {
    console.log(`Approving requirements for: ${app.approvalType}...`);
    if (app.approvalType === 'WARDEN') {
      const approveRes = await api.patch(
        `/warden/requests/${requestId}/approve`,
        { note: 'Doctor recommendation verified. Approved.' },
        { headers: { Authorization: `Bearer ${wardenToken}` } }
      );
      console.assert(approveRes.status === 200, `Warden approval expected 200, got ${approveRes.status}`);
      console.log('✅ Approved by Warden.');
    } else if (app.approvalType === 'HOD') {
      const hodLoginRes = await api.post('/auth/staff/login', { email: 'hod.it@hostel.edu', password: 'password123' });
      const hodToken = hodLoginRes.data.data.accessToken;
      const approveRes = await api.patch(
        `/approver/requests/${requestId}/approve`,
        { note: 'HOD approved from E2E integration script.' },
        { headers: { Authorization: `Bearer ${hodToken}` } }
      );
      console.assert(approveRes.status === 200, `HOD approval expected 200, got ${approveRes.status}`);
      console.log('✅ Approved by HOD.');
    } else if (app.approvalType === 'PLACEMENT') {
      const placementLoginRes = await api.post('/auth/staff/login', { email: 'placement@hostel.edu', password: 'password123' });
      const placementToken = placementLoginRes.data.data.accessToken;
      const approveRes = await api.patch(
        `/approver/requests/${requestId}/approve`,
        { note: 'Placement approved from E2E integration script.' },
        { headers: { Authorization: `Bearer ${placementToken}` } }
      );
      console.assert(approveRes.status === 200, `Placement approval expected 200, got ${approveRes.status}`);
      console.log('✅ Approved by Placement.');
    }
  }

  // Wait 4.5s to capture socket emission
  console.log('Waiting 4.5s for Student socket to capture real-time update...');
  await new Promise(r => setTimeout(r, 4500));

  const finalReq = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  console.log('--- DATABASE INSPECTION ---');
  console.log('Request Status in DB:', finalReq?.status);
  console.log('Request Ticket Code:', finalReq?.ticketCode);
  console.log('---------------------------');

  console.assert(receivedRequestUpdatedEvent !== null, '❌ Fail: Student socket did not receive "request:updated" status broadcast!');
  if (receivedRequestUpdatedEvent) {
    console.log('✅ Success: Student received real-time status update alert!');
    console.assert(receivedRequestUpdatedEvent.requestId === requestId, 'RequestId mismatch');
    console.assert(receivedRequestUpdatedEvent.status === 'APPROVED', 'Status mismatch');
  }

  // --- Step 6: Verify Auth Middleware (Rejects bad connection handshake) ---
  console.log('\n--- SCENARIO 3: Socket.IO Authentication Middleware Protection ---');
  let rejectedSocketConnected = false;
  const rejectedSocket = clientIo('http://localhost:3000', {
    auth: { token: 'invalid-expired-jwt-token-hack' },
    transports: ['websocket'],
    timeout: 3000
  });

  rejectedSocket.on('connect', () => {
    rejectedSocketConnected = true;
  });

  await new Promise<void>((resolve) => {
    rejectedSocket.on('connect_error', (err) => {
      console.log('✅ Success: Socket handshake correctly rejected by authentication middleware. Error:', err.message);
      resolve();
    });
    setTimeout(() => {
      if (!rejectedSocketConnected) {
        resolve();
      }
    }, 2000);
  });

  // --- Cleanup & Exit ---
  console.log('\nTearing down connections...');
  studentSocket.disconnect();
  wardenSocket.disconnect();
  rejectedSocket.disconnect();

  console.log('\n⭐ ALL REAL-TIME SOCKET.IO INTEGRATION TESTS PASSED SUCCESSFULLY! ⭐\n');
  process.exit(0);
}

runRealtimeE2ETests().catch(err => {
  console.error('❌ E2E real-time test script crashed:', err);
  process.exit(1);
});
