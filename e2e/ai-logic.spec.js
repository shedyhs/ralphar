const { test, expect } = require('@playwright/test');

test.describe('P1: AI Logic and Strategy', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('AI takes winning move when available', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', null, null, 'O', 'O', null, 'X', null, null];
            game.currentPlayer = 'O';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[5]).toBe('O');
    });

    test('AI blocks opponent winning move', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', 'X', null, 'O', null, null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[2]).toBe('O');
    });

    test('AI takes center if available', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', null, null, null, null, null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[4]).toBe('O');
    });

    test('AI takes corner when center occupied', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = [null, null, null, null, 'X', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        const corners = [0, 2, 6, 8];
        const aiTookCorner = corners.some(c => board[c] === 'O');
        expect(aiTookCorner).toBe(true);
    });

    test('AI blocks diagonal win [0,4,8]', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', null, null, null, 'X', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[8]).toBe('O');
    });

    test('AI blocks anti-diagonal win [2,4,6]', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = [null, null, 'X', null, 'X', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[6]).toBe('O');
    });

    test('AI prioritizes winning over blocking', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', 'X', null, 'O', 'O', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        expect(board[5]).toBe('O');
    });

    test('AI takes any available cell when no strategy applies', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', 'O', 'X', 'X', 'O', 'O', null, 'X', null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });
        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);
        const board = await page.evaluate(() => game.board);
        const emptyCells = board.filter(c => c === null).length;
        expect(emptyCells).toBe(1);
    });
});

test.describe('P1: AI Game Flow Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('player cannot click during AI turn', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();

        // Try to click during AI's turn (should be blocked)
        await page.locator('.cell[data-index="4"]').click();

        // Wait for AI to move
        await page.waitForTimeout(400);

        // Check that cell 4 was taken by AI (O), not player (X)
        const cell4Text = await page.locator('.cell[data-index="4"]').textContent();
        expect(cell4Text).toBe('O'); // AI took it, not blocked by player click
    });

    test('AI moves automatically after player move', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);
        const board = await page.evaluate(() => game.board);
        const aiMoves = board.filter(c => c === 'O').length;
        expect(aiMoves).toBe(1);
    });

    test('game correctly detects draw in AI mode', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.evaluate(() => {
            game.board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null];
            game.currentPlayer = 'X';
            updateUI();
        });
        await page.locator('.cell[data-index="8"]').click();
        const state = await page.evaluate(() => ({
            isGameOver: game.isGameOver,
            winner: game.winner
        }));
        expect(state.isGameOver).toBe(true);
        expect(state.winner).toBe(null);
    });

    test('AI moves first when player chooses O', async ({ page }) => {
        await page.locator('#mode-ai-o').click();
        await page.waitForTimeout(400);
        const board = await page.evaluate(() => game.board);
        const xMoves = board.filter(c => c === 'X').length;
        expect(xMoves).toBe(1);
        expect(board[4]).toBe('X'); // AI should take center
    });

    test('player can win against AI', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        // Pre-set board where player X has winning move available
        await page.evaluate(() => {
            game.board = ['X', 'X', null, 'O', 'O', null, null, null, null];
            game.currentPlayer = 'X';
            updateUI();
        });
        await page.locator('.cell[data-index="2"]').click();
        await page.waitForTimeout(100);
        const state = await page.evaluate(() => ({
            isGameOver: game.isGameOver,
            winner: game.winner
        }));
        expect(state.isGameOver).toBe(true);
        expect(state.winner).toBe('X');
    });
});

test.describe('P1: Mode Selection and Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show mode selection on initial load', async ({ page }) => {
        await expect(page.locator('#mode-selection')).toBeVisible();
        await expect(page.locator('#game-container')).toBeHidden();
    });

    test('should display all three mode buttons', async ({ page }) => {
        await expect(page.locator('#mode-ai-x')).toBeVisible();
        await expect(page.locator('#mode-ai-x')).toHaveText('Play as X vs AI');

        await expect(page.locator('#mode-ai-o')).toBeVisible();
        await expect(page.locator('#mode-ai-o')).toHaveText('Play as O vs AI');

        await expect(page.locator('#mode-local')).toBeVisible();
        await expect(page.locator('#mode-local')).toHaveText('vs Player (local)');
    });

    test('clicking "Play as X vs AI" starts AI game with player as X', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        await expect(page.locator('#mode-selection')).toBeHidden();
        await expect(page.locator('#game-container')).toBeVisible();

        const state = await page.evaluate(() => ({
            mode: game.mode,
            playerSymbol: game.playerSymbol,
            aiSymbol: game.aiSymbol
        }));

        expect(state.mode).toBe('ai');
        expect(state.playerSymbol).toBe('X');
        expect(state.aiSymbol).toBe('O');
    });

    test('clicking "Play as O vs AI" starts AI game with player as O', async ({ page }) => {
        await page.locator('#mode-ai-o').click();

        await expect(page.locator('#mode-selection')).toBeHidden();
        await expect(page.locator('#game-container')).toBeVisible();

        const state = await page.evaluate(() => ({
            mode: game.mode,
            playerSymbol: game.playerSymbol,
            aiSymbol: game.aiSymbol
        }));

        expect(state.mode).toBe('ai');
        expect(state.playerSymbol).toBe('O');
        expect(state.aiSymbol).toBe('X');
    });

    test('clicking "vs Player (local)" starts local multiplayer game', async ({ page }) => {
        await page.locator('#mode-local').click();

        await expect(page.locator('#mode-selection')).toBeHidden();
        await expect(page.locator('#game-container')).toBeVisible();

        const state = await page.evaluate(() => ({
            mode: game.mode,
            playerSymbol: game.playerSymbol,
            aiSymbol: game.aiSymbol
        }));

        expect(state.mode).toBe('local');
        expect(state.playerSymbol).toBe(null);
        expect(state.aiSymbol).toBe(null);
    });

    test('change mode button returns to mode selection', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        await page.locator('#change-mode').click();

        await expect(page.locator('#mode-selection')).toBeVisible();
        await expect(page.locator('#game-container')).toBeHidden();

        const state = await page.evaluate(() => ({
            mode: game.mode,
            board: game.board
        }));

        expect(state.mode).toBe(null);
        expect(state.board.every(c => c === null)).toBe(true);
    });

    test('new game resets board but keeps AI mode', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        await page.locator('#new-game').click();
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => ({
            mode: game.mode,
            aiSymbol: game.aiSymbol,
            board: game.board
        }));

        expect(state.mode).toBe('ai');
        expect(state.aiSymbol).toBe('O');
        expect(state.board.every(c => c === null)).toBe(true);
    });

    test('change mode button is visible in game', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await expect(page.locator('#change-mode')).toBeVisible();
        await expect(page.locator('#change-mode')).toHaveText('Change Mode');
    });
});

test.describe('P1: Complete AI Gameplay Scenarios', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('full game: AI can win', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        // Set up a board where AI (O) is about to win
        await page.evaluate(() => {
            game.board = ['X', null, 'X', 'O', 'O', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });

        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);

        const state = await page.evaluate(() => ({
            isGameOver: game.isGameOver,
            winner: game.winner
        }));

        expect(state.isGameOver).toBe(true);
        expect(state.winner).toBe('O');

        const statusText = await page.locator('#status').textContent();
        expect(statusText).toBe('Player O wins!');
    });

    test('full game: player plays as X and makes moves', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        // Player makes first move
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        // Verify player's move
        const cell0Text = await page.locator('.cell[data-index="0"]').textContent();
        expect(cell0Text).toBe('X');

        // Verify AI responded
        const board = await page.evaluate(() => game.board);
        const oMoves = board.filter(c => c === 'O').length;
        expect(oMoves).toBe(1);
    });

    test('full game: player plays as O and AI goes first', async ({ page }) => {
        await page.locator('#mode-ai-o').click();
        await page.waitForTimeout(400);

        // AI should have made first move as X
        const board = await page.evaluate(() => game.board);
        const xMoves = board.filter(c => c === 'X').length;
        expect(xMoves).toBe(1);

        // Status should show O's turn (player)
        const statusText = await page.locator('#status').textContent();
        expect(statusText).toBe("Player O's turn");
    });

    test('AI blocks player from winning on next move', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        // Set up board where player X has two in a row
        await page.evaluate(() => {
            game.board = ['X', 'X', null, null, 'O', null, null, null, null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });

        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);

        const board = await page.evaluate(() => game.board);
        // AI should block at position 2
        expect(board[2]).toBe('O');
    });

    test('AI responds within reasonable time', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        const startTime = Date.now();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(500);
        const endTime = Date.now();

        const board = await page.evaluate(() => game.board);
        const oMoves = board.filter(c => c === 'O').length;

        expect(oMoves).toBe(1);
        expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('multiple games in AI mode maintain correct state', async ({ page }) => {
        // Game 1
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        // Start new game
        await page.locator('#new-game').click();
        await page.waitForTimeout(400);

        // Verify fresh board
        const board1 = await page.evaluate(() => game.board);
        expect(board1.every(c => c === null)).toBe(true);

        // Game 2
        await page.locator('.cell[data-index="4"]').click();
        await page.waitForTimeout(400);

        const board2 = await page.evaluate(() => game.board);
        expect(board2[4]).toBe('X');
        const oMoves = board2.filter(c => c === 'O').length;
        expect(oMoves).toBe(1);
    });

    test('switching from AI to local mode works correctly', async ({ page }) => {
        // Start AI game
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        // Change to local mode
        await page.locator('#change-mode').click();
        await page.locator('#mode-local').click();

        // Make moves as both players (no AI interference)
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(100);

        await page.locator('.cell[data-index="1"]').click();
        await page.waitForTimeout(100);

        const board = await page.evaluate(() => game.board);
        expect(board[0]).toBe('X');
        expect(board[1]).toBe('O');

        // No AI moves should have been made
        const state = await page.evaluate(() => game.mode);
        expect(state).toBe('local');
    });
});

test.describe('P1: AI Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('AI does not move after game is over', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        // Set up winning position for player
        await page.evaluate(() => {
            game.board = ['X', 'X', null, 'O', 'O', null, null, null, null];
            game.currentPlayer = 'X';
            updateUI();
        });

        // Player wins
        await page.locator('.cell[data-index="2"]').click();
        await page.waitForTimeout(400);

        // Verify game is over
        const state = await page.evaluate(() => ({
            isGameOver: game.isGameOver,
            winner: game.winner
        }));
        expect(state.isGameOver).toBe(true);
        expect(state.winner).toBe('X');

        // Count moves - should not change
        const boardBefore = await page.evaluate(() => game.board);
        await page.waitForTimeout(500);
        const boardAfter = await page.evaluate(() => game.board);

        expect(boardBefore).toEqual(boardAfter);
    });

    test('clicking occupied cell during AI mode does nothing', async ({ page }) => {
        await page.locator('#mode-ai-x').click();
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(400);

        // Try clicking same cell again
        await page.locator('.cell[data-index="0"]').click();
        await page.waitForTimeout(100);

        const cell0Text = await page.locator('.cell[data-index="0"]').textContent();
        expect(cell0Text).toBe('X'); // Should still be X
    });

    test('AI handles board with only one empty cell', async ({ page }) => {
        await page.locator('#mode-ai-x').click();

        await page.evaluate(() => {
            game.board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
            game.currentPlayer = 'O';
            game.aiSymbol = 'O';
            game.playerSymbol = 'X';
            updateUI();
        });

        await page.evaluate(() => makeAIMove());
        await page.waitForTimeout(100);

        const board = await page.evaluate(() => game.board);
        expect(board[8]).toBe('O');

        const state = await page.evaluate(() => game.isGameOver);
        expect(state).toBe(true); // Should be a draw
    });
});
