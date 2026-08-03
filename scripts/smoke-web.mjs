import { chromium } from 'playwright';

const base = process.env.APP_URL || 'http://localhost:8081';

async function check(results, name, cond) {
  results.push(`${name}: ${cond ? 'PASS' : 'FAIL'}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const results = [];
  page.on('pageerror', (err) => results.push(`PAGE_ERROR: ${err.message}`));

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(400);
  await page.getByText('23:00').first().click();
  await page.getByRole('button', { name: /Start planning/i }).click();
  await page.waitForTimeout(900);
  await check(results, 'dashboard', (await page.getByText('Today’s schedule').count()) > 0);

  const fab = page.getByRole('button', { name: /Add task/i });
  await check(results, 'fab visible', await fab.isVisible());
  await fab.click();
  await page.waitForTimeout(800);
  await check(results, 'add screen', (await page.getByText('Add tasks').count()) > 0);

  await page.getByText('Manual', { exact: true }).click();
  await page.getByPlaceholder('Task title').fill('Deep work block');
  await page.getByPlaceholder('Duration minutes').fill('90');
  await page.getByRole('button', { name: /Add to list/i }).click();
  await page.waitForTimeout(400);
  await check(results, 'manual queue', (await page.getByText('TASK QUEUE').count()) > 0);
  await page.getByRole('button', { name: /Schedule All/i }).click();
  await page.waitForTimeout(900);
  await check(results, 'scheduled', (await page.getByText('Deep work block').count()) > 0);

  await page.goto(`${base}/calendar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await check(results, 'calendar', (await page.getByText('Plan by week or month').count()) > 0);
  const monthChip = page.locator('div', { hasText: /^Month$/ }).last();
  if (await monthChip.count()) {
    await monthChip.click({ force: true }).catch(() => {});
  }

  await page.goto(`${base}/coach`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.getByText('Protect peak window').click();
  await page.waitForTimeout(800);
  await check(
    results,
    'coach action',
    (await page.getByText(/Protected your peak window/i).count()) > 0
  );

  await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await check(results, 'settings', (await page.getByText('Current sleep window').count()) > 0);

  console.log(results.join('\n'));
  await page.screenshot({ path: '/tmp/kairos-features.png', fullPage: true });
  await browser.close();
  if (results.some((r) => r.includes('FAIL') || r.startsWith('PAGE_ERROR'))) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
