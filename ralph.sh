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
LOOPS=100
TASK=""

usage() {
  echo "Usage: $0 <task description> [--loop=N]"
  echo ""
  echo "  <task>     What to implement (optional, picks from PRD if omitted)"
  echo "  --loop=N   Number of iterations (default: 1)"
  echo ""
  echo "Examples:"
  echo "  $0 transforma o frontend em componentes --loop=3"
  echo "  $0 --loop=2"
  echo "  $0 adiciona dark mode"
  exit 1
}

task_words=()
for arg in "$@"; do
  case $arg in
    --loop=*) LOOPS="${arg#*=}" ;;
    --help|-h) usage ;;
    *) task_words+=("$arg") ;;
  esac
done

if [ ${#task_words[@]} -gt 0 ]; then
  TASK="${task_words[*]}"
fi

if ! [ "$LOOPS" -ge 1 ] 2>/dev/null; then
  echo "Error: --loop must be a positive number"
  usage
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

  local task_prompt=""
  if [ -n "$TASK" ]; then
    task_prompt="THE USER HAS SPECIFIED A TASK: $TASK \
    You MUST plan this specific task instead of picking from features.json."
  fi

  claude --permission-mode bypassPermissions -p "@PRD.md @features.json \
  You are the PLANNER. Your job: \
  1. Read the PRD and features.json. The SINGLE highest-priority uncompleted task is the first entry in features.json where passes is false. \
  $task_prompt \
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
  If ALL entries in features.json have passes: true, write ONLY this to .ralph/plan.md: PRD_COMPLETE"

  log "PLANNER done."
}

run_validator() {
  local id=$1
  local focus=$2
  local id_upper
  id_upper=$(echo "$id" | tr '[:lower:]' '[:upper:]')
  log "VALIDATOR $id_upper starting..."

  claude --permission-mode bypassPermissions -p "@PRD.md @.ralph/context.md @.ralph/plan.md \
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
  ONLY write to .ralph/validation-${id}.md. Do NOT modify any other file."

  local verdict="UNKNOWN"
  if [ -f ".ralph/validation-${id}.md" ]; then
    verdict=$(head -1 ".ralph/validation-${id}.md")
  fi
  log "VALIDATOR $id_upper done → $verdict"
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

  claude --permission-mode bypassPermissions --model sonnet -p "@.ralph/plan.md \
  You are the IMPLEMENTER. Your job: \
  1. Read the approved plan in .ralph/plan.md. \
  2. Implement the code changes described in the plan. \
  3. Write unit tests for the code you implemented. \
  4. Run the unit tests with 'npm run test' and fix any failures before finishing. \
  5. Write a summary of what you implemented to .ralph/implementation.md with: \
     - Files created or modified \
     - Unit tests created or modified \
     - Key decisions made during implementation \
     - Anything that deviated from the plan and why \
  \
  $review_prompt \
  \
  Follow the plan precisely. Do NOT add features not in the plan. \
  Do NOT commit. Do NOT modify PRD.md or features.json."

  log "IMPLEMENTER done."
}

run_e2e_writer() {
  log "E2E WRITER starting..."

  claude --permission-mode bypassPermissions --model sonnet -p "@.ralph/plan.md @.ralph/implementation.md \
  You are the E2E TEST WRITER. Your job: \
  1. Read the plan (.ralph/plan.md) and what was implemented (.ralph/implementation.md). \
  2. Write end-to-end tests that verify the feature works from a user perspective. \
  3. Use the existing e2e test framework in the project (Playwright, Cypress, etc.). \
     If no e2e framework exists, set up Playwright. \
  4. The e2e tests should cover the user journeys described in the plan. \
  5. Run the e2e tests to make sure they pass. Fix any failures. \
  6. Append to .ralph/implementation.md a section '## E2E Tests' listing: \
     - E2e test files created or modified \
     - What user flows are covered \
  \
  Do NOT modify any source code. ONLY write e2e tests. \
  Do NOT commit. Do NOT modify PRD.md or features.json."

  log "E2E WRITER done."
}

run_tester() {
  log "TESTER starting..."

  claude --permission-mode bypassPermissions --model sonnet -p "@.ralph/implementation.md \
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
  Just run the tests and report results."

  log "TESTER done."
  if [ -f ".ralph/test-report.md" ]; then
    log "Test results:"
    grep -E "^(TYPECHECK|BUILD|TESTS|LINT):" .ralph/test-report.md | while read -r line; do
      log "  $line"
    done
  fi
}

run_reviewer_frontend() {
  log "REVIEWER FRONTEND starting..."

  claude --permission-mode bypassPermissions -p "@.ralph/plan.md @.ralph/implementation.md @.ralph/test-report.md \
  @.claude/skills/frontend-reviewer/SKILL.md \
  You are the FRONTEND REVIEWER. Your job: \
  1. Read the approved plan (.ralph/plan.md). \
  2. Read what was implemented (.ralph/implementation.md). \
  3. Read the test results (.ralph/test-report.md). \
  4. Run 'git diff' to see the actual code changes. \
  5. First, determine if there is ANY frontend code in this change (components, pages, styles, hooks, client-side logic, JSX/TSX files). \
     If there is NO frontend code, write to .ralph/review-frontend.md: \
     VERDICT: APPROVED \
     No frontend changes in this iteration. \
     Then stop. \
  6. If there IS frontend code, follow the review process in the frontend-reviewer skill. \
     Use the skill's references (react-patterns, vue-patterns, vanilla-patterns) to inform your review. \
  7. Write your review to .ralph/review-frontend.md following the skill's output format. \
  \
  Your file MUST start with exactly one of these lines: \
  VERDICT: APPROVED \
  or \
  VERDICT: CHANGES_REQUESTED \
  \
  If CHANGES_REQUESTED, list specific issues with file paths and line numbers. \
  If tests failed, ALWAYS request changes. \
  Do NOT modify any code. ONLY write to .ralph/review-frontend.md."

  local verdict="UNKNOWN"
  if [ -f ".ralph/review-frontend.md" ]; then
    verdict=$(head -1 ".ralph/review-frontend.md")
  fi
  log "REVIEWER FRONTEND done → $verdict"
}

run_reviewer_backend() {
  log "REVIEWER BACKEND starting..."

  claude --permission-mode bypassPermissions -p "@.ralph/plan.md @.ralph/implementation.md @.ralph/test-report.md \
  @.claude/skills/backend-reviewer/SKILL.md \
  You are the BACKEND REVIEWER. Your job: \
  1. Read the approved plan (.ralph/plan.md). \
  2. Read what was implemented (.ralph/implementation.md). \
  3. Read the test results (.ralph/test-report.md). \
  4. Run 'git diff' to see the actual code changes. \
  5. First, determine if there is ANY backend code in this change (API routes, server actions, database, middleware, server-side logic). \
     If there is NO backend code, write to .ralph/review-backend.md: \
     VERDICT: APPROVED \
     No backend changes in this iteration. \
     Then stop. \
  6. If there IS backend code, follow the review process in the backend-reviewer skill. \
     Use the skill's references (code-smells, refactoring, design-patterns) to inform your review. \
  7. Write your review to .ralph/review-backend.md following the skill's output format. \
  \
  Your file MUST start with exactly one of these lines: \
  VERDICT: APPROVED \
  or \
  VERDICT: CHANGES_REQUESTED \
  \
  If CHANGES_REQUESTED, list specific issues with file paths and line numbers. \
  If tests failed, ALWAYS request changes. \
  Do NOT modify any code. ONLY write to .ralph/review-backend.md."

  local verdict="UNKNOWN"
  if [ -f ".ralph/review-backend.md" ]; then
    verdict=$(head -1 ".ralph/review-backend.md")
  fi
  log "REVIEWER BACKEND done → $verdict"
}

run_committer() {
  log "COMMITTER starting..."

  claude --permission-mode bypassPermissions --model sonnet -p "@PRD.md @features.json @.ralph/plan.md @.ralph/implementation.md \
  You are the COMMITTER. Your job: \
  1. Read the plan (.ralph/plan.md) and implementation (.ralph/implementation.md). \
  2. Update PRD.md: mark the completed task checkboxes as [x] for what was done. \
  3. Update features.json: find the EXISTING entry for this task and update it: \
     - Set passes to true \
     - Set completedAt to today's date (YYYY-MM-DD) \
     - Set summary describing what was implemented \
     - Set filesModified with the list of files changed \
     - Set details with bullet points of what was done \
     Do NOT append new entries. Do NOT remove existing entries. \
     Every task from the PRD should already have an entry in features.json. \
  4. Stage all changed files and commit with a descriptive message. \
  \
  Do NOT modify any source code. ONLY update PRD.md, features.json, and commit."

  log "COMMITTER done."
}

# === MAIN LOOP ===
for ((i=1; i<=LOOPS; i++)); do
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
    run_e2e_writer
    run_tester

    # Run both reviewers in parallel
    log "Running frontend and backend reviewers in parallel..."
    run_reviewer_frontend &
    pid_fe=$!
    run_reviewer_backend &
    pid_be=$!
    wait $pid_fe $pid_be

    # Both must approve
    fe_approved=false
    be_approved=false
    if grep -q "VERDICT: APPROVED" .ralph/review-frontend.md 2>/dev/null; then
      fe_approved=true
    fi
    if grep -q "VERDICT: APPROVED" .ralph/review-backend.md 2>/dev/null; then
      be_approved=true
    fi

    if [ "$fe_approved" = true ] && [ "$be_approved" = true ]; then
      log "CODE APPROVED by both reviewers (attempt $impl_attempt) ✓"
      break
    else
      log "CODE REJECTED (FE=$fe_approved BE=$be_approved, attempt $impl_attempt) ✗"
      # Merge both reviews into review.md so implementer can read them
      cat .ralph/review-frontend.md > .ralph/review.md 2>/dev/null || true
      echo "" >> .ralph/review.md
      echo "---" >> .ralph/review.md
      echo "" >> .ralph/review.md
      cat .ralph/review-backend.md >> .ralph/review.md 2>/dev/null || true
      impl_attempt=$((impl_attempt + 1))
    fi
  done

  # === COMMIT PHASE ===
  echo ""
  log "=== COMMIT PHASE ==="
  run_committer

  log "Iteration $i complete."
done
