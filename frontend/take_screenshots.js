import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.resolve('..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureAll() {
  console.log('Connecting to Microsoft Edge at:', EDGE_PATH);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();

  const pagesToVisit = [
    { url: 'http://localhost:5173/', file: '01_overview.png', title: 'Overview' },
    { url: 'http://localhost:5173/compute', file: '02_compute.png', title: 'Compute' },
    { url: 'http://localhost:5173/storage', file: '03_storage.png', title: 'Storage' },
    { url: 'http://localhost:5173/network', file: '04_network.png', title: 'Network' },
    { url: 'http://localhost:5173/costs', file: '05_costs.png', title: 'Costs' },
    { url: 'http://localhost:5173/health', file: '06_health.png', title: 'Health' },
    { url: 'http://localhost:5173/alerts', file: '07_alerts.png', title: 'Alerts' },
  ];

  for (const item of pagesToVisit) {
    console.log(`Navigating to ${item.title} (${item.url})...`);
    await page.goto(item.url, { waitUntil: 'networkidle0', timeout: 15000 });
    // Wait for animations and charts
    await new Promise((r) => setTimeout(r, 1500));
    const dest = path.join(SCREENSHOT_DIR, item.file);
    await page.screenshot({ path: dest, fullPage: true });
    console.log(`✓ Saved ${item.file}`);
  }

  // Now test simulating an incident
  console.log('Navigating to Overview to trigger Simulate Incident...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Click Simulate Incident button
  const simBtn = await page.$('#simulate-incident-main-btn');
  if (simBtn) {
    console.log('Clicking Simulate Incident (Demo) button...');
    await simBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    const incDest = path.join(SCREENSHOT_DIR, '08_incident_active.png');
    await page.screenshot({ path: incDest, fullPage: true });
    console.log('✓ Saved 08_incident_active.png');
  }

  // Also visit Health during incident
  console.log('Navigating to Health page while incident is active...');
  await page.goto('http://localhost:5173/health', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  const incHealthDest = path.join(SCREENSHOT_DIR, '09_incident_health.png');
  await page.screenshot({ path: incHealthDest, fullPage: true });
  console.log('✓ Saved 09_incident_health.png');

  // Reset the incident
  console.log('Resetting incident via API...');
  await page.evaluate(async () => {
    await fetch('http://localhost:8000/api/simulate-incident/reset', { method: 'POST' });
  });
  await new Promise((r) => setTimeout(r, 1000));
  console.log('✓ Incident reset to normal.');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureAll().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
