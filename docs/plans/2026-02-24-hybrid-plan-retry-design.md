# Hybrid Plan Retry Design

## Problem

When validators reject a plan, ralph regenerates everything from scratch (Explorer + Plan Writer). This wastes time and money when most of the plan was fine and only 1-2 validators had issues.

## Solution

Conditionally patch or regenerate based on how many validators rejected:

- **3 rejections**: Regenerate from scratch (current behavior — plan is fundamentally broken)
- **1-2 rejections**: Patch the existing plan, only re-explore if a validator flags missing context

## Changes

### 1. Validator output format

Add a required field `NEEDS_RE_EXPLORATION: YES/NO` when verdict is `CHANGES_REQUESTED`:

- `YES` = the plan lacks codebase context that requires the Explorer to re-run
- `NO` = the plan has sufficient context but the plan itself needs changes

### 2. New `run_plan_patcher()` function

A variant of Plan Writer that receives the existing plan and modifies it:

- Reads `.ralph/plan.md` (existing plan)
- Reads validator feedback from `.ralph/validation-{a,b,c}.md`
- Modifies only the sections that were criticized
- Keeps approved sections intact
- Overwrites `.ralph/plan.md` with the updated plan

### 3. Conditional retry logic

```
if 3 rejected:
    rm checkpoints
    run_explorer(attempt) → run_plan_writer(attempt)   # from scratch
else (1-2 rejected):
    if any NEEDS_RE_EXPLORATION=YES:
        run_explorer(attempt)                           # re-explore with feedback
    run_plan_patcher()                                  # patch existing plan
```

### 4. Explorer

No changes to the Explorer itself. It is just called conditionally now.

## Tradeoffs

| Scenario | Cost | Risk |
|----------|------|------|
| 3 rejections (from scratch) | ~2 Opus calls | May lose good parts (acceptable — plan was fundamentally broken) |
| 1-2 rejections (patch) | ~0-1 Opus calls (explorer conditional) + 1 Opus call (patcher) | Patch may be superficial (mitigated by validators re-checking) |
