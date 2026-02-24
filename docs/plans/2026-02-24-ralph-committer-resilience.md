# Ralph Committer Resilience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make ralph's commit+merge phase resilient to uncommitted files left by other agents.

**Architecture:** Two-layer fix — (1) committer prompt explicitly stages all files with `git add -A`, (2) stash safety net before branch switch in merge phase. Layer 2 is already implemented.

**Tech Stack:** Bash, git

---

### Task 1: Update committer prompt to stage all files

**Files:**
- Modify: `ralph.sh:514-527`

**Step 1: Edit the committer prompt**

In `run_committer()`, replace the current prompt instruction:

```
  4. Stage all changed files and commit with a descriptive message. \
```

with:

```
  4. Run 'git add -A' to stage ALL files (source, tests, configs — everything). Then commit with a descriptive message. \
     IMPORTANT: You MUST use 'git add -A' — do NOT selectively add files. Other agents may have created files that need to be included. \
```

The full `run_committer()` function after the edit (lines 512-530):

```bash
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
```

**Step 2: Verify the edit**

Run: `grep -n 'git add -A' ralph.sh`
Expected: Line ~525 shows the new instruction.

**Step 3: Commit**

```bash
git add ralph.sh
git commit -m "fix(ralph): committer stages all files with git add -A

Prevents uncommitted files from blocking merge phase checkout."
```

### Task 2: Verify stash safety net (already implemented)

**Files:**
- Verify: `ralph.sh:1005-1022`

**Step 1: Confirm stash logic is in place**

Run: `grep -n 'stash' ralph.sh`
Expected: Lines showing `stash push --include-untracked` and `stash pop` in the merge section.

No code changes needed — this was already implemented earlier in this session.
