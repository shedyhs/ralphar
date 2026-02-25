const { test, expect } = require('@playwright/test');

test.describe('P4: WebRTC Multiplayer', () => {

    test('two peers connect via offer/answer', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        await host.goto('/');
        await guest.goto('/');

        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offerCode = await host.locator('#connection-code').inputValue();

        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offerCode);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answerCode = await guest.locator('#connection-code').inputValue();

        await host.locator('#connection-code').fill(answerCode);
        await host.locator('#submit-answer').click();

        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });
        await expect(guest.locator('#game-container')).toBeVisible({ timeout: 10000 });

        await context1.close();
        await context2.close();
    });

    test('moves sync between peers', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        // Connect
        await host.goto('/');
        await guest.goto('/');
        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offer = await host.locator('#connection-code').inputValue();
        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offer);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answer = await guest.locator('#connection-code').inputValue();
        await host.locator('#connection-code').fill(answer);
        await host.locator('#submit-answer').click();
        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });

        // Host plays center
        await host.locator('.cell[data-index="4"]').click();
        await expect(guest.locator('.cell[data-index="4"]')).toHaveText('X', { timeout: 5000 });

        // Guest plays corner
        await guest.locator('.cell[data-index="0"]').click();
        await expect(host.locator('.cell[data-index="0"]')).toHaveText('O', { timeout: 5000 });

        await context1.close();
        await context2.close();
    });

    test('win detected on both peers', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        // Connect
        await host.goto('/');
        await guest.goto('/');
        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offer = await host.locator('#connection-code').inputValue();
        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offer);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answer = await guest.locator('#connection-code').inputValue();
        await host.locator('#connection-code').fill(answer);
        await host.locator('#submit-answer').click();
        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });

        // X wins top row: 0,1,2
        await host.locator('.cell[data-index="0"]').click();
        await expect(guest.locator('.cell[data-index="0"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="3"]').click();
        await expect(host.locator('.cell[data-index="3"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="1"]').click();
        await expect(guest.locator('.cell[data-index="1"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="4"]').click();
        await expect(host.locator('.cell[data-index="4"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="2"]').click();

        await expect(host.locator('#status')).toContainText('win', { timeout: 5000 });
        await expect(guest.locator('#status')).toContainText('lose', { timeout: 5000 });

        await context1.close();
        await context2.close();
    });

    test('draw detected on both peers', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        // Connect
        await host.goto('/');
        await guest.goto('/');
        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offer = await host.locator('#connection-code').inputValue();
        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offer);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answer = await guest.locator('#connection-code').inputValue();
        await host.locator('#connection-code').fill(answer);
        await host.locator('#submit-answer').click();
        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });

        // Draw sequence
        await host.locator('.cell[data-index="0"]').click();
        await expect(guest.locator('.cell[data-index="0"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="4"]').click();
        await expect(host.locator('.cell[data-index="4"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="8"]').click();
        await expect(guest.locator('.cell[data-index="8"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="2"]').click();
        await expect(host.locator('.cell[data-index="2"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="6"]').click();
        await expect(guest.locator('.cell[data-index="6"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="3"]').click();
        await expect(host.locator('.cell[data-index="3"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="5"]').click();
        await expect(guest.locator('.cell[data-index="5"]')).toHaveText('X', { timeout: 5000 });
        await guest.locator('.cell[data-index="7"]').click();
        await expect(host.locator('.cell[data-index="7"]')).toHaveText('O', { timeout: 5000 });
        await host.locator('.cell[data-index="1"]').click();

        await expect(host.locator('#status')).toContainText('draw', { timeout: 5000 });
        await expect(guest.locator('#status')).toContainText('draw', { timeout: 5000 });

        await context1.close();
        await context2.close();
    });

    test('reset syncs between peers', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        // Connect
        await host.goto('/');
        await guest.goto('/');
        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offer = await host.locator('#connection-code').inputValue();
        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offer);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answer = await guest.locator('#connection-code').inputValue();
        await host.locator('#connection-code').fill(answer);
        await host.locator('#submit-answer').click();
        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });

        await host.locator('.cell[data-index="4"]').click();
        await expect(guest.locator('.cell[data-index="4"]')).toHaveText('X', { timeout: 5000 });

        await host.locator('#new-game').click();

        await expect(host.locator('.cell[data-index="4"]')).toHaveText('', { timeout: 5000 });
        await expect(guest.locator('.cell[data-index="4"]')).toHaveText('', { timeout: 5000 });

        await context1.close();
        await context2.close();
    });

    test('disconnection shows message', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const host = await context1.newPage();
        const guest = await context2.newPage();

        // Connect
        await host.goto('/');
        await guest.goto('/');
        await host.locator('#mode-webrtc').click();
        await host.locator('#create-game').click();
        await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
        const offer = await host.locator('#connection-code').inputValue();
        await guest.locator('#mode-webrtc').click();
        await guest.locator('#connection-code').fill(offer);
        await guest.locator('#join-game').click();
        await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
        const answer = await guest.locator('#connection-code').inputValue();
        await host.locator('#connection-code').fill(answer);
        await host.locator('#submit-answer').click();
        await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });
        await expect(guest.locator('#game-container')).toBeVisible({ timeout: 10000 });

        // Guest disconnects
        await context2.close();

        await expect(host.locator('#status')).toContainText('disconnected', { timeout: 10000 });

        await context1.close();
    });

});
