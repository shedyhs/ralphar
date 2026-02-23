# Context Compaction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent Ralph agents from hitting context window limits by splitting the Planner into Explorer + PlanWriter phases and adding turn-limited chaining with checkpoints to all agents.

**Architecture:** Split `run_planner` into `run_explorer` (codebase exploration) and `run_plan_writer` (plan writing). Wrap chainable agents with `run_with_checkpoint` that retries with checkpoint files when `--max-turns` is exceeded. All agents get `--max-turns` safety limits.

**Tech Stack:** Bash (ralph.sh), Claude CLI (`--max-turns` flag)

---

### Task 1: Add helper functions (`check_agent_output` and `run_with_checkpoint`)

**Files:**
- Modify: `ralph.sh:139-146` (insert after `slugify`, before role functions)

**Step 1: Add `check_agent_output` function**

Insert after the `slugify` function (line 146), before `# === ROLE FUNCTIONS`:

```bash
check_agent_output() {
  local agent_name=$1
  case "$agent_name" in
    explorer)     [ -f "$RALPH_DIR/context.md" ] ;;
    plan-writer)  [ -f "$RALPH_DIR/plan.md" ] ;;
    implementer)  [ -f "$RALPH_DIR/implementation.md" ] ;;
    *)            return 0 ;;
  esac
}
```

**Step 2: Add `run_with_checkpoint` function**

Insert right after `check_agent_output`:

```bash
run_with_checkpoint() {
  local agent_fn=$1
  local max_turns=$2
  local max_chains=${3:-3}
  local agent_name=$4
  shift 4
  local extra_args=("$@")

  for ((chain=1; chain<=max_chains; chain++)); do
    if [ "$chain" -gt 1 ]; then
      printf " ${DIM}(chain $chain)${RESET}"
    fi
    $agent_fn "$max_turns" "${extra_args[@]}"

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

**Step 3: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output (no syntax errors)

**Step 4: Commit**

```bash
git add ralph.sh
git commit -m "feat: add checkpoint chaining infrastructure"
```

---

### Task 2: Add `run_explorer` function (new agent, split from Planner)

**Files:**
- Modify: `ralph.sh` (replace `run_planner` function at lines 150-184)

**Step 1: Replace `run_planner` with `run_explorer`**

Replace the entire `run_planner` function (lines 150-184) with:

```bash
run_explorer() {
  local max_turns=$1
  local attempt=$2

  local feedback_prompt=""
  if [ "$attempt" -gt 1 ]; then
    feedback_prompt="Previous validator feedback that you MUST address: \
    @.ralph/validation-a.md @.ralph/validation-b.md @.ralph/validation-c.md \
    Carefully read ALL feedback — the plan was rejected. Explore additional context to address the issues."
  fi

  local task_prompt=""
  if [ -n "$TASK" ]; then
    task_prompt="THE USER HAS SPECIFIED A TASK: $TASK \
    You MUST explore context for this specific task instead of picking from features.json."
  fi

  local checkpoint_prompt=""
  if [ -f "$RALPH_DIR/checkpoint-explorer.md" ]; then
    checkpoint_prompt="CONTINUE FROM CHECKPOINT: Read @.ralph/checkpoint-explorer.md for your previous progress. \
    Continue exploring from where you left off. Do NOT repeat work already done."
  fi

  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" --max-turns "$max_turns" -p "@PRD.md @.claude/features.json \
  You are the EXPLORER. Your job: \
  1. Read the PRD and features.json. The SINGLE highest-priority uncompleted task is the first entry in features.json where passes is false. \
  $task_prompt \
  2. Use the Task tool with subagent_type=Explore to dispatch 2-3 parallel subagents to search the codebase for relevant context (existing files, patterns, dependencies). \
  3. Write your findings to .ralph/context.md (what you found in the codebase). \
  \
  $feedback_prompt \
  $checkpoint_prompt \
  \
  ONLY write to .ralph/context.md. Do NOT write a plan. Do NOT implement any code. \
  \
  CHECKPOINT: If you cannot complete your exploration, save a detailed progress summary \
  to .ralph/checkpoint-explorer.md including: \
  - What you have already explored \
  - What remains to explore \
  - Files and patterns discovered so far \
  This allows a new session to continue where you left off." \
  > "$RALPH_DIR/explorer.log" 2>&1 &
  wait $!
}
```

**Step 2: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_explorer agent (split from planner)"
```

---

### Task 3: Add `run_plan_writer` function (refactored from Planner)

**Files:**
- Modify: `ralph.sh` (insert after `run_explorer`)

**Step 1: Add `run_plan_writer` function after `run_explorer`**

```bash
run_plan_writer() {
  local max_turns=$1
  local attempt=$2

  local feedback_prompt=""
  if [ "$attempt" -gt 1 ]; then
    feedback_prompt="Previous validator feedback that you MUST address: \
    @.ralph/validation-a.md @.ralph/validation-b.md @.ralph/validation-c.md \
    Carefully read ALL feedback and adjust your plan to address every issue raised."
  fi

  local task_prompt=""
  if [ -n "$TASK" ]; then
    task_prompt="THE USER HAS SPECIFIED A TASK: $TASK \
    You MUST plan this specific task instead of picking from features.json."
  fi

  local checkpoint_prompt=""
  if [ -f "$RALPH_DIR/checkpoint-plan-writer.md" ]; then
    checkpoint_prompt="CONTINUE FROM CHECKPOINT: Read @.ralph/checkpoint-plan-writer.md for your previous progress. \
    Continue writing the plan from where you left off."
  fi

  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" --max-turns "$max_turns" -p "@PRD.md @.claude/features.json @.ralph/context.md \
  You are the PLAN WRITER. Your job: \
  1. Read the PRD, features.json, and codebase context (.ralph/context.md). \
  $task_prompt \
  2. Write a detailed implementation plan to .ralph/plan.md with: \
     - Which task from the PRD you chose and why \
     - Exact files to create or modify \
     - Step-by-step implementation approach \
     - Edge cases to handle \
  \
  $feedback_prompt \
  $checkpoint_prompt \
  \
  Do NOT explore the codebase — all context is in .ralph/context.md. \
  Do NOT implement any code. ONLY write to .ralph/plan.md. \
  $([ -z "$TASK" ] && echo "If ALL entries in features.json have passes: true, write ONLY this to .ralph/plan.md: PRD_COMPLETE") \
  \
  CHECKPOINT: If you cannot complete the plan, save a detailed progress summary \
  to .ralph/checkpoint-plan-writer.md including: \
  - What you have planned so far \
  - What sections remain \
  - Key decisions made and why \
  This allows a new session to continue where you left off." \
  > "$RALPH_DIR/plan-writer.log" 2>&1 &
  wait $!
}
```

**Step 2: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_plan_writer agent (split from planner)"
```

---

### Task 4: Add `--max-turns` and checkpoint to `run_implementer`

**Files:**
- Modify: `ralph.sh` (the `run_implementer` function)

**Step 1: Update `run_implementer` to accept `max_turns` and support checkpoints**

Replace the function signature and add `--max-turns` to the claude call. Change `local attempt=$1` to accept max_turns as first arg:

```bash
run_implementer() {
  local max_turns=$1
  local attempt=$2

  local review_prompt=""
  if [ "$attempt" -gt 1 ] && [ -f ".ralph/review.md" ]; then
    review_prompt="The reviewer REJECTED your previous implementation. \
    Read the review at @.ralph/review.md and fix ALL issues listed. \
    Also read @.ralph/test-report.md for test results."
  fi

  local checkpoint_prompt=""
  if [ -f "$RALPH_DIR/checkpoint-implementer.md" ]; then
    checkpoint_prompt="CONTINUE FROM CHECKPOINT: Read @.ralph/checkpoint-implementer.md for your previous progress. \
    Continue implementing from where you left off. Do NOT redo completed work."
  fi

  local test_instructions=""
  if [ "$SKIP_TESTS" = false ]; then
    test_instructions="3. Write unit tests for the code you implemented. \
    4. Run the unit tests with 'npm run test' and fix any failures before finishing. \
    5. Write a summary of what you implemented to .ralph/implementation.md with: \
       - Files created or modified \
       - Unit tests created or modified \
       - Key decisions made during implementation \
       - Anything that deviated from the plan and why"
  else
    test_instructions="3. Do NOT write any tests. \
    4. Write a summary of what you implemented to .ralph/implementation.md with: \
       - Files created or modified \
       - Key decisions made during implementation \
       - Anything that deviated from the plan and why"
  fi

  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" --max-turns "$max_turns" -p "@.ralph/plan.md \
  You are the IMPLEMENTER. Your job: \
  1. Read the approved plan in .ralph/plan.md. \
  2. Implement the code changes described in the plan. \
  $test_instructions \
  \
  $review_prompt \
  $checkpoint_prompt \
  \
  Follow the plan precisely. Do NOT add features not in the plan. \
  Do NOT commit. Do NOT modify PRD.md or features.json. \
  \
  CHECKPOINT: If you cannot complete your implementation, save a detailed progress summary \
  to .ralph/checkpoint-implementer.md including: \
  - What you have already implemented \
  - What files were created or modified \
  - What remains to be done \
  - Any test results so far \
  This allows a new session to continue where you left off." \
  > "$RALPH_DIR/implementer.log" 2>&1 &
  wait $!
}
```

**Step 2: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add --max-turns and checkpoint to implementer"
```

---

### Task 5: Add `--max-turns` to all other agents

**Files:**
- Modify: `ralph.sh` (functions: `run_validator`, `run_e2e_writer`, `run_tester`, `run_reviewer_frontend`, `run_reviewer_backend`, `run_register_task`, `run_committer`)

**Step 1: Add `--max-turns 15` to `run_validator`**

In `run_validator`, add `--max-turns 15` to the claude call:

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" --max-turns 15 -p "@PRD.md @.ralph/context.md @.ralph/plan.md \
```

**Step 2: Add `--max-turns 30` to `run_e2e_writer`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" --max-turns 30 -p "@.ralph/plan.md @.ralph/implementation.md \
```

**Step 3: Add `--max-turns 15` to `run_tester`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" --max-turns 15 -p "@.ralph/implementation.md \
```

**Step 4: Add `--max-turns 15` to `run_reviewer_frontend`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" --max-turns 15 -p "@.ralph/plan.md @.ralph/implementation.md $test_ref \
```

**Step 5: Add `--max-turns 15` to `run_reviewer_backend`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" --max-turns 15 -p "@.ralph/plan.md @.ralph/implementation.md $test_ref \
```

**Step 6: Add `--max-turns 10` to `run_register_task`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" --max-turns 10 -p "@.claude/features.json @.ralph/plan.md \
```

**Step 7: Add `--max-turns 10` to `run_committer`**

```bash
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" --max-turns 10 -p "@PRD.md @.claude/features.json @.ralph/plan.md @.ralph/implementation.md \
```

**Step 8: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 9: Commit**

```bash
git add ralph.sh
git commit -m "feat: add --max-turns safety limits to all agents"
```

---

### Task 6: Update main loop — planning phase

**Files:**
- Modify: `ralph.sh` (lines 423-475, the planning while loop)

**Step 1: Replace the planning phase**

Replace the planning phase (from `step "Planning..."` through `step_done` after planner) with two-phase approach:

```bash
    step "Exploring..."
    run_with_checkpoint run_explorer 30 3 "explorer" "$plan_attempt"
    step_done

    # Check if PRD is complete (skip when user specified a task)
    if [ -z "$TASK" ] && [ -f .ralph/context.md ] && grep -q "PRD_COMPLETE" .ralph/context.md 2>/dev/null; then
      printf "  ${GREEN}PRD complete. All tasks done.${RESET}\n"
      exit 0
    fi

    step "Writing plan..."
    run_with_checkpoint run_plan_writer 20 3 "plan-writer" "$plan_attempt"
    step_done
```

Note: The PRD_COMPLETE check moves to after plan_writer since plan_writer writes plan.md. Keep the original check on plan.md:

```bash
    if [ -z "$TASK" ] && grep -q "PRD_COMPLETE" .ralph/plan.md 2>/dev/null; then
      printf "  ${GREEN}PRD complete. All tasks done.${RESET}\n"
      exit 0
    fi
```

**Step 2: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: split planning phase into explorer + plan-writer"
```

---

### Task 7: Update main loop — implementation phase

**Files:**
- Modify: `ralph.sh` (lines 510-511)

**Step 1: Replace `run_implementer` call with checkpoint wrapper**

Replace:
```bash
    step "Implementing..."
    run_implementer "$impl_attempt"
    step_done
```

With:
```bash
    step "Implementing..."
    run_with_checkpoint run_implementer 50 3 "implementer" "$impl_attempt"
    step_done
```

**Step 2: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: wrap implementer with checkpoint chaining"
```

---

### Task 8: Clean up checkpoint files between planning retries

**Files:**
- Modify: `ralph.sh` (in the planning while loop, at the rejection branch)

**Step 1: Add checkpoint cleanup when validators reject**

In the rejection branch (after `plan_attempt=$((plan_attempt + 1))`), add:

```bash
      rm -f "$RALPH_DIR/checkpoint-explorer.md" "$RALPH_DIR/checkpoint-plan-writer.md"
```

This ensures stale checkpoints from previous attempts don't confuse new attempts.

**Step 2: Similarly, clean implementer checkpoint on review rejection**

In the implementation rejection branch (after `impl_attempt=$((impl_attempt + 1))`), add:

```bash
      rm -f "$RALPH_DIR/checkpoint-implementer.md"
```

**Step 3: Verify syntax**

Run: `bash -n ralph.sh`
Expected: no output

**Step 4: Commit**

```bash
git add ralph.sh
git commit -m "feat: clean checkpoint files between retry attempts"
```

---

### Task 9: Final verification

**Step 1: Verify complete script syntax**

Run: `bash -n ralph.sh`
Expected: no output (no syntax errors)

**Step 2: Dry-run review**

Read through the complete `ralph.sh` to verify:
- `run_planner` is fully removed (replaced by `run_explorer` + `run_plan_writer`)
- All `claude` calls have `--max-turns`
- `run_with_checkpoint` is called for explorer, plan-writer, and implementer
- Checkpoint files are cleaned between retries
- The PRD_COMPLETE check still works

**Step 3: Final commit (if any cleanup needed)**

```bash
git add ralph.sh
git commit -m "chore: final cleanup for context compaction"
```
