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

# === ROLE FUNCTIONS ===

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

# === MAIN LOOP ===
for ((i=1; i<=$1; i++)); do
  echo "========================================="
  echo "ITERATION $i"
  echo "========================================="

  clean_ralph

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

  # IMPLEMENTATION PHASE (to be added)

  # COMMIT PHASE (to be added)

  echo "Iteration $i complete."
done
