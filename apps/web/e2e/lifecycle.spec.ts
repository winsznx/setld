/**
 * Fresh-browser end-to-end (Gate S12): a creator publishes a mandate and an executor bonds,
 * executes on Sepolia, waits for the real Attestcoin attestation, and settles — all through
 * the deployed product UI with a headless wallet. Needs funded disposable keys (.env).
 *
 *   pnpm --filter @setld/web exec playwright install chromium
 *   pnpm --filter @setld/web e2e
 */
import { test, expect } from '@playwright/test';
import { installHeadlessWallet } from './wallet';

test.describe.configure({ mode: 'serial', timeout: 45 * 60 * 1000 });

let mandateId: string;

test('creator publishes a mandate', async ({ page }) => {
  await installHeadlessWallet(page, { role: 'creator' });
  await page.goto('/app/create/');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.locator('.wallet-strip .seg')).toContainText('Creditcoin Testnet', { timeout: 20_000 });

  await page.getByRole('button', { name: 'Review mandate' }).click();
  await page.getByLabel('I understand the reward and bond rules.').check();
  await page.getByRole('button', { name: 'Fund and publish' }).click();

  const idRow = page.locator('.rows .row', { hasText: 'Mandate id' }).locator('.v');
  await expect(idRow).toHaveText(/^0x[0-9a-fA-F]{64}$/, { timeout: 120_000 });
  mandateId = (await idRow.textContent())!.trim();
  expect(mandateId).toMatch(/^0x[0-9a-f]{64}$/);
});

test('executor binds, bonds, executes on Sepolia, and settles from the Attestcoin proof', async ({ page }) => {
  await installHeadlessWallet(page, { role: 'executor' });
  await page.goto(`/app/execution/?id=${mandateId}`);
  await page.getByRole('button', { name: 'Connect wallet' }).first().click().catch(() => {});
  await page.getByRole('button', { name: /Bind source|Connect a wallet/ }).click();

  // waiting-for-attestcoin can take 20-40 min depending on attestation throughput
  await expect(page.getByText('The source block is attested')).toBeVisible({ timeout: 40 * 60 * 1000 });
  await page.getByRole('button', { name: 'Submit proof and settle' }).click();

  const verdict = page.locator('.cert .hd .tmpl');
  await expect(verdict).toContainText(/FULFILLED|INVALID_ATTEMPT/, { timeout: 120_000 });
  await expect(verdict).toContainText('FULFILLED');
});
