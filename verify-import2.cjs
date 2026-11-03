const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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

  const modal = page.locator('.fixed.inset-0').first();
  const html = await modal.innerHTML();
  console.log('Modal HTML (first 1200 chars):');
  console.log(html.slice(0, 1200));

  await browser.close();
})();
