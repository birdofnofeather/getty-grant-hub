import { test, expect } from '@playwright/test';

test('map view loads with headline, map, and working org toggle', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Getty Grant Explorer/);
  await expect(page.getByText('Total Granted (USD)')).toBeVisible();
  await expect(page.getByText('Number of Grants')).toBeVisible();
  await page.waitForSelector('svg path', { timeout: 15000 });
  const paths = await page.locator('svg path').count();
  expect(paths).toBeGreaterThan(100);
  await expect(page.getByText('Grant Count')).toBeVisible();
  const grantsCard = page.locator('text=Number of Grants').locator('..');
  const before = await grantsCard.innerText();
  await page.getByRole('button', { name: 'Basic' }).click();
  await page.getByRole('switch').first().click();
  await expect(async () => {
    const after = await grantsCard.innerText();
    expect(after).not.toEqual(before);
  }).toPass({ timeout: 8000 });
});

test('data view renders charts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Data' }).click();
  await expect(page.getByText('People vs. Organizations Over Time')).toBeVisible();
  await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({ timeout: 15000 });
});

test('methodology page loads directly', async ({ page }) => {
  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: /How this data is prepared/i })).toBeVisible();
  await expect(page.getByText(/What this data can and cannot show/i)).toBeVisible();
});
