const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const dest = 'C:/Users/navan/.gemini/antigravity/brain/ad77f4e5-9958-4ad7-858a-4c57e98d2872/';

    console.log('Navigating to Scanner Dashboard...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: dest + 'scanner_dashboard.png' });

    console.log('Navigating to Students Database...');
    await page.goto('http://localhost:5175/students', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: dest + 'students_dashboard.png' });

    console.log('Navigating to History Dashboard...');
    await page.goto('http://localhost:5175/history', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: dest + 'history_dashboard.png' });

    await browser.close();
    console.log('Screenshots captured successfully!');
  } catch (error) {
    console.error('Failed to take screenshots:', error);
    process.exit(1);
  }
})();
