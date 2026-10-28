const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror:' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console:' + msg.text());
  });

  console.log('=== Live site check ===');
  await page.goto('https://sucat-elementary-inventory.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  const html = await page.content();
  console.log('Has admin text:', html.includes('admin'));
  console.log('Has staff text:', html.includes('staff'));
  console.log('Has login gateway:', html.includes('Who is logging in'));

  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons));

  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' -', e));

  await browser.close();
})();
