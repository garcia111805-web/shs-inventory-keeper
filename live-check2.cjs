const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror:' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console:' + msg.text());
  });

  await page.goto('https://sucat-elementary-inventory.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Login as admin
  await page.click('button:has-text("adminadmin")');
  await page.waitForTimeout(600);
  await page.locator('input[type="password"]').fill('1234');
  await page.click('button:has-text("Unlock")');
  await page.waitForTimeout(1500);

  // Check dashboard
  const dashTitle = await page.title();
  const hasDash = await page.locator('h1:has-text("Dashboard")').isVisible();
  console.log('Dashboard visible:', hasDash, 'Title:', dashTitle);

  // Go to Cleaning
  await page.click('nav >> text=Cleaning');
  await page.waitForTimeout(1200);

  const rows = await page.locator('tbody tr').count();
  console.log('Cleaning rows:', rows);
  if (rows > 0) {
    const first = await page.locator('tbody tr').first().innerText();
    console.log('First row:', first.replace(/\s+/g, ' ').trim());
  } else {
    console.log('NO ITEMS FOUND - checking for empty state');
    const emptyText = await page.locator('text=No Items Found').isVisible();
    console.log('Empty state visible:', emptyText);
  }

  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' -', e));

  await browser.close();
})();
