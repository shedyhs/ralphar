# Ralph

An autonomous coding pipeline powered by [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Ralph uses 11 specialized AI agents organized in two quality loops to plan, validate, implement, test, review, and commit code — all from a single bash command.

## How It Works

```
./ralph.sh add user authentication --loop=3
```

Ralph reads your `PRD.md` and `.claude/features.json`, then runs an iterative pipeline. Each iteration works on an isolated feature branch that gets merged back to main via fast-forward:

```
main ──┬── feature/p1-core-feature ── commits ── merge FF ──┬── feature/p2-secondary ── ...
       │                                                     │
       └─────────────────────────────────────────────────────┘
```

```
                    PLANNING PHASE
                    ──────────────
                     ┌──────────┐
                     │ EXPLORER │  Searches codebase with
                     │          │  parallel subagents
                     └────┬─────┘
                          │
                     ┌──────────┐
                     │  PLAN    │  Writes detailed plan
                     │  WRITER  │  from discovered context
                     └────┬─────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐┌──────────┐┌──────────┐
        │VALIDATOR ││VALIDATOR ││VALIDATOR │  3 validators
        │Coherence ││Complete  ││Simplicity│  run in parallel
        └────┬─────┘└────┬─────┘└────┬─────┘
              └───────────┼───────────┘
                          │
                  All 3 approved? ──no──▶ back to EXPLORER
                          │
                         yes
                          ▼
                 ┌─────────────────┐
                 │ FEATURE BRANCH  │  git checkout -b feature/<slug>
                 └────────┬────────┘
                          │
                     ┌──────────┐
                     │REGISTRAR │  Registers task in features.json
                     └────┬─────┘
                          │
                 IMPLEMENTATION PHASE
                 ───────────────────
                     ┌──────────┐
                     │IMPLEMENT │  Writes code + unit tests,
                     │          │  runs tests until green
                     └────┬─────┘
                          │
                     ┌──────────┐
                     │E2E WRITER│  Writes end-to-end tests
                     └────┬─────┘
                          │
                     ┌──────────┐
                     │ TESTER   │  Runs typecheck, build,
                     │          │  tests, lint
                     └────┬─────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │REVIEWER  │           │REVIEWER  │  2 reviewers
        │Frontend  │           │Backend   │  run in parallel
        └────┬─────┘           └────┬─────┘
              └───────────┬───────────┘
                          │
                 Both approved? ──no──▶ back to IMPLEMENTER
                          │
                         yes
                          ▼
                    COMMIT & MERGE
                    ──────────────
                     ┌──────────┐
                     │COMMITTER │  Updates PRD, features.json,
                     │          │  git commit
                     └────┬─────┘
                          │
                 ┌─────────────────┐
                 │ MERGE TO MAIN   │  git merge --ff-only
                 └─────────────────┘
```

## The Agents

| # | Agent | Model | Role | Runs |
|---|-------|-------|------|------|
| 1 | **Explorer** | Opus | Searches the codebase with parallel subagents, discovers patterns and context | Sequential |
| 2 | **Plan Writer** | Opus | Writes a detailed implementation plan from the discovered context | Sequential |
| 3 | **Validator A** | Opus | Reviews plan for **coherence** — are decisions consistent? Any contradictions? | Parallel |
| 4 | **Validator B** | Opus | Reviews plan for **completeness** — missing requirements? Edge cases? Error handling? | Parallel |
| 5 | **Validator C** | Opus | Reviews plan for **simplicity** — over-engineered? Can it be simpler? | Parallel |
| 6 | **Implementer** | Sonnet | Writes code + unit tests following the approved plan, runs tests until green | Sequential |
| 7 | **E2E Writer** | Sonnet | Writes end-to-end tests covering user journeys from the plan | Sequential |
| 8 | **Tester** | Sonnet | Runs typecheck, build, tests, and lint — reports PASS/FAIL for each | Sequential |
| 9 | **Frontend Reviewer** | Opus | Reviews frontend code using the frontend-reviewer skill | Parallel |
| 10 | **Backend Reviewer** | Opus | Reviews backend code using the backend-reviewer skill | Parallel |
| 11 | **Committer** | Sonnet | Updates PRD.md + features.json, creates git commit | Sequential |

Reviewers auto-approve if the change doesn't include code in their domain. The Registrar (Sonnet) runs between plan approval and implementation to register the task in `features.json`.

## Gitflow

Each iteration runs on an isolated feature branch derived from main:

1. Plan is approved on main
2. `feature/<task-slug>` branch is created
3. Task is registered in `features.json` (on the feature branch)
4. Implementation, testing, and review happen on the feature branch
5. Committer commits on the feature branch
6. Branch is merged to main via `--ff-only` (fast-forward only)
7. Feature branch is deleted

If the merge fails (main diverged), the script exits and preserves the feature branch for manual resolution. On `Ctrl+C`, ralph returns to main and preserves the feature branch for inspection.

## Quality Loops

**Planning loop:** The explorer and plan writer run until all 3 validators unanimously approve. Validator feedback is passed back on each retry.

**Implementation loop:** The implementer fixes code until both reviewers approve. Review feedback + test results are passed back on each retry. If tests fail, review is skipped and the implementer retries immediately.

## Checkpoint Chaining

Long-running agents (explorer, plan writer, implementer) are wrapped with checkpoint chaining to handle context window limits. If an agent's context is about to be compacted, a `PreCompact` hook triggers the agent to save progress to `.ralph/checkpoint-<agent>.md`. A new session picks up from the checkpoint and continues. Each agent supports up to 3 chained sessions.

## Log Output

All agent stdout is redirected to `.ralph/*.log` files. The pipeline prints a compact summary:

```
───── ITERATION 1: add dark mode ─────

▸ PLANNING (attempt 1)
  Planning...           done (2m13s)
  Task: P0 Initial Setup
  Validating...         A:✓  B:✗  C:✓ — REJECTED (1m23s)
    B: Missing Playwright browser install; test:e2e not in verification

▸ PLANNING (attempt 2)
  Planning...           done (3m03s)
  Task: P0 Initial Setup
  Validating...         A:✓  B:✓  C:✓ — APPROVED (0m58s)

  Creating branch...    feature/p0-initial-setup (0m00s)
  Registering task...   done (0m32s)

▸ IMPLEMENTATION (attempt 1) — P0 Initial Setup
  Implementing...       done (4m22s)
  Writing e2e tests...  done (1m15s)
  Testing...            typecheck:✓  build:✓  test:✓  lint:✓ (2m01s)
  Reviewing...          FE:✓  BE:✓ — APPROVED (1m30s)

▸ COMMIT
  Committing...         done (0m45s)
  Merging to main...    done (0m01s)

✓ Iteration 1 complete (14m32s)
```

Full agent output is always available at `.ralph/planner.log`, `.ralph/implementer.log`, etc.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A git repository with `PRD.md` and `.claude/features.json`

## Setup

1. Clone this repo (or copy `ralph.sh` into your project)
2. Edit `PRD.md` with your product requirements
3. Edit `.claude/features.json` with matching entries (one per PRD section, all with `"passes": false`)
4. Run ralph

## Usage

```bash
# Pick the next incomplete task from features.json
./ralph.sh

# Specify a task
./ralph.sh add dark mode

# Run multiple iterations
./ralph.sh --loop=3

# Specify task + iterations
./ralph.sh refactor the API layer --loop=2

# Skip test writing and test running
./ralph.sh --no-test

# Help
./ralph.sh --help
```

## File Structure

```
your-project/
├── ralph.sh              # The pipeline script
├── PRD.md                # Your product requirements
├── .claude/
│   ├── features.json     # Task tracking (passes: true/false)
│   ├── settings.json     # Hook configuration (PreCompact)
│   ├── hooks/
│   │   └── pre-compact.sh  # Triggers checkpoint save before context compaction
│   └── skills/
│       ├── backend-reviewer/   # Backend code review skill + references
│       └── frontend-reviewer/  # Frontend code review skill + references
├── .ralph/               # Working directory (gitignored, cleaned each iteration)
│   ├── context.md        # Codebase context found by explorer
│   ├── plan.md           # Implementation plan
│   ├── validation-*.md   # Validator verdicts
│   ├── implementation.md # What was implemented
│   ├── test-report.md    # Test results
│   ├── review-*.md       # Reviewer verdicts
│   ├── checkpoint-*.md   # Agent checkpoints (for context recovery)
│   └── *.log             # Full agent output
└── ...your code
```

## features.json Format

Each entry in `.claude/features.json` maps to a section in your PRD:

```json
[
  {
    "id": "P0",
    "title": "Initial setup",
    "passes": false,
    "completedAt": null,
    "summary": null,
    "filesModified": [],
    "details": []
  }
]
```

After ralph completes a task, the committer updates the entry:

```json
{
  "id": "P0",
  "title": "Initial setup",
  "passes": true,
  "completedAt": "2026-02-22",
  "summary": "Scaffolded Next.js with TypeScript, Biome, Vitest, and Playwright",
  "filesModified": ["package.json", "tsconfig.json", "biome.json"],
  "details": ["Created Next.js 15 App Router project with React 19 and TypeScript"]
}
```

## Stopping

Press `Ctrl+C` to stop — all child processes are killed immediately. If a feature branch is active, ralph returns to main and preserves the branch for inspection.

## License

MIT
