# Context Compaction for Ralph Agents

## Problem

Ralph agents (especially the Planner) hit Claude's context window limit during long sessions. The Planner explores the codebase, dispatches subagents, processes results, and writes plans — all in a single `claude -p` invocation that can exhaust the context window.

## Solution

Combine **phase splitting** with **turn-limited chaining**:

1. Split large agents into smaller focused phases that communicate via `.ralph/` files
2. Limit each phase to N turns (`--max-turns`) with checkpoint-based continuation

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Planner (before: 1 large session)               │
│                                                 │
│  Now: Explorer ──→ context.md ──→ PlanWriter    │
│        (max-turns 30)            (max-turns 20) │
│                                                 │
│  If PlanWriter doesn't finish in N turns:       │
│  checkpoint.md ──→ PlanWriter (session 2)       │
└─────────────────────────────────────────────────┘
```

## New Components

### `run_with_checkpoint` — generic chaining wrapper

Runs an agent function with `--max-turns`. If the expected output file isn't produced but a checkpoint file exists, starts a new session that reads the checkpoint. Retries up to M times (default 3).

```bash
run_with_checkpoint() {
  local agent_fn=$1 max_turns=$2 max_chains=${3:-3} agent_name=$4
  for ((chain=1; chain<=max_chains; chain++)); do
    $agent_fn "$max_turns"
    if check_agent_output "$agent_name"; then
      rm -f "$RALPH_DIR/checkpoint-${agent_name}.md"
      return 0
    fi
    if [ ! -f "$RALPH_DIR/checkpoint-${agent_name}.md" ]; then
      return 0
    fi
  done
}
```

### `run_explorer` — new agent (split from Planner)

- **Reads**: PRD.md, features.json, validator feedback (if retry)
- **Does**: Explores codebase with subagents, identifies relevant files/patterns
- **Produces**: `.ralph/context.md`
- **Turn limit**: 30

### `run_plan_writer` — refactored Planner

- **Reads**: context.md, PRD.md, features.json, validator feedback (if retry)
- **Does**: Writes implementation plan (no codebase exploration)
- **Produces**: `.ralph/plan.md`
- **Turn limit**: 20

## Turn Limits Per Agent

| Agent | Splitting | --max-turns | Chaining |
|-------|-----------|-------------|----------|
| Explorer (new) | From Planner | 30 | Yes (3 chains) |
| PlanWriter (refactored) | From Planner | 20 | Yes (3 chains) |
| Validators A/B/C | No | 15 | No |
| Implementer | No | 50 | Yes (3 chains) |
| E2E Writer | No | 30 | No |
| Tester | No | 15 | No |
| Reviewers FE/BE | No | 15 | No |
| Task Registrar | No | 10 | No |
| Committer | No | 10 | No |

## Checkpoint Prompt Instruction

Added to all chainable agents:

```
CHECKPOINT: If you cannot complete your task, save a detailed progress summary
to .ralph/checkpoint-<name>.md including:
- What you've already done
- What remains to be done
- Decisions made and why
- Relevant files discovered
This allows a new session to continue where you left off.
```

## Main Loop Changes

### Planning phase (before)
```bash
run_planner "$plan_attempt"
```

### Planning phase (after)
```bash
run_with_checkpoint run_explorer 30 3 "explorer"
run_with_checkpoint run_plan_writer 20 3 "plan-writer"
```

### Implementation phase
```bash
# Before:
run_implementer "$impl_attempt"

# After:
run_with_checkpoint run_implementer 50 3 "implementer"
```

## Expected Impact

- Planner context usage drops ~50% (split into 2 focused phases)
- Turn limits prevent runaway context growth
- Checkpoint chaining recovers from context exhaustion gracefully
- All other agents get safety limits without architectural changes
