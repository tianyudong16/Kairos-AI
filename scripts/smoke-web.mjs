import { chromium } from 'playwright';

const base = process.env.APP_URL || 'http://localhost:8081';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const results = [];

  page.on('pageerror', (err) => {
    results.push(`PAGE_ERROR: ${err.message}`);
  });

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Onboarding continue
  const continueBtn = page.getByRole('button', { name: /Continue/i });
  await continueBtn.waitFor({ timeout: 15000 });
  await continueBtn.click();
  await page.waitForTimeout(800);
  const afterContinue = await page.getByText('Today’s schedule').count();
  results.push(`onboarding->dashboard: ${afterContinue > 0 ? 'PASS' : 'FAIL'}`);

  // FAB / AI Input via accessible name
  const addBtn = page.getByRole('link', { name: /Add with AI/i });
  if ((await addBtn.count()) === 0) {
    // fallback: any link to ai-input
    await page.locator('a[href*="ai-input"]').first().click();
  } else {
    await addBtn.click();
  }
  await page.waitForTimeout(800);
  const aiTitle = await page.getByText('What’s on your mind?').count();
  results.push(`+ -> ai-input: ${aiTitle > 0 ? 'PASS' : 'FAIL'}`);

  // Parse
  const parseBtn = page.getByRole('button', { name: /Parse tasks/i });
  if (await parseBtn.count()) {
    await parseBtn.click();
    await page.waitForTimeout(500);
  }
  const parsed = await page.getByText('PARSED TASKS').count();
  results.push(`parse tasks: ${parsed > 0 ? 'PASS' : 'FAIL'}`);

  // Schedule all
  await page.getByRole('button', { name: /Schedule All/i }).click();
  await page.waitForTimeout(800);
  const dashAgain = await page.getByText('Today’s schedule').count();
  results.push(`schedule all -> dashboard: ${dashAgain > 0 ? 'PASS' : 'FAIL'}`);

  // Analytics tab (only visible link)
  await page.locator('a[href*="analytics"]').locator('visible=true').first().click();
  await page.waitForTimeout(800);
  const analytics = await page.getByText('Focus Score').count();
  results.push(`analytics tab: ${analytics > 0 ? 'PASS' : 'FAIL'}`);

  // Coach via button or tab
  const coachCta = page.getByRole('button', { name: /View AI Coach/i });
  if (await coachCta.count()) {
    await coachCta.click();
  } else {
    await page.locator('a[href*="coach"]').locator('visible=true').first().click();
  }
  await page.waitForTimeout(800);
  const coach = await page.getByText('AI Coach').count();
  results.push(`coach: ${coach > 0 ? 'PASS' : 'FAIL'}`);

  // Send coach message
  const input = page.getByPlaceholder(/Ask Kairos/i);
  await input.fill('Help me focus this afternoon');
  await page.getByRole('button', { name: /Send message/i }).click();
  await page.waitForTimeout(600);
  const reply = await page.getByText(/Got it/i).count();
  results.push(`coach send: ${reply > 0 ? 'PASS' : 'FAIL'}`);

  console.log(results.join('\n'));
  await page.screenshot({ path: '/tmp/kairos-smoke.png', fullPage: true });
  await browser.close();

  if (results.some((r) => r.includes('FAIL') || r.startsWith('PAGE_ERROR'))) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
