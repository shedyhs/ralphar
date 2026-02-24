# Ralph Committer Resilience

**Date:** 2026-02-24

## Problem

The ralph committer agent commits implementation changes but may leave files uncommitted in the working tree (e.g., e2e tests, package.json, playwright.config created by other agents). When the merge phase runs `git checkout main`, git blocks the checkout because those uncommitted files would be overwritten.

## Solution

Two changes to `ralph.sh`:

### 1. Committer prompt: `git add -A`

Add explicit instruction for the committer to run `git add -A` before committing. This ensures all files created or modified by any agent (implementer, e2e writer, etc.) are staged.

**File:** `ralph.sh`, `run_committer()` function (line ~514)
**Change:** Add "Use `git add -A` to stage ALL changes before committing" to the prompt.

### 2. Merge phase: stash safety net

Before `git checkout main`, detect and stash any remaining uncommitted/untracked changes. Pop the stash after merge succeeds. On merge failure, restore the stash on the feature branch.

**File:** `ralph.sh`, merge section (lines ~1005-1014)
**Change:** Wrap checkout/merge in stash push/pop logic.
