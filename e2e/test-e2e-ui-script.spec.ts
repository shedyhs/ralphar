import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

test.describe('test:e2e:ui npm script', () => {
  test('script is defined in package.json with correct value', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
    );
    expect(pkg.scripts['test:e2e:ui']).toBe('playwright test --ui');
  });

  test('script is placed after test:e2e for grouping', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
    );
    const scriptKeys = Object.keys(pkg.scripts);
    const e2eIndex = scriptKeys.indexOf('test:e2e');
    const e2eUiIndex = scriptKeys.indexOf('test:e2e:ui');
    expect(e2eIndex).toBeGreaterThanOrEqual(0);
    expect(e2eUiIndex).toBe(e2eIndex + 1);
  });

  test('playwright accepts the --ui flag', () => {
    // Verify that `playwright test --ui --help` exits cleanly,
    // confirming the --ui flag is recognised by the installed Playwright version.
    const result = execSync('npx playwright test --ui --help', {
      cwd: join(__dirname, '..'),
      timeout: 15_000,
      encoding: 'utf-8',
    });
    expect(result).toContain('Usage');
  });
});
