import { test, expect } from '@playwright/test';

// ── 1. Sidebar navigation ──────────────────────────────────────────────────────
test('sidebar links navigate to correct routes', async ({ page }) => {
  await page.goto('/');

  // Dashboard heading visible
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10_000 });

  // Runs link
  await page.getByRole('link', { name: /^runs$/i }).click();
  await expect(page).toHaveURL(/\/runs/);

  // Companies link
  await page.getByRole('link', { name: /^companies$/i }).click();
  await expect(page).toHaveURL(/\/companies/);

  // POC Leads link
  await page.getByRole('link', { name: /poc leads/i }).click();
  await expect(page).toHaveURL(/\/poc-leads/);
});

// ── 2. CreateRun wizard — step flow ───────────────────────────────────────────
test('CreateRun wizard opens and shows step 1 industry cards', async ({ page }) => {
  await page.goto('/create-run');

  // Modal heading
  await expect(page.getByRole('heading', { name: /start new run/i })).toBeVisible();

  // Step indicator label
  await expect(page.getByText('Industry').first()).toBeVisible();

  // Industry cards rendered
  await expect(page.getByText('Finance & Legal')).toBeVisible();

  // Next button disabled before selection
  const nextBtn = page.getByRole('button', { name: /^next/i });
  await expect(nextBtn).toBeDisabled();

  // Click a card — Next becomes enabled
  await page.getByText('Finance & Legal').click();
  await expect(nextBtn).toBeEnabled();
});

// ── 3. CreateRun wizard — close modal ─────────────────────────────────────────
test('CreateRun wizard closes when the X button is clicked', async ({ page }) => {
  await page.goto('/create-run');

  // Modal is open
  await expect(page.getByRole('heading', { name: /start new run/i })).toBeVisible();

  // Click the X button inside the modal content (not the sidebar/backdrop)
  // The X button is the first button inside the modal card (rounded-lg p-2 close button)
  await page.locator('div[class*="max-w-2xl"] button').first().click();

  // Modal heading gone (navigated away)
  await expect(page.getByRole('heading', { name: /start new run/i })).not.toBeVisible({ timeout: 5_000 });
});

// ── 4. Companies page — table renders ─────────────────────────────────────────
test('Companies page renders a table', async ({ page }) => {
  await page.goto('/companies');

  // Heading — use exact match to avoid matching "All Companies" sub-heading
  await expect(page.getByRole('heading', { name: 'Companies', exact: true })).toBeVisible({ timeout: 10_000 });

  // Table element present (even if empty)
  await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
});

// ── 5. Runs page — table renders ──────────────────────────────────────────────
test('Runs page renders a table', async ({ page }) => {
  await page.goto('/runs');

  // Heading
  await expect(page.getByRole('heading', { name: /runs/i })).toBeVisible({ timeout: 10_000 });

  // Table element present
  await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
});
