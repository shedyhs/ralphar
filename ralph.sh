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
