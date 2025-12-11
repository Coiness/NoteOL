import { test, expect } from '@playwright/test';

// Register page navigation tests

test('register page has register form and link back to login', async ({ page }) => {
  await page.goto('/register');

  // Check register title
  await expect(page).toHaveTitle(/注册/);

  // Ensure placeholder exists
  await expect(page.getByPlaceholder('name@example.com')).toBeVisible();

  // Click "已有账号？去登录" and wait for navigation
  const loginLink = page.locator('a[href="/login"]');
  await expect(loginLink).toBeVisible();
  await Promise.all([
    page.waitForURL('**/login', { timeout: 5000 }),
    loginLink.click(),
  ]);

  await expect(page).toHaveURL(/.*\/login/);
  await expect(page).toHaveTitle(/登录/);
});
