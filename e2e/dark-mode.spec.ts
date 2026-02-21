import { test, expect, Page } from '@playwright/test';

/** Helper: compute luminance of an element's background color via canvas. */
async function getLuminance(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  });
}

test.describe('Dark mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads in light mode by default', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    const toggleButton = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveText('Dark');
    await expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  test('clicking toggle switches to dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    const lightButton = page.getByRole('button', { name: /switch to light mode/i });
    await expect(lightButton).toHaveText('Light');
    await expect(lightButton).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  test('clicking toggle twice returns to light mode', async ({ page }) => {
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await page.getByRole('button', { name: /switch to light mode/i }).click();

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    const darkButton = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(darkButton).toHaveText('Dark');
    await expect(darkButton).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  test('dark mode applies dark background to body', async ({ page }) => {
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    const luminance = await getLuminance(page, 'body');
    expect(luminance).toBeLessThan(50);
  });

  test('light mode has light background on body', async ({ page }) => {
    const luminance = await getLuminance(page, 'body');
    expect(luminance).toBeGreaterThan(200);
  });

  test('dark mode persists while interacting with todos', async ({ page }) => {
    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Add a task while in dark mode
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Dark mode task');
    await page.getByRole('button', { name: 'Add' }).click();

    // Dark mode should still be active
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByText('Dark mode task')).toBeVisible();
  });
});

test.describe('Dark mode element styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('input field has dark styling in dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    const input = page.getByPlaceholder('Add a task...');
    const bgLuminance = await input.evaluate((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    });
    // dark:bg-gray-800 should be very dark
    expect(bgLuminance).toBeLessThan(80);
  });

  test('input text is light colored in dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    const input = page.getByPlaceholder('Add a task...');
    const textLuminance = await input.evaluate((el) => {
      const color = getComputedStyle(el).color;
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    });
    // dark:text-gray-100 should be very light
    expect(textLuminance).toBeGreaterThan(200);
  });

  test('empty state text adjusts in dark mode', async ({ page }) => {
    // Verify empty state is visible
    const emptyText = page.getByText('No tasks yet. Add one above!');
    await expect(emptyText).toBeVisible();

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    // Empty state should still be visible in dark mode
    await expect(emptyText).toBeVisible();
  });

  test('todo item border darkens in dark mode', async ({ page }) => {
    // Add a task first
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Test border');
    await page.getByRole('button', { name: 'Add' }).click();

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    const li = page.locator('li').first();
    const borderLuminance = await li.evaluate((el) => {
      const border = getComputedStyle(el).borderBottomColor;
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = border;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    });
    // dark:border-gray-700 should be dark
    expect(borderLuminance).toBeLessThan(120);
  });

  test('completed task has muted text in dark mode', async ({ page }) => {
    // Add and complete a task
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Complete in dark');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('checkbox').click();

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    // Completed text should have line-through
    const taskText = page.getByText('Complete in dark');
    await expect(taskText).toHaveClass(/line-through/);

    // Text should be muted (dark:text-gray-600 — mid-range luminance)
    const textLuminance = await taskText.evaluate((el) => {
      const color = getComputedStyle(el).color;
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    });
    // dark:text-gray-600 is muted — not bright white, not very dark
    expect(textLuminance).toBeLessThan(180);
    expect(textLuminance).toBeGreaterThan(50);
  });

  test('delete button has dark mode styling', async ({ page }) => {
    // Add a task
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Delete test');
    await page.getByRole('button', { name: 'Add' }).click();

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    // Delete button should be visible and functional
    const deleteBtn = page.getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).toBeVisible();

    // Verify it has a reddish color (dark:text-red-400)
    const isReddish = await deleteBtn.evaluate((el) => {
      const color = getComputedStyle(el).color;
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return r > 150 && r > g * 2 && r > b * 2;
    });
    expect(isReddish).toBe(true);
  });
});

test.describe('Dark mode full user journey', () => {
  test('add, complete, and delete tasks in dark mode', async ({ page }) => {
    await page.goto('/');

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const input = page.getByPlaceholder('Add a task...');

    // Add tasks in dark mode
    await input.fill('Dark task 1');
    await page.getByRole('button', { name: 'Add' }).click();
    await input.fill('Dark task 2');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Dark task 1')).toBeVisible();
    await expect(page.getByText('Dark task 2')).toBeVisible();

    // Complete first task
    const checkboxes = page.getByRole('checkbox');
    await checkboxes.first().click();
    await expect(checkboxes.first()).toBeChecked();
    await expect(page.getByText('Dark task 1')).toHaveClass(/line-through/);

    // Dark mode still active
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Delete completed task
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText('Dark task 1')).not.toBeVisible();

    // Second task still there, dark mode still active
    await expect(page.getByText('Dark task 2')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch back to light mode
    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Tasks survive mode switch
    await expect(page.getByText('Dark task 2')).toBeVisible();
  });

  test('dark mode resets on page reload (no persistence)', async ({ page }) => {
    await page.goto('/');

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload the page
    await page.reload();

    // Should be back in light mode (no localStorage persistence per plan)
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /switch to dark mode/i })).toHaveText('Dark');
  });
});
