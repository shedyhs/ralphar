# Ralph

An autonomous coding pipeline powered by [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Ralph uses 10 specialized AI agents organized in two quality loops to plan, validate, implement, test, review, and commit code — all from a single bash command.

## How It Works

```
./ralph.sh add user authentication --loop=3
```

Ralph reads your `PRD.md` and `features.json`, then runs an iterative pipeline:

```
                    PLANNING PHASE
                    ──────────────
                     ┌──────────┐
                     │ PLANNER  │  Picks task, explores codebase,
                     │          │  writes plan
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
                  All 3 approved? ──no──▶ back to PLANNER
                          │
                         yes
                          ▼
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
                    COMMIT PHASE
                    ────────────
                     ┌──────────┐
                     │COMMITTER │  Updates PRD, features.json,
                     │          │  git commit
                     └──────────┘
```

## The Agents

| # | Agent | Role | Runs |
|---|-------|------|------|
| 1 | **Planner** | Picks the next task from the PRD, explores the codebase with parallel search agents, writes a detailed plan | Sequential |
| 2 | **Validator A** | Reviews plan for **coherence** — are decisions consistent? Any contradictions? | Parallel |
| 3 | **Validator B** | Reviews plan for **completeness** — missing requirements? Edge cases? Error handling? | Parallel |
| 4 | **Validator C** | Reviews plan for **simplicity** — over-engineered? Can it be simpler? | Parallel |
| 5 | **Implementer** | Writes code + unit tests following the approved plan, runs tests until green | Sequential |
| 6 | **E2E Writer** | Writes end-to-end tests covering user journeys from the plan | Sequential |
| 7 | **Tester** | Runs typecheck, build, tests, and lint — reports PASS/FAIL for each | Sequential |
| 8 | **Frontend Reviewer** | Reviews frontend code for a11y, performance, UX, security, DRY, test coverage | Parallel |
| 9 | **Backend Reviewer** | Reviews backend code for security, performance, error handling, validation, DRY | Parallel |
| 10 | **Committer** | Updates PRD.md + features.json, creates git commit | Sequential |

Reviewers auto-approve if the change doesn't include code in their domain.

## Quality Loops

**Planning loop:** The planner rewrites the plan until all 3 validators unanimously approve. Validator feedback is passed back to the planner on each retry.

**Implementation loop:** The implementer fixes code until both reviewers approve. Review feedback + test results are passed back on each retry.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A git repository with `PRD.md` and `features.json`

## Setup

1. Clone this repo (or copy `ralph.sh` into your project)
2. Edit `PRD.md` with your product requirements
3. Edit `features.json` with matching entries (one per PRD section, all with `"passes": false`)
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

# Help
./ralph.sh --help
```

## File Structure

```
your-project/
├── ralph.sh          # The pipeline script
├── PRD.md            # Your product requirements
├── features.json     # Task tracking (passes: true/false)
├── .ralph/           # Working directory (gitignored, cleaned each iteration)
│   ├── context.md
│   ├── plan.md
│   ├── validation-a.md
│   ├── validation-b.md
│   ├── validation-c.md
│   ├── implementation.md
│   ├── test-report.md
│   ├── review-frontend.md
│   ├── review-backend.md
│   └── review.md
└── ...your code
```

## features.json Format

Each entry in `features.json` maps to a section in your PRD:

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
  "completedAt": "2026-02-21",
  "summary": "Scaffolded Next.js with TypeScript, ESLint, and Tailwind",
  "filesModified": ["package.json", "tsconfig.json"],
  "details": ["Used create-next-app with --typescript flag"]
}
```

## Stopping

Press `Ctrl+C` to stop — all child processes are killed immediately.

## License

MIT
