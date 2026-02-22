# Backend Reviewer Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a skill that enhances the `run_reviewer_backend` role in ralph.sh with deep knowledge of code smells, refactoring techniques, and design patterns from refactoring.guru. The skill produces a VERDICT (APPROVED/CHANGES_REQUESTED) with structured findings.

**Architecture:** Single SKILL.md with review workflow + verdict format + 3 reference files (code-smells, refactoring, design-patterns) loaded on demand. ralph.sh updated to pass the skill path to the backend reviewer agent.

**Tech Stack:** Markdown skill files. ralph.sh bash integration.

---

### Task 1: Create skill directory and SKILL.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p /Users/pri/.claude/skills/backend-reviewer/references
```

**Step 2: Write SKILL.md**

Create `/Users/pri/.claude/skills/backend-reviewer/SKILL.md` with this content:

```markdown
---
name: backend-reviewer
description: >
  Backend code reviewer that identifies code smells, suggests specific refactoring techniques,
  and recommends design patterns. Use PROACTIVELY whenever reviewing backend code, pull requests,
  diffs, or implementations. Triggers include: "review this code", "review backend", "code review",
  "check this implementation", "is this code clean", "review these changes", or any request to
  evaluate backend code quality, architecture, or maintainability. Also use when acting as a
  BACKEND REVIEWER role in an automated pipeline.
---

# Backend Code Reviewer

You are reviewing backend code changes. Your job is to identify real problems — code smells, security issues, performance problems, missing error handling — and produce a verdict with actionable feedback.

## References

Load these selectively when you need to confirm or detail a finding:

- **references/code-smells.md** — 23 classic code smells organized by category with symptoms and treatments. Consult when you detect a smell and want to confirm the category or recommended refactoring.
- **references/refactoring.md** — 60+ refactoring techniques grouped by purpose. Consult when you need the specific technique name and steps for a suggestion.
- **references/design-patterns.md** — 22 GoF patterns with signals for when each applies. Consult when you see structural problems a pattern could solve.

You already know these concepts. Use references to double-check terminology and ensure you recommend the right treatment — not as a prerequisite to starting.

## Review Process

### 1. Read Everything

Read in this order:
1. The plan (what was supposed to be built)
2. The implementation summary (what was actually built)
3. The test report (what passed/failed)
4. Run `git diff` to see the actual code changes

Understanding intent before reading code prevents false positives. A "Long Method" that's a clear sequence of pipeline steps is fine; one that mixes concerns is not.

### 2. Check Test Results First

If tests failed, the verdict is CHANGES_REQUESTED. Period. Note which tests failed and stop deep-diving into code smells — the implementer needs to fix tests first.

### 3. Check Plan Adherence

Compare the diff against the plan:
- Was everything in the plan implemented?
- Was anything added that wasn't in the plan? (Flag it — scope creep causes bugs)
- Did the implementation deviate? (Only flag if the deviation is worse, not just different)

### 4. Scan for Backend-Specific Issues

Evaluate the actual code changes against these criteria, in priority order:

**Security** (always Critical):
- SQL injection, auth bypass, CSRF, improper input validation
- Secrets in code, exposed credentials, missing auth checks
- OWASP top 10 violations

**Error Handling** (Critical or Warning):
- Unhandled errors, swallowed exceptions, generic catch-all
- Missing HTTP status codes, unclear error messages
- No logging for errors that need investigation

**Performance** (Warning):
- N+1 queries, missing indexes on queried fields
- Expensive operations inside loops
- Missing caching for repeated expensive calls
- Unoptimized database queries

**Data Validation** (Warning):
- Missing input validation at API boundaries
- Types not enforced, unvalidated external data
- Missing sanitization before database or external calls

### 5. Scan for Code Smells

Look at the diff for structural problems. The most common backend smells:

- **Long Method** — Functions doing too much. Look for methods >20 lines with multiple responsibilities.
- **Large Class** — God objects. Classes with many unrelated fields/methods.
- **Feature Envy** — Method using another object's data more than its own.
- **Duplicate Code** — Copy-pasted logic across handlers/services.
- **Primitive Obsession** — Raw strings/numbers where domain objects belong (IDs, money, dates).
- **Shotgun Surgery** — One logical change touching many unrelated files.
- **Long Parameter List** — Functions with >3-4 params that should be an object.
- **Data Class** — Classes with only fields and getters, no behavior.

If you spot a smell, consult `references/code-smells.md` for the exact category and recommended treatment. Then consult `references/refactoring.md` for the specific technique to suggest.

### 6. Evaluate Design

Only if the changes are substantial enough to warrant it:

- Does the code follow Single Responsibility?
- Is coupling appropriate? (loose between modules, tight within)
- Would a design pattern solve a structural problem you see?

Don't suggest patterns for simple, clean code. Only recommend a pattern when there's a clear problem it solves. Consult `references/design-patterns.md` for applicability signals.

### 7. Check Conventions

- Does the code follow existing API patterns in the project?
- Consistent naming, file structure, error handling patterns?
- Test coverage for the new code — API logic, edge cases, error paths?

## Output Format

Your output MUST start with exactly one of these lines:

```
VERDICT: APPROVED
```

or

```
VERDICT: CHANGES_REQUESTED
```

Then write your review using this structure:

```
VERDICT: [APPROVED or CHANGES_REQUESTED]

## Resumo
[1-2 sentences on the overall quality of the changes]

## Findings

### Critical
[Only if there are critical issues]

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|
| 1 | [name] | `file:line` | [what you observed] | [specific technique] | [why it matters] |

### Warning
[Only if there are warnings]

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

### Info
[Only if there are suggestions]

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

## Design Patterns Recomendados
[Only if a pattern would genuinely help — omit this section otherwise]

| Pattern | Onde Aplicar | Problema que Resolve | Como Aplicar |
|---------|-------------|---------------------|--------------|

## Pontos Positivos
[What the code does well — always include this]
```

## Verdict Rules

**CHANGES_REQUESTED** when any of these are true:
- Any test failed (typecheck, build, unit tests, lint)
- Security vulnerability found
- Plan not adhered to (missing features or unauthorized additions)
- Critical code smell that affects correctness or data integrity

**APPROVED** when:
- All tests pass
- No security issues
- Plan was followed
- Code smells are Warning or Info level only (mention them but approve)

Warnings and Info findings do NOT block approval. Include them in the review so the implementer sees them, but approve the code. The goal is to ship working, secure code — not perfect code.

## Anti-Patterns to Avoid

- **Don't invent problems.** If the code is clean, approve it quickly with brief positive notes.
- **Don't flag style nits.** Formatting, naming preferences, comment style — not your job.
- **Don't suggest refactoring for refactoring's sake.** Only flag smells that actually hurt the code.
- **Don't block on Info-level findings.** Approve and mention them.
- **Don't rewrite the plan.** You review, you don't redesign.
```

**Step 3: Verify line count**

```bash
wc -l /Users/pri/.claude/skills/backend-reviewer/SKILL.md
```

Expected: ~150-170 lines

**Step 4: Commit**

```bash
cd /Users/pri/.claude && git add skills/backend-reviewer/SKILL.md && git commit -m "feat: add backend-reviewer skill SKILL.md for ralph pipeline"
```

---

### Task 2: Create references/code-smells.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/code-smells.md`

**Step 1: Read source smell files and write condensed reference**

Read all 23 smell files from `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/smells/` and condense into a single reference. For each smell: name, symptoms, treatment (specific refactoring techniques), and when to ignore.

Write to `/Users/pri/.claude/skills/backend-reviewer/references/code-smells.md`:

```markdown
# Code Smells Reference

Quick-reference for identifying and treating code smells during review.

## Bloaters

Code that has grown too large to work with easily.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Long Method | >10 lines, needs comments to explain sections | Extract Method, Decompose Conditional, Replace Temp with Query | — |
| Large Class | Many fields, many methods, multiple responsibilities | Extract Class, Extract Subclass, Extract Interface | — |
| Primitive Obsession | Primitives for domain concepts (money, phone), type-code constants, string field names | Replace Data Value with Object, Introduce Parameter Object, Replace Type Code with Class/Subclasses/State-Strategy | — |
| Long Parameter List | >3-4 parameters for a method | Replace Parameter with Method Call, Preserve Whole Object, Introduce Parameter Object | — |
| Data Clumps | Same group of variables in multiple places (e.g., DB connection params) | Extract Class, Introduce Parameter Object, Preserve Whole Object | — |

## OO Abusers

Incorrect application of OOP principles.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Switch Statements | Complex switch/if chains on type codes or object types | Replace Type Code with Subclasses + Polymorphism, Replace Parameter with Explicit Methods, Introduce Null Object | Single occurrence, simple value mapping |
| Temporary Field | Fields only populated in certain circumstances, empty otherwise | Extract Class (method object), Introduce Null Object | — |
| Refused Bequest | Subclass ignores most inherited methods, overrides to throw exceptions | Replace Inheritance with Delegation, Extract Superclass | — |
| Alternative Classes with Different Interfaces | Two classes do the same thing with different method names | Rename Method, Extract Superclass, merge interfaces | — |

## Change Preventers

One change requires modifications in many places.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Divergent Change | One class changed for many unrelated reasons (e.g., adding product type changes find, display, and order methods) | Extract Class — one class per axis of change | — |
| Shotgun Surgery | One logical change touches many unrelated classes | Move Method, Move Field, Inline Class — consolidate related logic | — |
| Parallel Inheritance Hierarchies | Adding subclass in one hierarchy forces adding subclass in another | Move Method, Move Field to eliminate one hierarchy | — |

## Dispensables

Pointless code whose absence would improve things.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Comments | Method filled with explanatory comments for what the code does | Extract Method, Rename Method, Extract Variable — make code self-explanatory | Comments explaining "why", complex algorithms, legal/regulatory |
| Duplicate Code | Identical or near-identical fragments in multiple places | Extract Method, Pull Up Field, Form Template Method, Extract Superclass | Very rare cases where merging reduces clarity |
| Lazy Class | Class does almost nothing, no planned growth | Inline Class, Collapse Hierarchy | — |
| Data Class | Only fields + getters/setters, no behavior | Encapsulate Field/Collection, Move Method into the class | DTOs, value objects, API response shapes by design |
| Dead Code | Unused variables, parameters, methods, classes | Delete it | — |
| Speculative Generality | Unused abstractions "just in case" | Collapse Hierarchy, Inline Class, Remove Parameter | — |

## Couplers

Excessive coupling between classes.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Feature Envy | Method uses another object's data more than its own | Move Method, Extract Method | Strategy/Visitor patterns by design |
| Inappropriate Intimacy | Class uses internal fields/methods of another class | Move Method/Field, Extract Class, Hide Delegate | — |
| Message Chains | `a.b().c().d()` deep call chains | Hide Delegate, Extract Method | Fluent APIs, builder pattern, query builders |
| Middle Man | Class only delegates to another class, adds nothing | Remove Middle Man, inline delegation | Proxy, Decorator patterns by design |

## Other

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Incomplete Library Class | Library missing methods you need, can't modify it | Introduce Foreign Method, Introduce Local Extension | — |
```

**Step 2: Commit**

```bash
cd /Users/pri/.claude && git add skills/backend-reviewer/references/code-smells.md && git commit -m "feat: add code-smells reference for backend-reviewer skill"
```

---

### Task 3: Create references/refactoring.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/refactoring.md`

**Step 1: Read source technique files and write condensed reference**

Read the 6 category files from `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/refactoring/techniques/` and condense all techniques. For each: name, when to use (the problem), what to do (the solution in one sentence).

Write to `/Users/pri/.claude/skills/backend-reviewer/references/refactoring.md`:

```markdown
# Refactoring Techniques Reference

Quick-reference for suggesting specific, named refactoring techniques during review.

## Composing Methods

Streamline methods and remove code duplication.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Extract Method | Code fragment can be grouped together | Move to separate method, replace with call |
| Inline Method | Method body is more obvious than the method name | Replace calls with body, delete method |
| Extract Variable | Hard-to-understand expression | Assign parts to self-explanatory variables |
| Inline Temp | Temp variable holds a simple expression, nothing more | Replace references with the expression |
| Replace Temp with Query | Expression result stored in local variable for reuse | Move expression to a method, query it instead |
| Split Temporary Variable | One variable stores multiple intermediate values | Use different variables for different values |
| Remove Assignments to Parameters | Parameter reassigned inside method body | Use a local variable instead |
| Replace Method with Method Object | Long method with intertwined locals blocking Extract Method | Transform method into class, locals become fields, split freely |
| Substitute Algorithm | Want to replace algorithm with clearer/better one | Replace method body with new algorithm |

## Moving Features Between Objects

Redistribute functionality between classes.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Move Method | Method used more in another class than its own | Create in target class, redirect or remove original |
| Move Field | Field used more in another class | Create in target, redirect all users |
| Extract Class | One class doing the work of two | Create new class, move relevant fields/methods |
| Inline Class | Class does almost nothing | Move all features to another class, delete it |
| Hide Delegate | Client calls object B through object A | Add delegating method to A so client doesn't depend on B |
| Remove Middle Man | Class has too many delegating methods | Let client call end methods directly |
| Introduce Foreign Method | Utility class lacks a method you need, can't modify it | Add method to client class, pass utility as argument |
| Introduce Local Extension | Utility class lacks several methods you need | Create wrapper or subclass with the missing methods |

## Organizing Data

Simplify data handling and associations.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Self Encapsulate Field | Direct field access causes problems | Create getter/setter, access through them |
| Replace Data Value with Object | Data field needs its own behavior or validation | Convert to class with behavior |
| Replace Magic Number with Symbolic Constant | Code uses unexplained numeric literals | Create named constant |
| Encapsulate Field | Public field accessed directly | Make private, add getter/setter |
| Encapsulate Collection | Method returns raw collection allowing external mutation | Return read-only copy, add/remove methods |
| Replace Type Code with Class | Type codes without conditional behavior | Create class for the type |
| Replace Type Code with Subclasses | Type code affects behavior via conditionals | Create subclasses per type value |
| Replace Type Code with State/Strategy | Type code affects behavior but can't subclass | Use State/Strategy pattern object |

## Simplifying Conditional Expressions

Tame complex conditionals.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Decompose Conditional | Complex if-then-else | Extract condition, then-branch, else-branch into named methods |
| Consolidate Conditional Expression | Multiple conditions lead to same result | Combine into single expression, extract to method |
| Consolidate Duplicate Conditional Fragments | Identical code in all branches | Move outside the conditional |
| Remove Control Flag | Boolean variable controlling loop/flow | Replace with break/continue/return |
| Replace Nested Conditional with Guard Clauses | Deeply nested conditionals obscure normal flow | Flatten with early returns for edge cases |
| Replace Conditional with Polymorphism | Conditional switches on object type/property | Create subclasses, move branches to overridden methods |
| Introduce Null Object | Many null checks throughout code | Return null object with default behavior instead of null |

## Simplifying Method Calls

Make method interfaces cleaner.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Rename Method | Name doesn't reflect what the method does | Change to descriptive name |
| Add/Remove Parameter | Method needs more/less data than it currently takes | Add needed param or remove unused one |
| Separate Query from Modifier | Method both returns value and changes state | Split into query method + modifier method |
| Parameterize Method | Similar methods differ only by internal values | Combine into one method with parameter |
| Replace Parameter with Explicit Methods | Method behavior depends entirely on parameter value | Create separate named method per variant |
| Preserve Whole Object | Passing several values extracted from same object | Pass the whole object instead |
| Replace Parameter with Method Call | Caller computes value that callee could compute itself | Let callee query the value directly |
| Introduce Parameter Object | Group of parameters always appear together | Create class/object for the group |
| Replace Constructor with Factory Method | Complex constructor logic or need to return subtypes | Use factory method |
| Replace Error Code with Exception | Method returns error code | Throw exception instead |

## Dealing with Generalization

Manage class hierarchies.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Pull Up Field/Method | Identical field or method in sibling subclasses | Move to superclass |
| Push Down Field/Method | Field or method only used by some subclasses | Move to those specific subclasses |
| Extract Superclass | Two unrelated classes share common code | Create superclass, move shared code up |
| Extract Subclass | Class has features only used in some cases | Create subclass for those features |
| Extract Interface | Multiple classes share the same method signatures | Create explicit interface |
| Collapse Hierarchy | Subclass barely differs from superclass | Merge into one class |
| Form Template Method | Subclasses have similar algorithms with different details | Move shared algorithm steps to superclass, override varying steps |
| Replace Inheritance with Delegation | Subclass only uses part of superclass interface | Use composition (has-a) instead of inheritance (is-a) |
| Replace Delegation with Inheritance | Class delegates everything to another class | Inherit from it instead |
```

**Step 2: Commit**

```bash
cd /Users/pri/.claude && git add skills/backend-reviewer/references/refactoring.md && git commit -m "feat: add refactoring techniques reference for backend-reviewer skill"
```

---

### Task 4: Create references/design-patterns.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md`

**Step 1: Read source pattern files and write condensed reference**

Read all 22 pattern files from `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/design-patterns/` and condense. Focus on "when to suggest this during review" — the reviewer needs to recognize the opportunity, not implement the pattern.

Write to `/Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md`:

```markdown
# Design Patterns Reference

Quick-reference for identifying when a design pattern would improve code structure during review. Only recommend patterns when there's a clear structural problem they solve — never for already-clean code.

## Creational Patterns

Object creation mechanisms for flexibility and reuse.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Factory Method | Code tightly coupled to specific classes it creates | `new ConcreteClass()` scattered throughout; adding types means editing creation code everywhere |
| Abstract Factory | Creating families of related objects that must be consistent | Multiple factory methods that should produce coordinated objects; platform/environment-specific creation |
| Builder | Complex constructor with many optional parameters | Constructor >4 params, telescoping constructors, multi-step object assembly |
| Prototype | Expensive creation; need copies with slight variations | Cloning logic duplicated; creating similar objects repeatedly with small diffs |
| Singleton | Need exactly one instance with global access | Multiple instances of shared resource (config, pool, logger) — but prefer DI if possible |

## Structural Patterns

Assembling objects and classes into larger structures.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Adapter | Incompatible interfaces that need to work together | Wrapper code translating between interfaces; external API integration, legacy code bridges |
| Bridge | Abstraction and implementation evolving independently | Class hierarchy explosion from combining two dimensions (e.g., Shape x Renderer) |
| Composite | Need to treat individual objects and groups uniformly | Recursive tree structures: nested menus, file systems, org hierarchies, component trees |
| Decorator | Adding behavior dynamically without subclass explosion | Stacked if-checks for optional behavior; combinatorial subclass problem for feature mixing |
| Facade | Complex subsystem needs a simple entry point | Client calling many subsystem classes directly; initialization sequences repeated |
| Flyweight | Many similar objects consuming too much memory | Large object counts sharing most state; repeated immutable data across instances |
| Proxy | Control access, lazy-load, or wrap an object | Access checks before calls; lazy init of expensive objects; caching/logging wrappers |

## Behavioral Patterns

Algorithms and responsibility assignment.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Chain of Responsibility | Request handled by one of several handlers | if/else chains deciding who handles request; middleware-like processing pipelines |
| Command | Parameterize, queue, or undo operations | Calls that should be deferrable/undoable/loggable; UI actions coupled to business logic |
| Iterator | Traverse collection without exposing internals | Custom traversal logic repeated; direct access to internal collection structure |
| Mediator | Many objects communicating in complex mesh | Classes with many cross-references; changes cascade unpredictably |
| Memento | Save/restore object state | Manual state snapshots; undo/redo logic spread across code |
| Observer | Objects react to state changes in another | Polling for changes; manual notification code; pub/sub requirements |
| State | Behavior changes based on internal state | Large switch/if on state field; methods checking state before acting; scattered transitions |
| Strategy | Multiple interchangeable algorithms | Switch/if selecting algorithm; duplicate code differing only in one operation |
| Template Method | Classes follow same algorithm with varying steps | Identical algorithm structure with different details; copy-pasted methods with small variations |
| Visitor | Operations on heterogeneous types without modifying them | instanceof/typeof checks before operating; new operations require modifying many classes |
```

**Step 2: Commit**

```bash
cd /Users/pri/.claude && git add skills/backend-reviewer/references/design-patterns.md && git commit -m "feat: add design-patterns reference for backend-reviewer skill"
```

---

### Task 5: Update ralph.sh to use the skill

**Files:**
- Modify: `/Users/pri/git/fin2/ralph.sh:256-296` (run_reviewer_backend function)

**Step 1: Read current run_reviewer_backend function**

Read `ralph.sh` lines 256-296 to confirm current state.

**Step 2: Update the function to reference the skill**

Replace the `run_reviewer_backend` function. The key change: add `@/Users/pri/.claude/skills/backend-reviewer/SKILL.md` to the prompt so the reviewer agent loads the skill's knowledge. Keep the existing structure (reads plan, implementation, test-report, runs git diff) but let the skill guide the review criteria instead of the inline criteria list.

Replace lines 256-296 with:

```bash
run_reviewer_backend() {
  log "REVIEWER BACKEND starting..."

  claude --permission-mode bypassPermissions -p "@.ralph/plan.md @.ralph/implementation.md @.ralph/test-report.md \
  @/Users/pri/.claude/skills/backend-reviewer/SKILL.md \
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
  If tests failed, ALWAYS request changes. \
  Do NOT modify any code. ONLY write to .ralph/review-backend.md."

  local verdict="UNKNOWN"
  if [ -f ".ralph/review-backend.md" ]; then
    verdict=$(head -1 ".ralph/review-backend.md")
  fi
  log "REVIEWER BACKEND done → $verdict"
}
```

**Step 3: Verify ralph.sh still runs**

```bash
bash -n /Users/pri/git/fin2/ralph.sh
```

Expected: No syntax errors (exit code 0)

**Step 4: Commit**

```bash
cd /Users/pri/git/fin2 && git add ralph.sh && git commit -m "feat: integrate backend-reviewer skill into ralph pipeline"
```

---

### Task 6: Verify full installation

**Step 1: Check all skill files exist**

```bash
ls -la /Users/pri/.claude/skills/backend-reviewer/SKILL.md /Users/pri/.claude/skills/backend-reviewer/references/
```

Expected: SKILL.md + 3 reference files (code-smells.md, refactoring.md, design-patterns.md)

**Step 2: Verify SKILL.md frontmatter**

Read first 10 lines and confirm `name: backend-reviewer` and `description:` are present.

**Step 3: Verify ralph.sh references the skill**

```bash
grep -n "backend-reviewer" /Users/pri/git/fin2/ralph.sh
```

Expected: Line in run_reviewer_backend referencing the skill path.

**Step 4: Syntax check ralph.sh**

```bash
bash -n /Users/pri/git/fin2/ralph.sh
```

Expected: Exit code 0, no errors.
