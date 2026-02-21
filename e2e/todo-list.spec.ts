import { test, expect } from '@playwright/test';

test.describe('Todo list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows heading and empty state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Todo List' })).toBeVisible();
    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('adds a task', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Buy groceries');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('No tasks yet.')).not.toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('adds a task by pressing Enter', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Press enter task');
    await input.press('Enter');

    await expect(page.getByText('Press enter task')).toBeVisible();
  });

  test('does not add an empty task', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('does not add a whitespace-only task', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('   ');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('adds multiple tasks', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Task 1');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Task 2');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Task 3');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Task 1')).toBeVisible();
    await expect(page.getByText('Task 2')).toBeVisible();
    await expect(page.getByText('Task 3')).toBeVisible();
  });

  test('marks a task as completed', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Complete me');
    await page.getByRole('button', { name: 'Add' }).click();

    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).not.toBeChecked();

    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Completed task text should have line-through style
    const taskText = page.getByText('Complete me');
    await expect(taskText).toHaveClass(/line-through/);
  });

  test('unchecks a completed task', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Toggle me');
    await page.getByRole('button', { name: 'Add' }).click();

    const checkbox = page.getByRole('checkbox');
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    const taskText = page.getByText('Toggle me');
    await expect(taskText).not.toHaveClass(/line-through/);
  });

  test('deletes a task', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');
    await input.fill('Delete me');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Delete me')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete me')).not.toBeVisible();
    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });

  test('deletes one task from multiple', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    await input.fill('Keep me');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Delete me');
    await page.getByRole('button', { name: 'Add' }).click();

    // Delete the second task
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    await deleteButtons.nth(1).click();

    await expect(page.getByText('Keep me')).toBeVisible();
    await expect(page.getByText('Delete me')).not.toBeVisible();
  });

  test('full user journey: add, complete, delete', async ({ page }) => {
    const input = page.getByPlaceholder('Add a task...');

    // Add tasks
    await input.fill('Buy milk');
    await page.getByRole('button', { name: 'Add' }).click();

    await input.fill('Walk the dog');
    await page.getByRole('button', { name: 'Add' }).click();

    // Verify both exist
    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Walk the dog')).toBeVisible();

    // Complete the first task
    const checkboxes = page.getByRole('checkbox');
    await checkboxes.first().click();
    await expect(checkboxes.first()).toBeChecked();

    // Delete the completed task
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText('Buy milk')).not.toBeVisible();

    // Second task remains
    await expect(page.getByText('Walk the dog')).toBeVisible();

    // Delete the remaining task
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
  });
});
