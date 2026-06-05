import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1', validateStatus: () => true });

async function debug() {
  const l = await api.post('/auth/staff/login', { email: 'gate@hostel.edu', password: 'password123' });
  console.log('Gate login status:', l.status, 'Role:', l.data?.data?.user?.role);
  
  const tok = l.data.data.accessToken;
  const r = await api.post('/gate/scan-exit', { rollNumber: '22BIT0001' }, {
    headers: { Authorization: `Bearer ${tok}` }
  });
  console.log('Scan-exit status:', r.status);
  console.log('Body:', JSON.stringify(r.data, null, 2));
}

debug().catch(console.error);
