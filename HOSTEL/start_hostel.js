const { networkInterfaces } = require('os');
const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');

// 1. Get Local IPv4 Address
function getLocalIP() {
  const nets = networkInterfaces();
  let fallbackIp = 'localhost';
  let firstWifiIp = null;
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // If it's the Windows Mobile Hotspot default IP, return it immediately
        if (net.address === '192.168.137.1') {
          return net.address;
        }
        if (!firstWifiIp) {
          firstWifiIp = net.address;
        }
      }
    }
  }
  return firstWifiIp || fallbackIp;
}

const localIP = getLocalIP();
const clientPort = 5173; 
const networkUrl = `http://${localIP}:${clientPort}`;

console.log('====================================================');
console.log('         STARTING THE HOSTEL SYSTEM...              ');
console.log('====================================================');
console.log(`\nNetwork URL for Students: ${networkUrl}\n`);

// 2. Start the Backend Server
const serverProcess = spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', shell: true });

// 3. Start the Frontend Server 
const clientProcess = spawn('npm', ['run', 'dev:client', '--', '--host'], { stdio: 'inherit', shell: true });

// 4. Generate and display QR Code locally in the terminal (No Internet Required!)
console.log('\n====================================================');
console.log(' SCAN THIS QR CODE LINK ON MOBILE TO ACCESS SYSTEM: ');
console.log('====================================================\n');
qrcode.generate(networkUrl, { small: true });

process.on('SIGINT', () => {
  serverProcess.kill();
  clientProcess.kill();
  process.exit();
});
