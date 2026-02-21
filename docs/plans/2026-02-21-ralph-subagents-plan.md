# Ralph Subagents Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite ralph.sh to use an 8-role pipeline (planner, 3 validators, implementer, tester, reviewer, committer) with two quality loops.

**Architecture:** Bash script with one function per role. Each role calls `claude -p` with a role-specific prompt. Validators run in parallel via `&` + `wait`. Communication between stages via files in `.ralph/`. Two infinite loops: planning (until 3 validators agree) and implementation (until reviewer approves).

**Tech Stack:** Bash, Claude CLI (`claude -p`), git

**Design doc:** `docs/plans/2026-02-21-ralph-subagents-design.md`

---

### Task 1: Script skeleton with argument parsing and .ralph cleanup

**Files:**
- Modify: `ralph.sh`

**Step 1: Replace ralph.sh with the new skeleton**

```bash
#!/bin/bash
set -e

RALPH_DIR=".ralph"

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

clean_ralph() {
  rm -rf "$RALPH_DIR"
  mkdir -p "$RALPH_DIR"
}

# === ROLE FUNCTIONS (to be added) ===

# === MAIN LOOP ===
for ((i=1; i<=$1; i++)); do
  echo "========================================="
  echo "ITERATION $i"
  echo "========================================="

  clean_ralph

  # PLANNING PHASE (to be added)

  # IMPLEMENTATION PHASE (to be added)

  # COMMIT PHASE (to be added)

  echo "Iteration $i complete."
done
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "refactor: ralph.sh skeleton with .ralph dir and cleanup"
```

---

### Task 2: Write the run_planner function

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_planner function after `clean_ralph`**

The planner reads PRD.md and features.json. On retries it also reads validator feedback. It uses the Task tool internally to dispatch parallel Explore subagents for codebase context. It writes `.ralph/context.md` and `.ralph/plan.md`.

```bash
run_planner() {
  local attempt=$1
  echo "--- PLANNER (attempt $attempt) ---"

  local feedback_prompt=""
  if [ "$attempt" -gt 1 ]; then
    feedback_prompt="Previous validator feedback that you MUST address: \
    @.ralph/validation-a.md @.ralph/validation-b.md @.ralph/validation-c.md \
    Carefully read ALL feedback and adjust your plan to address every issue raised."
  fi

  claude --permission-mode acceptEdits -p "@PRD.md @features.json \
  You are the PLANNER. Your job: \
  1. Read the PRD and identify the SINGLE highest-priority uncompleted task. \
  2. Use the Task tool with subagent_type=Explore to dispatch 2-3 parallel subagents to search the codebase for relevant context (existing files, patterns, dependencies). \
  3. Write your findings to .ralph/context.md (what you found in the codebase). \
  4. Write a detailed implementation plan to .ralph/plan.md with: \
     - Which task from the PRD you chose and why \
     - Exact files to create or modify \
     - Step-by-step implementation approach \
     - Edge cases to handle \
  \
  $feedback_prompt \
  \
  ONLY write to .ralph/context.md and .ralph/plan.md. Do NOT implement any code. \
  If the PRD has no uncompleted tasks, write ONLY this to .ralph/plan.md: PRD_COMPLETE"
}
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_planner function with parallel context search"
```

---

### Task 3: Write the run_validator function (parameterized)

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_validator function after run_planner**

A single function parameterized by validator ID (a/b/c) and focus area. Each validator writes to `.ralph/validation-{id}.md` with a `VERDICT:` line.

```bash
run_validator() {
  local id=$1
  local focus=$2
  echo "--- VALIDATOR ${id^^} ($focus) ---"

  claude --permission-mode acceptEdits -p "@PRD.md @.ralph/context.md @.ralph/plan.md \
  You are VALIDATOR ${id^^}. Your focus: $focus. \
  \
  Read the plan in .ralph/plan.md and the codebase context in .ralph/context.md. \
  Evaluate the plan strictly through your lens ($focus). \
  \
  Write your evaluation to .ralph/validation-${id}.md. \
  Your file MUST start with exactly one of these lines: \
  VERDICT: APPROVED \
  or \
  VERDICT: CHANGES_REQUESTED \
  \
  If CHANGES_REQUESTED, list specific issues that must be fixed. \
  Be concise and actionable. Do NOT rewrite the plan yourself. \
  ONLY write to .ralph/validation-${id}.md. Do NOT modify any other file."
}
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add parameterized run_validator function"
```

---

### Task 4: Wire the planning phase with consensus loop

**Files:**
- Modify: `ralph.sh`

**Step 1: Add the planning phase to the main loop**

Replace the `# PLANNING PHASE (to be added)` comment with:

```bash
  # === PLANNING PHASE ===
  plan_attempt=1
  while true; do
    run_planner "$plan_attempt"

    # Check if PRD is complete
    if grep -q "PRD_COMPLETE" .ralph/plan.md 2>/dev/null; then
      echo "PRD complete after $i iterations."
      exit 0
    fi

    # Run 3 validators in parallel
    run_validator "a" "COHERENCE: Is the plan coherent? Do decisions make sense given the context? Are there contradictions?" &
    pid_a=$!
    run_validator "b" "COMPLETENESS: Does the plan cover everything the task requires? Missing edge cases? Missing error handling?" &
    pid_b=$!
    run_validator "c" "SIMPLICITY: Is the plan unnecessarily complex? Over-engineered? Can it be simpler?" &
    pid_c=$!
    wait $pid_a $pid_b $pid_c

    # Check consensus
    approved=0
    for v in a b c; do
      if grep -q "VERDICT: APPROVED" ".ralph/validation-${v}.md" 2>/dev/null; then
        approved=$((approved + 1))
      fi
    done

    if [ "$approved" -eq 3 ]; then
      echo "--- PLAN APPROVED (attempt $plan_attempt) ---"
      break
    else
      echo "--- PLAN REJECTED ($approved/3 approved, attempt $plan_attempt) ---"
      plan_attempt=$((plan_attempt + 1))
    fi
  done
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: planning phase with parallel validators and consensus loop"
```

---

### Task 5: Write the run_implementer function

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_implementer function after run_validator**

```bash
run_implementer() {
  local attempt=$1
  echo "--- IMPLEMENTER (attempt $attempt) ---"

  local review_prompt=""
  if [ "$attempt" -gt 1 ] && [ -f ".ralph/review.md" ]; then
    review_prompt="The reviewer REJECTED your previous implementation. \
    Read the review at @.ralph/review.md and fix ALL issues listed. \
    Also read @.ralph/test-report.md for test results."
  fi

  claude --permission-mode acceptEdits -p "@.ralph/plan.md \
  You are the IMPLEMENTER. Your job: \
  1. Read the approved plan in .ralph/plan.md. \
  2. Implement the code changes described in the plan. \
  3. Write a summary of what you implemented to .ralph/implementation.md with: \
     - Files created or modified \
     - Key decisions made during implementation \
     - Anything that deviated from the plan and why \
  \
  $review_prompt \
  \
  Follow the plan precisely. Do NOT add features not in the plan. \
  Do NOT run tests. Do NOT commit. Do NOT modify PRD.md or features.json."
}
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_implementer function"
```

---

### Task 6: Write the run_tester function

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_tester function after run_implementer**

```bash
run_tester() {
  echo "--- TESTER ---"

  claude --permission-mode acceptEdits -p "@.ralph/implementation.md \
  You are the TESTER. Your job: \
  1. Read what was implemented in .ralph/implementation.md. \
  2. Run ALL three feedback loops: \
     a. npm run typecheck \
     b. npm run test \
     c. npm run lint \
  3. Write the results to .ralph/test-report.md with this format: \
     \
     TYPECHECK: PASS or FAIL \
     [output if failed] \
     \
     TESTS: PASS or FAIL \
     [output if failed] \
     \
     LINT: PASS or FAIL \
     [output if failed] \
  \
  Do NOT fix any code. Do NOT modify any files except .ralph/test-report.md. \
  Just run the tests and report results."
}
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_tester function"
```

---

### Task 7: Write the run_reviewer function

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_reviewer function after run_tester**

```bash
run_reviewer() {
  echo "--- REVIEWER ---"

  claude --permission-mode acceptEdits -p "@.ralph/plan.md @.ralph/implementation.md @.ralph/test-report.md \
  You are the REVIEWER. Your job: \
  1. Read the approved plan (.ralph/plan.md). \
  2. Read what was implemented (.ralph/implementation.md). \
  3. Read the test results (.ralph/test-report.md). \
  4. Run 'git diff' to see the actual code changes. \
  5. Evaluate: \
     - Does the code follow the approved plan? \
     - Did all tests pass? \
     - Is the code quality acceptable (readable, secure, no obvious bugs)? \
     - Are there any issues that need fixing? \
  6. Write your review to .ralph/review.md. \
  \
  Your file MUST start with exactly one of these lines: \
  VERDICT: APPROVED \
  or \
  VERDICT: CHANGES_REQUESTED \
  \
  If CHANGES_REQUESTED, list specific issues with file paths and line numbers. \
  If tests failed, ALWAYS request changes. \
  Do NOT modify any code. ONLY write to .ralph/review.md."
}
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_reviewer function"
```

---

### Task 8: Wire the implementation phase with quality loop

**Files:**
- Modify: `ralph.sh`

**Step 1: Replace `# IMPLEMENTATION PHASE (to be added)` with:**

```bash
  # === IMPLEMENTATION PHASE ===
  impl_attempt=1
  while true; do
    run_implementer "$impl_attempt"
    run_tester
    run_reviewer

    if grep -q "VERDICT: APPROVED" .ralph/review.md 2>/dev/null; then
      echo "--- CODE APPROVED (attempt $impl_attempt) ---"
      break
    else
      echo "--- CODE REJECTED (attempt $impl_attempt) ---"
      impl_attempt=$((impl_attempt + 1))
    fi
  done
```

**Step 2: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat: implementation phase with reviewer quality loop"
```

---

### Task 9: Write the run_committer function and wire commit phase

**Files:**
- Modify: `ralph.sh`

**Step 1: Add run_committer function after run_reviewer**

```bash
run_committer() {
  echo "--- COMMITTER ---"

  claude --permission-mode acceptEdits -p "@PRD.md @features.json @.ralph/plan.md @.ralph/implementation.md \
  You are the COMMITTER. Your job: \
  1. Read the plan (.ralph/plan.md) and implementation (.ralph/implementation.md). \
  2. Update PRD.md: mark the completed task as done. \
  3. Update features.json: append an entry documenting what was implemented. \
  4. Stage all changed files and commit with a descriptive message. \
  \
  Do NOT modify any source code. ONLY update PRD.md, features.json, and commit."
}
```

**Step 2: Replace `# COMMIT PHASE (to be added)` with:**

```bash
  # === COMMIT PHASE ===
  run_committer
```

**Step 3: Verify script is valid**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 4: Commit**

```bash
git add ralph.sh
git commit -m "feat: add run_committer function and wire commit phase"
```

---

### Task 10: Add .ralph to .gitignore

**Files:**
- Create: `.gitignore` (or modify if exists)

**Step 1: Add .ralph/ to .gitignore**

```
.ralph/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .ralph working directory"
```

---

### Task 11: Final validation — dry-read the complete script

**Files:**
- Read: `ralph.sh`

**Step 1: Verify complete script syntax**

Run: `bash -n ralph.sh`
Expected: No output (valid syntax)

**Step 2: Verify script is executable**

Run: `chmod +x ralph.sh && ls -la ralph.sh`
Expected: `-rwxr-xr-x` permissions

**Step 3: Commit if any changes**

```bash
git add ralph.sh
git commit -m "chore: ensure ralph.sh is executable"
```
