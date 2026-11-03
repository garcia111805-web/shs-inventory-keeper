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

  await page.click('button:has-text("adminadmin")');
  await page.waitForTimeout(600);
  await page.locator('input[type="password"]').fill('1234');
  await page.click('button:has-text("Unlock")');
  await page.waitForTimeout(1200);

  await page.click('nav >> text=Cleaning');
  await page.waitForTimeout(800);

  await page.click('button:has-text("Import Data")');
  await page.waitForTimeout(1200);

  const modalOpen = await page.locator('.fixed.inset-0').first().isVisible();
  console.log('Import modal open:', modalOpen);

  if (modalOpen) {
    const hasTypeHeader = (await page.locator('text=Type').count()) > 0;
    console.log('Type text present in modal:', hasTypeHeader);

    const toggleBtn = page.locator('.fixed.inset-0 button[title*="Consumable"], .fixed.inset-0 button[title*="Asset"]');
    const toggleCount = await toggleBtn.count();
    console.log('Type toggle buttons in preview:', toggleCount);

    if (toggleCount > 0) {
      const firstBtn = toggleBtn.first();
      const beforeText = await firstBtn.innerText();
      console.log('Before click:', beforeText);
      await firstBtn.click();
      await page.waitForTimeout(400);
      const afterText = await firstBtn.innerText();
      console.log('After click:', afterText);
      console.log('Toggle works:', beforeText !== afterText);
    }
  }

  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' -', e));

  await browser.close();
})();
