# Hybrid Plan Retry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make ralph's planning loop conditionally patch or regenerate plans based on how many validators rejected.

**Architecture:** Add `NEEDS_RE_EXPLORATION` field to validator output, add a `run_plan_patcher()` function, and replace the unconditional retry in the planning loop with conditional logic (3 rejections = from scratch, 1-2 = patch).

**Tech Stack:** Bash (ralph.sh)

---

### Task 1: Add NEEDS_RE_EXPLORATION to validator prompt

**Files:**
- Modify: `ralph.sh:284-306` (the `run_validator()` function)

**Step 1: Edit the validator prompt**

In `run_validator()`, replace the prompt section starting at line 295:

```bash
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
```

**Step 2: Verify the edit**

Run: `grep -A 30 'run_validator()' ralph.sh | grep -c 'NEEDS_RE_EXPLORATION'`
Expected: `2` (the YES and NO lines)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat(ralph): add NEEDS_RE_EXPLORATION field to validator output"
```

---

### Task 2: Add `needs_re_exploration()` helper function

**Files:**
- Modify: `ralph.sh` — insert after `print_rejection()` (after line 137)

**Step 1: Add the helper**

Insert after the `print_rejection()` function (after line 137), before `clean_ralph()`:

```bash
needs_re_exploration() {
  for v in a b c; do
    if grep -q "NEEDS_RE_EXPLORATION: YES" ".ralph/validation-${v}.md" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}
```

**Step 2: Verify**

Run: `grep -c 'needs_re_exploration' ralph.sh`
Expected: `2` (function definition line + the closing brace context won't match, but the function name appears in the `for` line — actually just `1` for the function name on the definition line. We'll get more matches after Task 4.)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat(ralph): add needs_re_exploration() helper"
```

---

### Task 3: Add `run_plan_patcher()` function

**Files:**
- Modify: `ralph.sh` — insert after `run_plan_writer()` (after line 282)

**Step 1: Add the function**

Insert after `run_plan_writer()` and before `run_validator()`:

```bash
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
```

**Step 2: Verify**

Run: `grep -c 'run_plan_patcher' ralph.sh`
Expected: `1` (the function definition — more after Task 4)

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "feat(ralph): add run_plan_patcher() for incremental plan fixes"
```

---

### Task 4: Replace unconditional retry with conditional logic

**Files:**
- Modify: `ralph.sh:885-892` (the `else` branch in the planning loop)

**Step 1: Replace the retry block**

Replace the current `else` block (lines 885-892):

```bash
    else
      step_done "A:$va  B:$vb  C:$vc — ${RED}REJECTED${RESET}"
      print_rejection "A" ".ralph/validation-a.md"
      print_rejection "B" ".ralph/validation-b.md"
      print_rejection "C" ".ralph/validation-c.md"
      rm -f "$RALPH_DIR/checkpoint-explorer.md" "$RALPH_DIR/checkpoint-plan-writer.md"
      plan_attempt=$((plan_attempt + 1))
    fi
```

With this new conditional logic:

```bash
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

      # Skip explorer + plan writer at top of loop — go straight to validation
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
```

Key behavior:
- `approved == 0` → `continue` to top of loop (runs Explorer + Plan Writer from scratch)
- `approved == 1 or 2` → patch inline, then re-validate once
- If patch re-validation also fails → next iteration goes through the top (full regeneration), preventing infinite patch loops

**Step 2: Add plan-patcher to `check_agent_output()`**

In the `check_agent_output()` function (around line 148), add `plan-patcher` case:

```bash
check_agent_output() {
  local agent_name=$1
  case "$agent_name" in
    explorer)      [ -f "$RALPH_DIR/context.md" ] ;;
    plan-writer)   [ -f "$RALPH_DIR/plan.md" ] ;;
    plan-patcher)  [ -f "$RALPH_DIR/plan.md" ] ;;
    implementer)   [ -f "$RALPH_DIR/implementation.md" ] ;;
    *)             return 0 ;;
  esac
}
```

**Step 3: Verify the full planning loop structure**

Run: `grep -n 'approved\|continue\|break\|patch\|from scratch' ralph.sh`
Expected: Should see both `continue` (from-scratch path) and inline patch+validate logic.

**Step 4: Commit**

```bash
git add ralph.sh
git commit -m "feat(ralph): implement hybrid plan retry logic

Conditionally patches or regenerates plans based on validator count:
- 3 rejections: regenerate from scratch (Explorer + Plan Writer)
- 1-2 rejections: patch existing plan, re-explore only if needed
- If patch also rejected: falls back to full regeneration next iteration"
```

---

### Task 5: Verify end-to-end flow manually

**Step 1: Read through the modified ralph.sh planning loop**

Run: `grep -n -A 2 'PLANNING PHASE\|from scratch\|Patching\|Re-exploring\|NEEDS_RE_EXPLORATION\|run_plan_patcher\|needs_re_exploration' ralph.sh`

Verify:
1. `run_validator()` prompt includes `NEEDS_RE_EXPLORATION` instructions
2. `needs_re_exploration()` helper exists and checks all 3 validator files
3. `run_plan_patcher()` function exists with correct prompt
4. Planning loop has conditional branching: `approved == 0` → continue, else patch
5. `check_agent_output()` includes `plan-patcher` case

**Step 2: Commit (if any fixes needed)**

```bash
git add ralph.sh
git commit -m "fix(ralph): adjustments from manual review"
```
