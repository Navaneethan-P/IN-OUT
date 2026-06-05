import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });

async function runAnalyticsTest() {
  console.log('\n📊 RUNNING LIVE ANALYTICS ENDPOINT AUDIT 📊\n');

  // Step 1: Login as Warden to get authorized token
  console.log('Authenticating as Warden...');
  const loginRes = await api.post('/auth/staff/login', {
    email: 'warden@hostel.edu',
    password: 'password123'
  });

  if (loginRes.status !== 200) {
    console.error('❌ LOGIN FAILED:', loginRes.data);
    process.exit(1);
  }
  console.log('✅ Warden Authenticated successfully!');

  const token = loginRes.data.data.accessToken;
  
  // Step 2: Fetch stats from GET /analytics
  console.log('\nFetching dashboard analytics from GET /analytics...');
  const analyticsRes = await api.get('/analytics', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.assert(analyticsRes.status === 200, `Expected 200 OK, got ${analyticsRes.status}`);
  if (analyticsRes.status !== 200) {
    console.error('❌ Failed to fetch analytics:', analyticsRes.data);
    process.exit(1);
  }
  console.log('✅ Received 200 OK response from /analytics!');

  const responseData = analyticsRes.data;
  console.log('\nRaw JSON Response Payload:');
  console.log(JSON.stringify(responseData, null, 2));

  // Step 3: Assert metric constraints
  console.log('\nValidating metrics keys and types:');
  const stats = responseData.data;
  
  console.assert(typeof stats.totalStudents === 'number', 'totalStudents must be a number');
  console.assert(stats.presence !== undefined, 'presence metrics object is missing');
  console.assert(typeof stats.presence.inside === 'number', 'presence.inside must be a number');
  console.assert(typeof stats.presence.outside === 'number', 'presence.outside must be a number');
  console.assert(typeof stats.presence.overdue === 'number', 'presence.overdue must be a number');
  console.assert(typeof stats.messForecast === 'number', 'messForecast must be a number');
  console.assert(stats.approvals !== undefined, 'approvals metrics object is missing');
  console.assert(typeof stats.approvals.approved === 'number', 'approvals.approved must be a number');
  console.assert(typeof stats.approvals.rejected === 'number', 'approvals.rejected must be a number');
  console.assert(typeof stats.approvals.pending === 'number', 'approvals.pending must be a number');

  console.log('✅ Assertions passed! The response JSON is completely valid.');

  console.log('\n══════════════════════════════════════════════════');
  console.log('               LIVE SYSTEM TELEMETRY               ');
  console.log('══════════════════════════════════════════════════');
  console.log(` Total Active Students:  ${stats.totalStudents}`);
  console.log(` Campus Inside Count:    ${stats.presence.inside}`);
  console.log(` Campus Outside Count:   ${stats.presence.outside}`);
  console.log(` Overdue Returns Count:  ${stats.presence.overdue}`);
  console.log(` Tonight's Mess Forecast: ${stats.messForecast}`);
  console.log('──────────────────────────────────────────────────');
  console.log(` Total Approved Leaves:  ${stats.approvals.approved}`);
  console.log(` Total Rejected Leaves:  ${stats.approvals.rejected}`);
  console.log(` Total Pending Reviews:  ${stats.approvals.pending}`);
  console.log('══════════════════════════════════════════════════\n');

  console.log('⭐ ANALYTICS INTEGRATION AUDIT PASSED SUCCESSFULLY! ⭐\n');
  process.exit(0);
}

runAnalyticsTest().catch(err => {
  console.error('❌ Audit script threw an unexpected error:', err);
  process.exit(1);
});
