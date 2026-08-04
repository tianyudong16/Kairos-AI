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
  await page.waitForTimeout(1000);

  await check(results, 'login screen', (await page.getByText('Create your account').count()) > 0);
  await page.getByLabel('Full name').fill('Maya Chen');
  await page.getByLabel('Email').fill('maya@kairos.app');
  await page.getByLabel('Password').fill('kairos');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start planning/i }).click();
  await page.waitForTimeout(800);
  await check(results, 'dashboard', (await page.getByText('Today’s schedule').count()) > 0);

  await page.getByRole('button', { name: 'Open profile' }).click();
  await page.waitForTimeout(500);
  await check(results, 'profile page', (await page.getByText('Your profile').count()) > 0);
  await check(results, 'profile details', (await page.getByText('Maya Chen').count()) > 0);
  await page.getByRole('button', { name: 'You' }).click();
  await page.waitForTimeout(400);
  await check(results, 'you tab', (await page.getByText('Rhythm snapshot').count()) > 0);
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: /Add task/i }).click();
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: 'Set priority low' }).first().click();
  await page.waitForTimeout(200);
  await check(results, 'priority change', (await page.getByText('LOW').count()) > 0);

  const before = await page
    .locator('input')
    .evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  await page.getByRole('button', { name: 'Move task down' }).first().click();
  await page.waitForTimeout(400);
  const after = await page
    .locator('input')
    .evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  await check(
    results,
    'reorder',
    before.includes('Deep work block') &&
      after.includes('Recovery walk') &&
      after.indexOf('Recovery walk') < after.indexOf('Deep work block')
  );

  await page.getByRole('button', { name: /^Schedule\b/ }).click();
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'Coach' }).click();
  await page.waitForTimeout(700);
  await page.getByText('Add a 20m reset in the afternoon').click();
  await page.waitForTimeout(700);
  await check(results, 'coach break', (await page.getByText(/recovery break/i).count()) > 0);
  await check(results, 'coach changes', (await page.getByText('Latest changes').count()) > 0);

  await page.getByText('Break a long block into two sessions').click();
  await page.waitForTimeout(700);
  await check(results, 'coach split', (await page.getByText(/Split/i).count()) > 0);

  await page.getByPlaceholder(/bedtime|gym|Or type/i).fill('I only need 8h of sleep');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForTimeout(500);
  await check(
    results,
    'coach sleep need',
    (await page.getByText(/Set sleep need to 8h/i).count()) > 0
  );

  await check(
    results,
    'nav you tab',
    (await page.getByRole('button', { name: 'You' }).count()) > 0
  );
  await check(results, 'nav today', (await page.getByRole('button', { name: 'Today' }).count()) > 0);
  await check(
    results,
    'nav no insights tab',
    (await page.getByRole('button', { name: 'Insights' }).count()) === 0
  );

  await page.getByRole('button', { name: 'You' }).click();
  await page.waitForTimeout(500);
  const settingsLink = page
    .getByText('Open sleep & category settings')
    .filter({ visible: true });
  await settingsLink.scrollIntoViewIfNeeded();
  await settingsLink.click();
  await page.waitForTimeout(700);
  await check(results, 'settings categories', (await page.getByText('Categories').count()) > 0);
  await page.getByRole('button', { name: /Switch to dark mode/i }).click();
  await page.waitForTimeout(400);
  await check(results, 'dark mode on', (await page.getByText(/cool teal night palette/i).count()) > 0);
  await page.getByRole('button', { name: /Switch to light mode/i }).click();
  await page.waitForTimeout(300);
  await check(results, 'dark mode off', (await page.getByText(/light blue & green/i).count()) > 0);
  await page.getByText('Edit', { exact: true }).click();
  await page.waitForTimeout(400);
  await check(results, 'category modal', (await page.getByText('Add category').count()) > 0);
  await page.getByText('Add category').click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder(/Creative|Errands|Family/i).fill('Creative');
  await page.getByText('Create', { exact: true }).click();
  await page.waitForTimeout(400);
  await check(results, 'custom category', (await page.getByText('CREATIVE').count()) > 0);
  // Close category modal if still open so tab bar is clickable
  const closeModal = page.getByRole('button', { name: /close/i });
  if ((await closeModal.count()) > 0) {
    await closeModal.first().click();
    await page.waitForTimeout(300);
  }

  await page.getByRole('button', { name: 'Calendar' }).click();
  await page.waitForTimeout(700);
  await check(
    results,
    'calendar add cta',
    (await page.getByRole('button', { name: /Add tasks for/i }).count()) > 0
  );
  await page.getByRole('button', { name: /Add tasks for/i }).click();
  await page.waitForTimeout(700);
  await check(results, 'add date picker', (await page.getByText('Schedule for').count()) > 0);
  await check(
    results,
    'add date chips',
    (await page.getByRole('button', { name: /Choose date/i }).count()) > 1
  );

  console.log(results.join('\n'));
  await page.screenshot({ path: '/tmp/kairos-ux.png', fullPage: true });
  await browser.close();
  if (results.some((r) => r.includes('FAIL') || r.startsWith('PAGE_ERROR'))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
