#!/bin/bash
set -e

cleanup() {
  echo ""
  log "Interrupted. Killing all child processes..."
  kill 0 2>/dev/null
  exit 130
}
trap cleanup INT TERM

RALPH_DIR=".ralph"

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

clean_ralph() {
  rm -rf "$RALPH_DIR"
  mkdir -p "$RALPH_DIR"
}

# === ROLE FUNCTIONS ===

run_planner() {
  local attempt=$1
  log "PLANNER starting (attempt $attempt)..."

  local feedback_prompt=""
  if [ "$attempt" -gt 1 ]; then
    feedback_prompt="Previous validator feedback that you MUST address: \
    @.ralph/validation-a.md @.ralph/validation-b.md @.ralph/validation-c.md \
    Carefully read ALL feedback and adjust your plan to address every issue raised."
  fi

  local output
  output=$(claude --permission-mode full -p "@PRD.md @features.json \
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
  If the PRD has no uncompleted tasks, write ONLY this to .ralph/plan.md: PRD_COMPLETE")

  log "PLANNER done."
  echo "$output"
}

run_validator() {
  local id=$1
  local focus=$2
  local id_upper
  id_upper=$(echo "$id" | tr '[:lower:]' '[:upper:]')
  log "VALIDATOR $id_upper starting..."

  local output
  output=$(claude --permission-mode full -p "@PRD.md @.ralph/context.md @.ralph/plan.md \
  You are VALIDATOR $id_upper. Your focus: $focus. \
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
  ONLY write to .ralph/validation-${id}.md. Do NOT modify any other file.")

  local verdict="UNKNOWN"
  if [ -f ".ralph/validation-${id}.md" ]; then
    verdict=$(head -1 ".ralph/validation-${id}.md")
  fi
  log "VALIDATOR $id_upper done → $verdict"
  echo "$output"
}

run_implementer() {
  local attempt=$1
  log "IMPLEMENTER starting (attempt $attempt)..."

  local review_prompt=""
  if [ "$attempt" -gt 1 ] && [ -f ".ralph/review.md" ]; then
    review_prompt="The reviewer REJECTED your previous implementation. \
    Read the review at @.ralph/review.md and fix ALL issues listed. \
    Also read @.ralph/test-report.md for test results."
  fi

  local output
  output=$(claude --permission-mode full -p "@.ralph/plan.md \
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
  Do NOT run tests. Do NOT commit. Do NOT modify PRD.md or features.json.")

  log "IMPLEMENTER done."
  echo "$output"
}

run_tester() {
  log "TESTER starting..."

  local output
  output=$(claude --permission-mode full -p "@.ralph/implementation.md \
  You are the TESTER. Your job: \
  1. Read what was implemented in .ralph/implementation.md. \
  2. Run ALL four feedback loops: \
     a. npm run typecheck \
     b. npm run build \
     c. npm run test \
     d. npm run lint \
  3. Write the results to .ralph/test-report.md with this format: \
     \
     TYPECHECK: PASS or FAIL \
     [output if failed] \
     \
     BUILD: PASS or FAIL \
     [output if failed] \
     \
     TESTS: PASS or FAIL \
     [output if failed] \
     \
     LINT: PASS or FAIL \
     [output if failed] \
  \
  Do NOT fix any code. Do NOT modify any files except .ralph/test-report.md. \
  Just run the tests and report results.")

  log "TESTER done."
  if [ -f ".ralph/test-report.md" ]; then
    log "Test results:"
    grep -E "^(TYPECHECK|BUILD|TESTS|LINT):" .ralph/test-report.md | while read -r line; do
      log "  $line"
    done
  fi
  echo "$output"
}

run_reviewer() {
  log "REVIEWER starting..."

  local output
  output=$(claude --permission-mode full -p "@.ralph/plan.md @.ralph/implementation.md @.ralph/test-report.md \
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
  Do NOT modify any code. ONLY write to .ralph/review.md.")

  local verdict="UNKNOWN"
  if [ -f ".ralph/review.md" ]; then
    verdict=$(head -1 ".ralph/review.md")
  fi
  log "REVIEWER done → $verdict"
  echo "$output"
}

run_committer() {
  log "COMMITTER starting..."

  local output
  output=$(claude --permission-mode full -p "@PRD.md @features.json @.ralph/plan.md @.ralph/implementation.md \
  You are the COMMITTER. Your job: \
  1. Read the plan (.ralph/plan.md) and implementation (.ralph/implementation.md). \
  2. Update PRD.md: mark the completed task as done. \
  3. Update features.json: append an entry documenting what was implemented. \
  4. Stage all changed files and commit with a descriptive message. \
  \
  Do NOT modify any source code. ONLY update PRD.md, features.json, and commit.")

  log "COMMITTER done."
  echo "$output"
}

# === MAIN LOOP ===
for ((i=1; i<=$1; i++)); do
  echo ""
  echo "========================================="
  log "ITERATION $i"
  echo "========================================="

  clean_ralph

  # === PLANNING PHASE ===
  log "=== PLANNING PHASE ==="
  plan_attempt=1
  while true; do
    run_planner "$plan_attempt"

    # Check if PRD is complete
    if grep -q "PRD_COMPLETE" .ralph/plan.md 2>/dev/null; then
      log "PRD complete after $i iterations."
      exit 0
    fi

    # Run 3 validators in parallel
    log "Running 3 validators in parallel..."
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
      log "PLAN APPROVED (attempt $plan_attempt) ✓"
      break
    else
      log "PLAN REJECTED ($approved/3 approved, attempt $plan_attempt) ✗"
      plan_attempt=$((plan_attempt + 1))
    fi
  done

  # === IMPLEMENTATION PHASE ===
  echo ""
  log "=== IMPLEMENTATION PHASE ==="
  impl_attempt=1
  while true; do
    run_implementer "$impl_attempt"
    run_tester
    run_reviewer

    if grep -q "VERDICT: APPROVED" .ralph/review.md 2>/dev/null; then
      log "CODE APPROVED (attempt $impl_attempt) ✓"
      break
    else
      log "CODE REJECTED (attempt $impl_attempt) ✗"
      impl_attempt=$((impl_attempt + 1))
    fi
  done

  # === COMMIT PHASE ===
  echo ""
  log "=== COMMIT PHASE ==="
  run_committer

  log "Iteration $i complete."
done
