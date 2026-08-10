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
  await check(
    results,
    'guest option',
    (await page.getByRole('button', { name: 'Continue as guest' }).count()) > 0
  );

  // Sign in should not work without a registered account
  await page.getByRole('button', { name: 'Switch to sign in' }).click();
  await page.waitForTimeout(200);
  await page.getByLabel('Email').fill('nobody@kairos.app');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(400);
  await check(
    results,
    'signin requires account',
    (await page.getByText(/No account found/i).count()) > 0
  );

  await page.getByRole('button', { name: 'Switch to sign up' }).click();
  await page.waitForTimeout(200);
  const email = `maya.${Date.now()}@kairos.app`;
  await page.getByLabel('Full name').fill('Maya Chen');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('kairos');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForTimeout(600);

  // Onboarding: lifestyle → chronotype → sleep
  await page.getByRole('button', { name: 'College student' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start planning/i }).click();
  await page.waitForTimeout(800);
  await check(results, 'dashboard', (await page.getByText('Today’s schedule').count()) > 0);
  await check(
    results,
    'nav schedule',
    (await page.getByRole('button', { name: 'Schedule' }).count()) > 0
  );

  // Viewing a non-today day must not pretend to be "Today"
  await page.getByRole('button', { name: 'Next day' }).click();
  await page.waitForTimeout(400);
  await check(
    results,
    'other day banner',
    (await page.getByText('Viewing another day').count()) > 0
  );
  await check(
    results,
    'other day not titled today',
    (await page.getByText('Today’s schedule').count()) === 0
  );
  await page.getByRole('button', { name: 'Jump to today’s schedule' }).click();
  await page.waitForTimeout(400);
  await check(
    results,
    'back to today',
    (await page.getByText('Today’s schedule').count()) > 0
  );

  await page.getByRole('button', { name: 'Open profile' }).click();
  await page.waitForTimeout(500);
  await check(results, 'profile page', (await page.getByText('Your profile').count()) > 0);
  await check(results, 'profile details', (await page.getByText('Maya Chen').count()) > 0);
  await check(
    results,
    'lifestyle on profile',
    (await page.getByText('College student').count()) > 0
  );
  await page.getByRole('button', { name: 'You' }).click();
  await page.waitForTimeout(400);
  await check(results, 'you tab', (await page.getByText('Rhythm snapshot').count()) > 0);
  await page.getByRole('button', { name: 'Schedule' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: /Add task/i }).click();
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: 'Set priority low' }).first().click();
  await page.waitForTimeout(200);
  await check(results, 'priority change', (await page.getByText('LOW').count()) > 0);

  await page.getByRole('button', { name: /Schedule.*→/ }).click();
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

  await page.getByRole('button', { name: 'Open live calendar sync' }).click();
  await page.waitForTimeout(500);
  await check(results, 'live sync screen', (await page.getByText('Live calendar sync').count()) > 0);
  await check(results, 'google provider card', (await page.getByText('Google Calendar').count()) > 0);
  await check(
    results,
    'outlook provider card',
    (await page.getByText(/Outlook \/ Microsoft 365/i).count()) > 0
  );
  await check(
    results,
    'device provider card',
    (await page.getByText(/Apple \/ Samsung \/ Device/i).count()) > 0
  );
  await page.getByRole('button', { name: 'Show calendar sync setup instructions' }).click();
  await page.waitForTimeout(200);
  await check(
    results,
    'sync setup guide',
    (await page.getByText(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/i).count()) > 0
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Import Outlook or other calendar' }).click();
  await page.waitForTimeout(500);
  await check(results, 'import screen', (await page.getByText('Import calendar').count()) > 0);
  await page.getByRole('button', { name: 'Load sample Outlook calendar' }).click();
  await page.waitForTimeout(400);
  await check(results, 'ics preview', (await page.getByText('Team standup').count()) > 0);
  await page.getByRole('button', { name: /Import \d+ events/i }).click();
  await page.waitForTimeout(400);
  await check(results, 'ics imported', (await page.getByText(/Imported \d+ event/i).count()) > 0);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(400);

  page.once('dialog', async (dialog) => {
    await check(
      results,
      'repack confirm dialog',
      /Re-pack this day/i.test(dialog.message())
    );
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: /Re-pack selected day around sleep/i }).click();
  await page.waitForTimeout(400);
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
  const closeModal = page.getByRole('button', { name: /close/i });
  if ((await closeModal.count()) > 0) {
    await closeModal.first().click();
    await page.waitForTimeout(300);
  }

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.waitForTimeout(700);
  await check(
    results,
    'calendar add cta',
    (await page.getByRole('button', { name: /Add tasks for/i }).count()) > 0
  );

  // From calendar, open selected day's schedule — tab must be Schedule, never a false "Today" tab
  await page.getByText(/Open .+ schedule →/).filter({ visible: true }).click();
  await page.waitForTimeout(600);
  await check(
    results,
    'calendar open uses schedule tab',
    (await page.getByRole('button', { name: 'Schedule' }).count()) > 0 &&
      (await page.getByRole('button', { name: 'Today', exact: true }).count()) === 0
  );

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.waitForTimeout(500);
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
