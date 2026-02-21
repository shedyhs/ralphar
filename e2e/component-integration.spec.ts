import { test, expect } from '@playwright/test';

test.describe('Component integration after refactoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('input clears after adding a task and is ready for next input', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('First task');
    await page.getByRole('button', { name: 'Add' }).click();

    // Input should be empty and ready for next task
    await expect(input).toHaveValue('');

    // Can immediately type the next task without clicking input again
    await input.fill('Second task');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(input).toHaveValue('');
    await expect(page.getByText('First task')).toBeVisible();
    await expect(page.getByText('Second task')).toBeVisible();
  });

  test('tasks appear in insertion order', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Alpha');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Beta');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Gamma');
    await page.getByRole('button', { name: 'Add' }).click();

    const items = page.locator('li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('Alpha');
    await expect(items.nth(1)).toContainText('Beta');
    await expect(items.nth(2)).toContainText('Gamma');
  });

  test('toggling one task does not affect others', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Task A');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Task B');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Task C');
    await page.getByRole('button', { name: 'Add' }).click();

    const checkboxes = page.getByRole('checkbox');

    // Toggle only the second task
    await checkboxes.nth(1).click();
    await expect(checkboxes.nth(1)).toBeChecked();

    // First and third should remain unchecked
    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(2)).not.toBeChecked();

    // Only second task text should have line-through
    await expect(page.getByText('Task A')).not.toHaveClass(/line-through/);
    await expect(page.getByText('Task B')).toHaveClass(/line-through/);
    await expect(page.getByText('Task C')).not.toHaveClass(/line-through/);
  });

  test('deleting a task from the middle preserves other tasks', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('First');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Middle');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Last');
    await page.getByRole('button', { name: 'Add' }).click();

    // Delete the middle task
    await page.getByRole('button', { name: 'Delete' }).nth(1).click();

    await expect(page.getByText('First')).toBeVisible();
    await expect(page.getByText('Middle')).not.toBeVisible();
    await expect(page.getByText('Last')).toBeVisible();

    // Order is preserved
    const items = page.locator('li');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('First');
    await expect(items.nth(1)).toContainText('Last');
  });

  test('empty state reappears after deleting all tasks', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Only task');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('No tasks yet.')).not.toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('interleaved add, toggle, delete operations', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    // Add two tasks
    await input.fill('Buy groceries');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Clean house');
    await page.getByRole('button', { name: 'Add' }).click();

    // Toggle first task
    await page.getByRole('checkbox').first().click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();

    // Add another task while first is completed
    await input.fill('Cook dinner');
    await page.getByRole('button', { name: 'Add' }).click();

    // All three tasks visible
    await expect(page.locator('li')).toHaveCount(3);

    // Delete the completed task (first)
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Two remaining tasks are both unchecked
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes).toHaveCount(2);
    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(1)).not.toBeChecked();

    await expect(page.getByText('Clean house')).toBeVisible();
    await expect(page.getByText('Cook dinner')).toBeVisible();
  });

  test('input state is independent from task list state', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    // Type something in input
    await input.fill('Work in progress');

    // Add a different task via Enter
    await input.fill('Submitted task');
    await input.press('Enter');

    // Input clears, task appears
    await expect(input).toHaveValue('');
    await expect(page.getByText('Submitted task')).toBeVisible();

    // Toggle the task — input should remain empty
    await page.getByRole('checkbox').click();
    await expect(input).toHaveValue('');

    // Delete the task — input should remain empty
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('each task item has its own checkbox, text, and delete button', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Task one');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Task two');
    await page.getByRole('button', { name: 'Add' }).click();

    // Each list item should have exactly one checkbox and one delete button
    const items = page.locator('li');
    await expect(items).toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      const item = items.nth(i);
      await expect(item.getByRole('checkbox')).toHaveCount(1);
      await expect(item.getByRole('button', { name: 'Delete' })).toHaveCount(1);
    }

    // First item has "Task one", second has "Task two"
    await expect(items.nth(0)).toContainText('Task one');
    await expect(items.nth(1)).toContainText('Task two');
  });

  test('dark mode toggle works alongside task operations', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    // Add a task in light mode
    await input.fill('Light mode task');
    await page.getByRole('button', { name: 'Add' }).click();

    // Switch to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Task still visible
    await expect(page.getByText('Light mode task')).toBeVisible();

    // Add a task in dark mode
    await input.fill('Dark mode task');
    await page.getByRole('button', { name: 'Add' }).click();

    // Toggle first task
    await page.getByRole('checkbox').first().click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();

    // Switch back to light mode
    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Both tasks still present, first still completed
    await expect(page.getByText('Light mode task')).toBeVisible();
    await expect(page.getByText('Dark mode task')).toBeVisible();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
  });
});
