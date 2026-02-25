#!/bin/bash
set -e

cleanup() {
  trap - INT TERM
  echo ""
  printf "  ${RED}Interrupted. Killing all child processes...${RESET}\n"
  kill 0 2>/dev/null
  if [ -n "$FEATURE_BRANCH" ]; then
    git merge --abort 2>/dev/null || true
    git checkout main 2>/dev/null || true
    printf "  ${YELLOW}Returned to main. Feature branch '%s' preserved.${RESET}\n" "$FEATURE_BRANCH"
  fi
  exit 130
}
trap cleanup INT TERM

RALPH_DIR=".ralph"
LOOPS=""
TASK=""
FEATURE_BRANCH=""
SKIP_TESTS=false

# Model configuration
MODEL_LEAD="claude-opus-4-5"      # Planner, validators, reviewers
MODEL_WORKER="claude-sonnet-4-5"  # Implementer, tester, committer, e2e writer

usage() {
  echo "Usage: $0 <task description> [--loop=N]"
  echo ""
  echo "  <task>       What to implement (optional, picks from PRD if omitted)"
  echo "  --loop=N     Number of iterations (default: 1)"
  echo "  --no-test    Skip test writing and test running"
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
    --no-test) SKIP_TESTS=true ;;
    --help|-h) usage ;;
    *) task_words+=("$arg") ;;
  esac
done

if [ ${#task_words[@]} -gt 0 ]; then
  TASK="${task_words[*]}"
fi

# Default loops: 1 if task specified, 100 if picking from PRD
if [ -z "$LOOPS" ]; then
  if [ -n "$TASK" ]; then
    LOOPS=1
  else
    LOOPS=100
  fi
fi

if ! [ "$LOOPS" -ge 1 ] 2>/dev/null; then
  echo "Error: --loop must be a positive number"
  usage
fi

# === COLORS ===

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RESET=$'\033[0m'

# === LOGGING HELPERS ===

_step_start=0

step() {
  _step_start=$(date +%s)
  printf "  %-24s" "$1"
}

step_done() {
  local msg="${1:-done}"
  local elapsed=$(( $(date +%s) - _step_start ))
  local min=$((elapsed / 60))
  local sec=$((elapsed % 60))
  printf "%s ${DIM}(%dm%02ds)${RESET}\n" "$msg" "$min" "$sec"
}

verdict() {
  local file=$1
  if [ -f "$file" ] && grep -q "VERDICT: APPROVED" "$file" 2>/dev/null; then
    printf "${GREEN}✓${RESET}"
  else
    printf "${RED}✗${RESET}"
  fi
}

test_status() {
  local key=$1
  if grep -q "${key}: PASS" .ralph/test-report.md 2>/dev/null; then
    printf "${GREEN}✓${RESET}"
  else
    printf "${RED}✗${RESET}"
  fi
}

print_rejection() {
  local label=$1
  local file=$2
  if ! [ -f "$file" ] || ! grep -q "CHANGES_REQUESTED" "$file" 2>/dev/null; then
    return
  fi
  # Extract numbered/bulleted items, clean and join as brief summary
  local issues
  issues=$(grep -E "^[[:space:]]*([-*]|[0-9]+[.\)])[[:space:]]" "$file" | \
    sed 's/^[[:space:]]*[-*][[:space:]]*//' | \
    sed 's/^[[:space:]]*[0-9]*[.)][[:space:]]*//' | \
    sed 's/[`*]//g' | \
    head -3 | \
    tr '\n' ';' | \
    sed 's/;$//' | \
    sed 's/;/; /g')
  if [ -z "$issues" ]; then
    issues=$(tail -n +2 "$file" | grep -v "^$" | grep -vi "^verdict" | sed 's/[`*]//g' | head -1)
  fi
  if [ -n "$issues" ]; then
    printf "    ${RED}%s: %.120s${RESET}\n" "$label" "$issues"
  fi
}

needs_re_exploration() {
  for v in a b c; do
    if grep -q "NEEDS_RE_EXPLORATION: YES" ".ralph/validation-${v}.md" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

clean_ralph() {
  rm -rf "$RALPH_DIR"
  mkdir -p "$RALPH_DIR"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g;s/^-//;s/-$//' | cut -c1-50
}

check_agent_output() {
  local agent_name=$1
  case "$agent_name" in
    explorer)      [ -f "$RALPH_DIR/context.md" ] ;;
    plan-writer)   [ -f "$RALPH_DIR/plan.md" ] ;;
    plan-patcher)  [ -f "$RALPH_DIR/plan.md" ] ;;
    implementer)   [ -f "$RALPH_DIR/implementation.md" ] ;;
    *)            return 0 ;;
  esac
}

run_with_checkpoint() {
  local agent_fn=$1
  local max_chains=${2:-3}
  local agent_name=$3
  shift 3
  local extra_args=("$@")

  for ((chain=1; chain<=max_chains; chain++)); do
    if [ "$chain" -gt 1 ]; then
      printf " ${DIM}(chain $chain)${RESET}"
    fi
    echo "$agent_name" > "$RALPH_DIR/current-agent"
    $agent_fn "${extra_args[@]}"

    if check_agent_output "$agent_name"; then
      rm -f "$RALPH_DIR/checkpoint-${agent_name}.md"
      return 0
    fi

    if [ ! -f "$RALPH_DIR/checkpoint-${agent_name}.md" ]; then
      return 0
    fi
  done
}

set_current_agent() {
  echo "$1" > "$RALPH_DIR/current-agent"
}

# === ROLE FUNCTIONS (output redirected to log files) ===

run_explorer() {
  local attempt=$1

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

  echo "explorer" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@PRD.md @.claude/features.json \
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

run_plan_writer() {
  local attempt=$1

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

  echo "plan-writer" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@PRD.md @.claude/features.json @.ralph/context.md \
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

run_plan_patcher() {
  local checkpoint_prompt=""
  if [ -f "$RALPH_DIR/checkpoint-plan-patcher.md" ]; then
    checkpoint_prompt="CONTINUE FROM CHECKPOINT: Read @.ralph/checkpoint-plan-patcher.md for your previous progress. \
    Continue patching the plan from where you left off."
  fi

  echo "plan-patcher" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@PRD.md @.claude/features.json @.ralph/context.md @.ralph/plan.md \
  @.ralph/validation-a.md @.ralph/validation-b.md @.ralph/validation-c.md \
  You are the PLAN PATCHER. Your job: \
  1. Read the EXISTING plan in .ralph/plan.md carefully. \
  2. Read ALL validator feedback in .ralph/validation-{a,b,c}.md. \
  3. MODIFY the existing plan to address every issue raised by validators. \
     - KEEP sections that were NOT criticized — do not rewrite them. \
     - ONLY change sections that validators flagged as problematic. \
     - Maintain the same structure and task numbering where possible. \
  4. Overwrite .ralph/plan.md with the updated plan. \
  \
  $checkpoint_prompt \
  \
  Do NOT explore the codebase — all context is in .ralph/context.md. \
  Do NOT implement any code. ONLY modify .ralph/plan.md. \
  \
  CHECKPOINT: If you cannot complete the patching, save a detailed progress summary \
  to .ralph/checkpoint-plan-patcher.md including: \
  - What you have patched so far \
  - What sections remain to patch \
  - Key decisions made and why \
  This allows a new session to continue where you left off." \
  > "$RALPH_DIR/plan-patcher.log" 2>&1 &
  wait $!
}

run_validator() {
  local id=$1
  local focus=$2

  echo "validator-$id" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@PRD.md @.ralph/context.md @.ralph/plan.md \
  You are VALIDATOR $(echo "$id" | tr '[:lower:]' '[:upper:]'). Your focus: $focus. \
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
  If CHANGES_REQUESTED, you MUST also include this line somewhere in the file: \
  NEEDS_RE_EXPLORATION: YES \
  or \
  NEEDS_RE_EXPLORATION: NO \
  (YES = the plan lacks codebase context that requires re-exploration. \
   NO = the plan has sufficient context but the plan itself needs changes.) \
  \
  If CHANGES_REQUESTED, list specific issues that must be fixed. \
  Be concise and actionable. Do NOT rewrite the plan yourself. \
  ONLY write to .ralph/validation-${id}.md. Do NOT modify any other file." \
  > "$RALPH_DIR/validator-${id}.log" 2>&1 &
  wait $!
}

run_implementer() {
  local attempt=$1

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

  echo "implementer" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p "@.ralph/plan.md \
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

run_e2e_writer() {
  echo "e2e-writer" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p "@.ralph/plan.md @.ralph/implementation.md \
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
  Do NOT commit. Do NOT modify PRD.md or features.json." \
  > "$RALPH_DIR/e2e-writer.log" 2>&1 &
  wait $!
}

run_tester() {
  echo "tester" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p "@.ralph/implementation.md \
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
  Just run the tests and report results." \
  > "$RALPH_DIR/tester.log" 2>&1 &
  wait $!
}

run_reviewer_frontend() {
  local test_ref=""
  local test_step=""
  if [ "$SKIP_TESTS" = false ]; then
    test_ref="@.ralph/test-report.md"
    test_step="3. Read the test results (.ralph/test-report.md). \\"
  fi

  echo "reviewer-frontend" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@.ralph/plan.md @.ralph/implementation.md $test_ref \
  @.claude/skills/frontend-reviewer/SKILL.md \
  You are the FRONTEND REVIEWER. Your job: \
  1. Read the approved plan (.ralph/plan.md). \
  2. Read what was implemented (.ralph/implementation.md). \
  $test_step
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
  Do NOT modify any code. ONLY write to .ralph/review-frontend.md." \
  > "$RALPH_DIR/reviewer-frontend.log" 2>&1 &
  wait $!
}

run_reviewer_backend() {
  local test_ref=""
  local test_step=""
  if [ "$SKIP_TESTS" = false ]; then
    test_ref="@.ralph/test-report.md"
    test_step="3. Read the test results (.ralph/test-report.md). \\"
  fi

  echo "reviewer-backend" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p "@.ralph/plan.md @.ralph/implementation.md $test_ref \
  @.claude/skills/backend-reviewer/SKILL.md \
  You are the BACKEND REVIEWER. Your job: \
  1. Read the approved plan (.ralph/plan.md). \
  2. Read what was implemented (.ralph/implementation.md). \
  $test_step
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
  Do NOT modify any code. ONLY write to .ralph/review-backend.md." \
  > "$RALPH_DIR/reviewer-backend.log" 2>&1 &
  wait $!
}

run_register_task() {
  echo "register-task" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p "@.claude/features.json @.ralph/plan.md \
  You are the TASK REGISTRAR. Your job: \
  1. Read the approved plan (.ralph/plan.md) and the current features list (.claude/features.json). \
  2. Determine the task being planned (from the plan title/description). \
  3. Check if an entry for this task already exists in .claude/features.json. \
     - If it EXISTS with passes: false, do nothing — the entry is already registered. \
     - If it DOES NOT EXIST, append a new entry with: \
       - id: next available (e.g. if last is P2, use P3) \
       - title: short title from the plan \
       - passes: false \
       - completedAt: null \
       - summary: null \
       - filesModified: [] \
       - details: [] \
  4. Do NOT modify existing entries. Do NOT change passes to true. \
  \
  ONLY write to .claude/features.json. Do NOT modify any other file." \
  > "$RALPH_DIR/register-task.log" 2>&1 &
  wait $!
}

run_committer() {
  echo "committer" > "$RALPH_DIR/current-agent"
  claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p "@PRD.md @.claude/features.json @.ralph/plan.md @.ralph/implementation.md \
  You are the COMMITTER. Your job: \
  1. Read the plan (.ralph/plan.md) and implementation (.ralph/implementation.md). \
  2. Update PRD.md: mark the completed task checkboxes as [x] for what was done. \
  3. Update .claude/features.json: find the entry for this task and update it: \
     - Set passes to true \
     - Set completedAt to today's date (YYYY-MM-DD) \
     - Set summary describing what was implemented \
     - Set filesModified with the list of files changed \
     - Set details with bullet points of what was done \
     Do NOT remove existing entries. Do NOT add new entries. \
  4. Run 'git add -A' to stage ALL files (source, tests, configs — everything). Then commit with a descriptive message. \
     IMPORTANT: You MUST use 'git add -A' — do NOT selectively add files. Other agents may have created files that need to be included. \
  \
  Do NOT modify any source code. ONLY update PRD.md, .claude/features.json, and commit." \
  > "$RALPH_DIR/committer.log" 2>&1 &
  wait $!
}

# === PRD CREATION ===
if [ ! -f "PRD.md" ]; then
  echo ""
  printf "${BOLD}───── PRD NOT FOUND ─────${RESET}\n"
  printf "  ${YELLOW}No PRD.md detected. Starting PRD creation...${RESET}\n"

  mkdir -p "$RALPH_DIR"
  mkdir -p .claude

  # --- PHASE 1: INTERVIEW ---
  echo ""
  printf "${CYAN}▸ INTERVIEW${RESET}\n"

  # Initialize interview file
  echo "# Interview Notes" > "$RALPH_DIR/interview.md"
  echo "" >> "$RALPH_DIR/interview.md"

  question_num=0
  while true; do
    question_num=$((question_num + 1))

    # Run interviewer agent — outputs JSON to stdout
    interviewer_output=$(claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p \
      "@.ralph/interview.md \
      You are the INTERVIEWER for PRD creation. Your job is to ask ONE question at a time \
      to understand what the user wants to build. \
      \
      Read the interview history in .ralph/interview.md. Based on what you know so far, \
      decide: do you have enough information to define the project, or do you need to ask more? \
      \
      RULES: \
      - Ask about: what to build, the problem it solves, target users, key features, tech preferences, what is out of scope \
      - ONE question per invocation \
      - Prefer multiple choice when possible (2-4 options) \
      - Open-ended is fine for the first question or when choices don't make sense \
      - When you have enough info, output DONE \
      \
      OUTPUT FORMAT — you MUST output ONLY raw JSON, no markdown, no backticks, no explanation: \
      \
      If asking a question with options: \
      {\"status\":\"QUESTION\",\"question\":\"Your question here?\",\"options\":[\"Option A\",\"Option B\",\"Option C\"]} \
      \
      If asking an open-ended question: \
      {\"status\":\"QUESTION\",\"question\":\"Your question here?\",\"options\":[]} \
      \
      If you have enough information: \
      {\"status\":\"DONE\"} \
      \
      ONLY output the JSON object. Nothing else. No text before or after." 2>/dev/null)

    # Parse the JSON status
    status=$(echo "$interviewer_output" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ "$status" = "DONE" ]; then
      printf "  ${GREEN}Interview complete (%d questions)${RESET}\n" "$((question_num - 1))"
      break
    fi

    if [ "$status" != "QUESTION" ]; then
      # Retry if output was malformed
      question_num=$((question_num - 1))
      continue
    fi

    # Extract question and options
    question=$(echo "$interviewer_output" | grep -o '"question":"[^"]*"' | head -1 | cut -d'"' -f4)
    options_raw=$(echo "$interviewer_output" | grep -o '"options":\[[^]]*\]' | head -1 | sed 's/"options"://')

    echo ""
    printf "  ${BOLD}Q%d: %s${RESET}\n" "$question_num" "$question"

    # Check if there are options
    if [ "$options_raw" != "[]" ] && [ -n "$options_raw" ]; then
      # Parse options array
      option_count=0
      while IFS= read -r opt; do
        option_count=$((option_count + 1))
        printf "    ${CYAN}%d)${RESET} %s\n" "$option_count" "$opt"
      done < <(echo "$options_raw" | tr -d '[]' | sed 's/","/\n/g' | sed 's/^"//;s/"$//')

      printf "    ${DIM}%d) Other (type your answer)${RESET}\n" "$((option_count + 1))"
      printf "\n  > "
      read -r user_input

      # If user typed a number, resolve to option text
      if [[ "$user_input" =~ ^[0-9]+$ ]] && [ "$user_input" -ge 1 ] && [ "$user_input" -le "$option_count" ]; then
        answer=$(echo "$options_raw" | tr -d '[]' | sed 's/","/\n/g' | sed 's/^"//;s/"$//' | sed -n "${user_input}p")
      else
        answer="$user_input"
      fi
    else
      printf "\n  > "
      read -r answer
    fi

    # Append to interview notes
    echo "## Q${question_num}: ${question}" >> "$RALPH_DIR/interview.md"
    echo "**Answer:** ${answer}" >> "$RALPH_DIR/interview.md"
    echo "" >> "$RALPH_DIR/interview.md"
  done

  # --- PHASE 2: ARCHITECT ---
  echo ""
  printf "${CYAN}▸ ARCHITECT${RESET}\n"
  step "Proposing approaches..."

  claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p \
    "@.ralph/interview.md \
    You are the ARCHITECT. Read the interview notes and propose 2-3 different approaches \
    for building this project. \
    \
    Write to .ralph/approaches.md with this format: \
    \
    # Proposed Approaches \
    \
    ## Approach 1: <name> (Recommended) \
    **Summary:** one sentence \
    **Tech:** key technologies \
    **Pros:** bullet points \
    **Cons:** bullet points \
    \
    ## Approach 2: <name> \
    (same format) \
    \
    ## Approach 3: <name> (optional, only if meaningfully different) \
    (same format) \
    \
    Focus on meaningful differences (architecture, tech stack, complexity). \
    Do NOT write code. ONLY write to .ralph/approaches.md." \
    > "$RALPH_DIR/architect.log" 2>&1 &
  wait $!
  step_done

  # Show approaches and let user choose
  echo ""
  echo "─────────────────────────────────────────"
  cat "$RALPH_DIR/approaches.md" 2>/dev/null
  echo "─────────────────────────────────────────"
  echo ""

  # Count approaches
  approach_count=$(grep -c "^## Approach" "$RALPH_DIR/approaches.md" 2>/dev/null || echo "0")
  printf "  ${BOLD}Which approach?${RESET} "
  for ((a=1; a<=approach_count; a++)); do
    printf "[${CYAN}%d${RESET}] " "$a"
  done
  printf "> "
  read -r chosen_approach

  # Save choice
  echo "Chosen approach: $chosen_approach" > "$RALPH_DIR/chosen-approach.md"
  chosen_name=$(grep "^## Approach ${chosen_approach}:" "$RALPH_DIR/approaches.md" 2>/dev/null | sed 's/^## //')
  if [ -n "$chosen_name" ]; then
    printf "  ${GREEN}Selected: %s${RESET}\n" "$chosen_name"
    echo "$chosen_name" >> "$RALPH_DIR/chosen-approach.md"
  fi

  # --- PHASE 3: PRD WRITER (with review loop) ---
  prd_attempt=1
  while true; do
    echo ""
    printf "${CYAN}▸ PRD WRITER${RESET} ${DIM}(attempt $prd_attempt)${RESET}\n"
    step "Writing PRD..."

    local_review_prompt=""
    if [ "$prd_attempt" -gt 1 ] && [ -f "$RALPH_DIR/prd-review.md" ]; then
      local_review_prompt="PREVIOUS REVIEW FEEDBACK — you MUST address these issues: @.ralph/prd-review.md"
    fi

    claude --permission-mode bypassPermissions --model "$MODEL_WORKER" -p \
      "@.ralph/interview.md @.ralph/approaches.md @.ralph/chosen-approach.md \
      You are the PRD WRITER. Read the interview notes, approaches, and the chosen approach. \
      Generate a complete PRD and feature tracking file. \
      \
      $local_review_prompt \
      \
      Create PRD.md with this EXACT structure: \
      # <Project Name> \
      **Author:** user \
      **Updated:** $(date +%Y.%m.%d) \
      \
      ## The Problem \
      <what problem this solves and for whom> \
      \
      ## Target Use Cases \
      - As a user, I want to <action> so I can <benefit> \
      (list all key use cases from the interview) \
      \
      ## Proposed Solution \
      <1-2 sentences describing the chosen approach> \
      \
      ## Goals \
      - <specific, measurable goals> \
      \
      ## Out-of-Scope \
      - <what is NOT being built> \
      \
      ## Requirements \
      ### [P0] Initial setup \
      - [ ] Set up project with chosen tech stack \
      - [ ] Configure linting and formatting \
      - [ ] Set up testing framework \
      \
      ### [P1] <feature name> \
      - [ ] <specific actionable requirement> \
      - [ ] <another requirement> \
      \
      ### [P2] <feature name> \
      ... (as many PX sections as needed) \
      \
      ALSO create .claude/features.json as a JSON array with one entry per PX section: \
      [{\"id\": \"P0\", \"title\": \"Initial setup\", \"passes\": false, \"completedAt\": null, \"summary\": null, \"filesModified\": [], \"details\": []}, \
       {\"id\": \"P1\", \"title\": \"<feature>\", \"passes\": false, \"completedAt\": null, \"summary\": null, \"filesModified\": [], \"details\": []}] \
      \
      IMPORTANT: \
      - Requirements must be specific and actionable (not vague) \
      - Each PX section should have 2-5 checkboxes \
      - Use [ ] for all checkboxes (nothing is done yet) \
      - Do NOT implement any code" \
      > "$RALPH_DIR/prd-writer.log" 2>&1 &
    wait $!
    step_done

    # --- PHASE 4: PRD REVIEWER ---
    step "Reviewing PRD..."
    claude --permission-mode bypassPermissions --model "$MODEL_LEAD" -p \
      "@PRD.md @.claude/features.json @.ralph/interview.md \
      You are the PRD REVIEWER. Validate the PRD against the interview notes. \
      \
      Check: \
      1. COMPLETENESS — Does the PRD cover everything discussed in the interview? Missing features? \
      2. COHERENCE — Do requirements match the chosen approach? Any contradictions? \
      3. ACTIONABILITY — Are requirements specific enough for an implementer? No vague items? \
      4. STRUCTURE — Does it follow the correct format? Are PX IDs sequential? \
      5. FEATURES.JSON — Does it match the PRD sections? All entries present? \
      \
      Write your review to .ralph/prd-review.md. \
      Your file MUST start with exactly one of these lines: \
      VERDICT: APPROVED \
      or \
      VERDICT: CHANGES_REQUESTED \
      \
      If CHANGES_REQUESTED, list specific issues that must be fixed. \
      ONLY write to .ralph/prd-review.md." \
      > "$RALPH_DIR/prd-reviewer.log" 2>&1 &
    wait $!

    prd_verdict=$(verdict "$RALPH_DIR/prd-review.md")
    if grep -q "VERDICT: APPROVED" "$RALPH_DIR/prd-review.md" 2>/dev/null; then
      step_done "$prd_verdict — ${GREEN}APPROVED${RESET}"
      break
    else
      step_done "$prd_verdict — ${RED}CHANGES REQUESTED${RESET}"
      print_rejection "PRD" "$RALPH_DIR/prd-review.md"
      prd_attempt=$((prd_attempt + 1))
    fi
  done

  # --- FINAL APPROVAL ---
  echo ""
  echo "─────────────────────────────────────────"
  cat PRD.md 2>/dev/null
  echo "─────────────────────────────────────────"
  echo ""

  printf "  ${BOLD}Approve this PRD?${RESET} [${GREEN}s${RESET}] approve  [${RED}n${RESET}] redo > "
  read -r prd_choice

  case "$prd_choice" in
    s|S|y|Y)
      printf "  ${GREEN}PRD approved and committed.${RESET}\n"
      git add PRD.md .claude/features.json 2>/dev/null || true
      git commit -m "docs: create PRD and features.json via ralph PRD creation" 2>/dev/null || true
      ;;
    *)
      printf "  ${RED}PRD rejected. Please create PRD.md manually and re-run.${RESET}\n"
      rm -f PRD.md .claude/features.json
      exit 1
      ;;
  esac

  echo ""
fi

# === MAIN LOOP ===
for ((i=1; i<=LOOPS; i++)); do
  iter_start=$(date +%s)
  echo ""
  if [ -n "$TASK" ]; then
    printf "${BOLD}───── ITERATION $i: $TASK ─────${RESET}\n"
  else
    printf "${BOLD}───── ITERATION $i ─────${RESET}\n"
  fi

  clean_ralph

  # Debug: verify PRD.md exists at start of each iteration
  if [ -f "PRD.md" ]; then
    printf "  ${DIM}[debug] PRD.md exists (%s bytes, branch: %s)${RESET}\n" "$(wc -c < PRD.md)" "$(git branch --show-current)"
  else
    printf "  ${RED}[debug] PRD.md NOT FOUND (branch: %s, pwd: %s)${RESET}\n" "$(git branch --show-current)" "$(pwd)"
  fi

  # === PLANNING PHASE ===
  plan_attempt=1
  while true; do
    echo ""
    printf "${CYAN}▸ PLANNING${RESET} ${DIM}(attempt $plan_attempt)${RESET}\n"

    step "Exploring..."
    run_with_checkpoint run_explorer 3 "explorer" "$plan_attempt"
    step_done

    step "Writing plan..."
    run_with_checkpoint run_plan_writer 3 "plan-writer" "$plan_attempt"
    step_done

    # Check if PRD is complete (skip when user specified a task)
    if [ -z "$TASK" ] && grep -q "PRD_COMPLETE" .ralph/plan.md 2>/dev/null; then
      printf "  ${GREEN}PRD complete. All tasks done.${RESET}\n"
      exit 0
    fi

    # Extract task info from plan.md (first heading)
    task_name=$(grep -m1 "^#" .ralph/plan.md 2>/dev/null | sed 's/^#* *//' || echo "")
    if [ -n "$task_name" ]; then
      printf "  ${YELLOW}Task: %s${RESET}\n" "$task_name"
    fi

    step "Validating..."
    run_validator "a" "COHERENCE: Is the plan coherent? Do decisions make sense given the context? Are there contradictions?" &
    pid_a=$!
    run_validator "b" "COMPLETENESS: Does the plan cover everything the task requires? Missing edge cases? Missing error handling?" &
    pid_b=$!
    run_validator "c" "SIMPLICITY: Is the plan unnecessarily complex? Over-engineered? Can it be simpler?" &
    pid_c=$!
    wait $pid_a $pid_b $pid_c || true

    va=$(verdict ".ralph/validation-a.md")
    vb=$(verdict ".ralph/validation-b.md")
    vc=$(verdict ".ralph/validation-c.md")

    approved=0
    for v in a b c; do
      if grep -q "VERDICT: APPROVED" ".ralph/validation-${v}.md" 2>/dev/null; then
        approved=$((approved + 1))
      fi
    done

    if [ "$approved" -eq 3 ]; then
      step_done "A:$va  B:$vb  C:$vc — ${GREEN}APPROVED${RESET}"
      break
    else
      step_done "A:$va  B:$vb  C:$vc — ${RED}REJECTED${RESET}"
      print_rejection "A" ".ralph/validation-a.md"
      print_rejection "B" ".ralph/validation-b.md"
      print_rejection "C" ".ralph/validation-c.md"
      plan_attempt=$((plan_attempt + 1))

      if [ "$approved" -eq 0 ]; then
        # All 3 rejected: regenerate from scratch
        printf "    ${DIM}All validators rejected — regenerating from scratch${RESET}\n"
        rm -f "$RALPH_DIR/checkpoint-explorer.md" "$RALPH_DIR/checkpoint-plan-writer.md"
        continue
      fi

      # 1-2 rejected: patch the existing plan
      if needs_re_exploration; then
        printf "    ${DIM}Re-exploring (validator requested)${RESET}\n"
        step "Re-exploring..."
        run_with_checkpoint run_explorer 3 "explorer" "$plan_attempt"
        step_done
      fi

      printf "    ${DIM}Patching existing plan${RESET}\n"
      step "Patching plan..."
      run_with_checkpoint run_plan_patcher 3 "plan-patcher"
      step_done

      # Extract task info from plan.md (first heading)
      task_name=$(grep -m1 "^#" .ralph/plan.md 2>/dev/null | sed 's/^#* *//' || echo "")
      if [ -n "$task_name" ]; then
        printf "  ${YELLOW}Task: %s${RESET}\n" "$task_name"
      fi

      # Re-validate the patched plan
      step "Validating..."
      run_validator "a" "COHERENCE: Is the plan coherent? Do decisions make sense given the context? Are there contradictions?" &
      pid_a=$!
      run_validator "b" "COMPLETENESS: Does the plan cover everything the task requires? Missing edge cases? Missing error handling?" &
      pid_b=$!
      run_validator "c" "SIMPLICITY: Is the plan unnecessarily complex? Over-engineered? Can it be simpler?" &
      pid_c=$!
      wait $pid_a $pid_b $pid_c || true

      va=$(verdict ".ralph/validation-a.md")
      vb=$(verdict ".ralph/validation-b.md")
      vc=$(verdict ".ralph/validation-c.md")

      approved=0
      for v in a b c; do
        if grep -q "VERDICT: APPROVED" ".ralph/validation-${v}.md" 2>/dev/null; then
          approved=$((approved + 1))
        fi
      done

      if [ "$approved" -eq 3 ]; then
        step_done "A:$va  B:$vb  C:$vc — ${GREEN}APPROVED${RESET}"
        break
      else
        step_done "A:$va  B:$vb  C:$vc — ${RED}REJECTED${RESET}"
        print_rejection "A" ".ralph/validation-a.md"
        print_rejection "B" ".ralph/validation-b.md"
        print_rejection "C" ".ralph/validation-c.md"
        # Next iteration will go through the top of the loop (full regeneration)
        rm -f "$RALPH_DIR/checkpoint-explorer.md" "$RALPH_DIR/checkpoint-plan-writer.md" "$RALPH_DIR/checkpoint-plan-patcher.md"
        plan_attempt=$((plan_attempt + 1))
      fi
    fi
  done

  # === CREATE FEATURE BRANCH ===
  task_name=$(grep -m1 "^#" .ralph/plan.md 2>/dev/null | sed 's/^#* *//' || echo "")
  branch_slug=$(slugify "$task_name")
  if [ -z "$branch_slug" ]; then
    branch_slug="task-$(date +%s)"
  fi
  FEATURE_BRANCH="feature/${branch_slug}"

  # Create feature branch or switch to it if it already exists
  step "Creating branch..."
  if git rev-parse --verify "$FEATURE_BRANCH" >/dev/null 2>&1; then
    git checkout "$FEATURE_BRANCH"
  else
    git checkout main 2>/dev/null || true
    git checkout -b "$FEATURE_BRANCH"
  fi
  step_done "$FEATURE_BRANCH"

  # === REGISTER TASK ===
  step "Registering task..."
  run_register_task
  step_done

  # === IMPLEMENTATION PHASE ===
  impl_attempt=1
  while true; do
    echo ""
    if [ -n "$task_name" ]; then
      printf "${CYAN}▸ IMPLEMENTATION${RESET} ${DIM}(attempt $impl_attempt)${RESET} — ${YELLOW}$task_name${RESET}\n"
    else
      printf "${CYAN}▸ IMPLEMENTATION${RESET} ${DIM}(attempt $impl_attempt)${RESET}\n"
    fi

    step "Implementing..."
    run_with_checkpoint run_implementer 3 "implementer" "$impl_attempt"
    step_done

    if [ "$SKIP_TESTS" = false ]; then
      step "Writing e2e tests..."
      run_e2e_writer
      step_done

      step "Testing..."
      run_tester
      tc=$(test_status "TYPECHECK")
      bd=$(test_status "BUILD")
      ts=$(test_status "TESTS")
      lt=$(test_status "LINT")
      step_done "typecheck:$tc  build:$bd  test:$ts  lint:$lt"

      # If any test failed, skip review and go back to implementer
      tests_passed=true
      for check in TYPECHECK BUILD TESTS LINT; do
        if ! grep -q "${check}: PASS" .ralph/test-report.md 2>/dev/null; then
          tests_passed=false
          break
        fi
      done

      if [ "$tests_passed" = false ]; then
        printf "    ${RED}Tests failed — skipping review, back to implementer${RESET}\n"
        cat .ralph/test-report.md > .ralph/review.md 2>/dev/null || true
        rm -f "$RALPH_DIR/checkpoint-implementer.md"
        impl_attempt=$((impl_attempt + 1))
        continue
      fi
    fi

    step "Reviewing..."
    run_reviewer_frontend &
    pid_fe=$!
    run_reviewer_backend &
    pid_be=$!
    wait $pid_fe $pid_be || true

    fe=$(verdict ".ralph/review-frontend.md")
    be=$(verdict ".ralph/review-backend.md")

    fe_approved=false
    be_approved=false
    if grep -q "VERDICT: APPROVED" .ralph/review-frontend.md 2>/dev/null; then
      fe_approved=true
    fi
    if grep -q "VERDICT: APPROVED" .ralph/review-backend.md 2>/dev/null; then
      be_approved=true
    fi

    if [ "$fe_approved" = true ] && [ "$be_approved" = true ]; then
      step_done "FE:$fe  BE:$be — ${GREEN}APPROVED${RESET}"
      break
    else
      step_done "FE:$fe  BE:$be — ${RED}REJECTED${RESET}"
      print_rejection "FE" ".ralph/review-frontend.md"
      print_rejection "BE" ".ralph/review-backend.md"
      cat .ralph/review-frontend.md > .ralph/review.md 2>/dev/null || true
      echo "" >> .ralph/review.md
      echo "---" >> .ralph/review.md
      echo "" >> .ralph/review.md
      cat .ralph/review-backend.md >> .ralph/review.md 2>/dev/null || true
      rm -f "$RALPH_DIR/checkpoint-implementer.md"
      impl_attempt=$((impl_attempt + 1))
    fi
  done

  # === COMMIT PHASE ===
  echo ""
  printf "${CYAN}▸ COMMIT${RESET}\n"
  step "Committing..."
  run_committer
  step_done

  # === MERGE TO MAIN ===
  step "Merging to main..."
  stashed=false
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    git stash push --include-untracked -m "ralph: pre-merge stash" 2>/dev/null && stashed=true
  fi
  git checkout main
  if ! git merge --ff-only "$FEATURE_BRANCH"; then
    git merge --abort 2>/dev/null || true
    git checkout "$FEATURE_BRANCH" 2>/dev/null || true
    [ "$stashed" = true ] && git stash pop 2>/dev/null || true
    printf "\n  ${RED}Merge failed. Feature branch '%s' preserved.${RESET}\n" "$FEATURE_BRANCH"
    exit 1
  fi
  git branch -d "$FEATURE_BRANCH"
  FEATURE_BRANCH=""
  [ "$stashed" = true ] && git stash pop 2>/dev/null || true
  step_done

  iter_elapsed=$(( $(date +%s) - iter_start ))
  iter_min=$((iter_elapsed / 60))
  iter_sec=$((iter_elapsed % 60))
  echo ""
  printf "${GREEN}✓ Iteration %d complete${RESET} ${DIM}(%dm%02ds)${RESET}\n" "$i" "$iter_min" "$iter_sec"
done
