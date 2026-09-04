/**
 * Non-transacting fresh-browser coverage (Gate S12): every product route renders on the
 * live deployment, and the headless wallet connects + reads chain state through the real
 * `useWallet` plumbing. The transacting creator+executor lifecycle lives in
 * lifecycle.spec.ts (needs funded keys + exclusive nonce access).
 */
import { test, expect } from '@playwright/test';
import { installHeadlessWallet } from './wallet';

const ROUTES: [string, RegExp][] = [
  ['/', /The agent did not report completion/],
  ['/proof/', /Attestcoin verifier proved both/],
  ['/verify/', /Verify a mandate/],
  ['/app/', /Post a bonded execution mandate/],
  ['/app/create/', /Create a mandate/],
  ['/app/jobs/', /Open mandates/],
];

for (const [path, needle] of ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    const r = await page.goto(path);
    expect(r?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(needle);
  });
}

test('headless wallet connects and reads Creditcoin balances', async ({ page }) => {
  const { executorAddress } = await installHeadlessWallet(page, { role: 'executor' });
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.locator('.wallet-strip .seg')).toContainText('Creditcoin Testnet', { timeout: 20_000 });
  await expect(page.locator('.wallet-strip .seg')).toContainText(executorAddress.slice(0, 6));
  await expect(page.locator('.wallet-strip .seg')).toContainText('tCTC');
});

test('browser verifier recomputes the canonical settlement', async ({ page }) => {
  await page.goto('/verify/');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByText('Result:')).toContainText('match', { timeout: 60_000 });
  await expect(page.locator('.row', { hasText: 'Attestcoin proof re-verifies' }).locator('.glyph.pass')).toBeVisible();
});
