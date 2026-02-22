# Backend Reviewer Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a skill that reviews backend code for code smells, suggests refactoring techniques, and recommends design patterns, producing a structured report.

**Architecture:** Single SKILL.md with workflow/template/severity + 3 reference files (code-smells, refactoring, design-patterns) loaded on demand. Progressive disclosure: only load references when findings require deeper detail.

**Tech Stack:** Markdown skill files, no scripts or external dependencies.

---

### Task 1: Create SKILL.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p /Users/pri/.claude/skills/backend-reviewer/references
```

**Step 2: Write SKILL.md with frontmatter, workflow, report template, and severity criteria**

Create `/Users/pri/.claude/skills/backend-reviewer/SKILL.md` with this content:

```markdown
---
name: backend-reviewer
description: >
  Backend code reviewer that identifies code smells, suggests specific refactoring techniques,
  and recommends design patterns. Use PROACTIVELY whenever reviewing backend code, pull requests,
  diffs, modules, or files. Triggers include: "review this code", "code review", "check this PR",
  "review my implementation", "is this code clean", "look at this module", "review these changes",
  "what can I improve in this code", or any request to evaluate code quality, architecture,
  or maintainability. Also use when the user asks about code smells, refactoring opportunities,
  or design pattern applicability in existing code.
---

# Backend Code Reviewer

Review backend code systematically: identify code smells, suggest refactoring techniques, and recommend design patterns. Produce a structured report with severity levels and actionable suggestions.

## When to Use References

This skill has 3 reference files. Load them selectively based on what you find:

- **references/code-smells.md** — When you detect a smell and need to confirm its category, symptoms, or recommended treatment. Contains all 23 classic code smells organized by category.
- **references/refactoring.md** — When you need the specific steps of a refactoring technique to recommend. Contains 60+ techniques grouped by purpose.
- **references/design-patterns.md** — When you see structural problems that a design pattern could solve. Contains 22 GoF patterns with signals for when each applies.

You already know these concepts well. Use the references to double-check your reasoning and ensure your suggestions use the correct terminology and recommended treatments, not as a prerequisite to starting the review.

## Review Workflow

### 1. Understand the Context

Before reviewing, understand what you're looking at:

- **PR/diff**: Read the full files being changed, not just the diff. Changes that look fine in isolation often introduce smells when seen in context. Focus findings on the changed code, but flag pre-existing issues nearby if they're severe.
- **Module/file review**: Read the entire module. Understand its responsibility, its dependencies, and how it fits into the larger system.

### 2. Scan for Code Smells

Read the code looking for these smell categories (in order of typical severity):

1. **Bloaters** — Long Method, Large Class, Primitive Obsession, Long Parameter List, Data Clumps
2. **Couplers** — Feature Envy, Inappropriate Intimacy, Message Chains, Middle Man
3. **Change Preventers** — Divergent Change, Shotgun Surgery, Parallel Inheritance Hierarchies
4. **OO Abusers** — Switch Statements, Temporary Field, Refused Bequest, Alternative Classes with Different Interfaces
5. **Dispensables** — Dead Code, Duplicate Code, Lazy Class, Data Class, Speculative Generality, Comments (as smell)

When you find a smell, note its location and classify its severity. If you need to confirm the smell category or its recommended treatment, consult `references/code-smells.md`.

### 3. Evaluate Design

Look at the code's overall structure:

- Does the module have a single, clear responsibility?
- Are there tight couplings that could be loosened?
- Are abstractions at the right level — not too abstract, not too concrete?
- Would a design pattern solve a recurring structural problem?

Only recommend design patterns when there's a real structural issue they'd solve. Don't suggest patterns for code that's already clean and simple. If you do recommend a pattern, consult `references/design-patterns.md` for the specific applicability signals.

### 4. Suggest Refactorings

For each smell, suggest a specific refactoring technique — not vague advice like "clean this up", but a named technique like "Extract Method" or "Replace Conditional with Polymorphism". If you need details on the technique's steps, consult `references/refactoring.md`.

Prioritize suggestions by impact: what change would most improve the code's maintainability and readability?

### 5. Generate Report

Use the template below. Important rules:

- **Don't invent problems.** If the code is clean, say so. A short report with few or no findings is a valid outcome.
- **Be specific.** Every finding must point to a real location in the code with real symptoms.
- **Be actionable.** Every suggestion must be something the developer can act on immediately.
- **No style nits.** Don't flag formatting, naming conventions (unless truly misleading), or personal preferences. Focus on structural problems.
- **Acknowledge good code.** The "Pontos Positivos" section is not optional — always highlight what the code does well.

## Report Template

ALWAYS use this exact structure:

```
# Code Review: [file path or PR identifier]

## Resumo
[1-2 sentences on the overall health of the code]

## Findings

### Critical

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|
| 1 | [smell name] | `file:line` | [what you observed] | [specific technique] | [why it matters] |

### Warning

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

### Info

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

## Design Patterns Recomendados

| Pattern | Onde Aplicar | Problema que Resolve | Como Aplicar |
|---------|-------------|---------------------|--------------|

## Pontos Positivos
[What the code does well — good abstractions, clear naming, solid test coverage, etc.]
```

Omit the "Design Patterns Recomendados" section entirely if no patterns apply. Omit empty severity sections (if no Critical findings, don't show the Critical table).

## Severity Criteria

**Critical** — Problems that cause bugs, security vulnerabilities, or severe maintainability issues:
- God Class / Large Class with multiple responsibilities
- Feature Envy causing data integrity risks
- Tight coupling that makes the system fragile
- Dead code hiding bugs or confusing behavior

**Warning** — Problems that hurt maintainability and readability:
- Long Method (>20 lines with multiple responsibilities)
- Duplicate Code across methods or classes
- Primitive Obsession in domain logic
- Long Parameter Lists (>3-4 params)
- Switch Statements that should be polymorphism

**Info** — Improvement opportunities that are nice-to-have:
- Minor Data Clumps that could become value objects
- Lazy Classes that could be inlined
- Small Speculative Generality (unused abstractions)
- Design pattern opportunities for future extensibility
```

**Step 3: Verify the file was created correctly**

```bash
wc -l /Users/pri/.claude/skills/backend-reviewer/SKILL.md
```

Expected: ~120-130 lines

**Step 4: Commit**

```bash
git -C /Users/pri/.claude add skills/backend-reviewer/SKILL.md
git -C /Users/pri/.claude commit -m "feat: add backend-reviewer skill - SKILL.md with workflow and report template"
```

---

### Task 2: Create references/code-smells.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/code-smells.md`
- Source: `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/smells/*.md` (23 files)

**Step 1: Write the condensed code smells reference**

Condense all 23 code smells from the source documentation into a single reference file. For each smell, include: name, category, key symptoms, common causes, and recommended refactoring treatments. Keep it scannable — use tables and bullet points, not paragraphs.

Source files to read and condense:
- `docs/backend-reviewer/refactoring.guru/smells/long-method.md`
- `docs/backend-reviewer/refactoring.guru/smells/large-class.md`
- `docs/backend-reviewer/refactoring.guru/smells/primitive-obsession.md`
- `docs/backend-reviewer/refactoring.guru/smells/long-parameter-list.md`
- `docs/backend-reviewer/refactoring.guru/smells/data-clumps.md`
- `docs/backend-reviewer/refactoring.guru/smells/switch-statements.md`
- `docs/backend-reviewer/refactoring.guru/smells/temporary-field.md`
- `docs/backend-reviewer/refactoring.guru/smells/refused-bequest.md`
- `docs/backend-reviewer/refactoring.guru/smells/alternative-classes-with-different-interfaces.md`
- `docs/backend-reviewer/refactoring.guru/smells/divergent-change.md`
- `docs/backend-reviewer/refactoring.guru/smells/shotgun-surgery.md`
- `docs/backend-reviewer/refactoring.guru/smells/parallel-inheritance-hierarchies.md`
- `docs/backend-reviewer/refactoring.guru/smells/comments.md`
- `docs/backend-reviewer/refactoring.guru/smells/duplicate-code.md`
- `docs/backend-reviewer/refactoring.guru/smells/lazy-class.md`
- `docs/backend-reviewer/refactoring.guru/smells/data-class.md`
- `docs/backend-reviewer/refactoring.guru/smells/dead-code.md`
- `docs/backend-reviewer/refactoring.guru/smells/speculative-generality.md`
- `docs/backend-reviewer/refactoring.guru/smells/feature-envy.md`
- `docs/backend-reviewer/refactoring.guru/smells/inappropriate-intimacy.md`
- `docs/backend-reviewer/refactoring.guru/smells/message-chains.md`
- `docs/backend-reviewer/refactoring.guru/smells/middle-man.md`
- `docs/backend-reviewer/refactoring.guru/smells/incomplete-library-class.md`

Create the reference file with this structure:

```markdown
# Code Smells Reference

Quick-reference for identifying and treating code smells during review.

## Bloaters

Code that has grown too large to work with easily.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Long Method | >10 lines, needs comments to explain | Extract Method, Decompose Conditional, Replace Temp with Query | — |
| Large Class | Many fields, many methods, multiple responsibilities | Extract Class, Extract Subclass, Extract Interface | — |
| Primitive Obsession | Primitives for domain concepts (currency, phone), type-code constants | Replace Data Value with Object, Introduce Parameter Object, Replace Type Code with Class/Subclasses/State-Strategy | — |
| Long Parameter List | >3-4 parameters | Replace Parameter with Method Call, Preserve Whole Object, Introduce Parameter Object | — |
| Data Clumps | Same group of variables appears in multiple places | Extract Class, Introduce Parameter Object, Preserve Whole Object | — |

## OO Abusers

Incorrect application of OOP principles.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Switch Statements | Complex switch/if chains on type codes | Replace Type Code with Subclasses + Polymorphism, Replace Parameter with Explicit Methods, Introduce Null Object | Single occurrence, simple mapping |
| Temporary Field | Fields only used in certain circumstances, empty otherwise | Extract Class (method object), Introduce Null Object | — |
| Refused Bequest | Subclass uses only some inherited methods, overrides to throw exceptions | Replace Inheritance with Delegation, Extract Superclass | — |
| Alternative Classes with Different Interfaces | Two classes do the same thing with different method names | Rename Method, Extract Superclass, merge or unify | — |

## Change Preventers

One change requires modifications in many places.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Divergent Change | One class changed for many unrelated reasons | Extract Class — one class per axis of change | — |
| Shotgun Surgery | One change touches many classes | Move Method, Move Field, Inline Class — consolidate | — |
| Parallel Inheritance Hierarchies | Adding subclass in one hierarchy requires adding in another | Move Method, Move Field to eliminate one hierarchy | — |

## Dispensables

Pointless code whose absence would improve things.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Comments | Method filled with explanatory comments | Extract Method, Rename Method, Extract Variable — make code self-explanatory | Explaining "why", complex algorithms, legal notices |
| Duplicate Code | Identical or near-identical fragments | Extract Method, Pull Up Field, Form Template Method, Extract Superclass | Very rare cases where merging reduces clarity |
| Lazy Class | Class does almost nothing, no planned growth | Inline Class, Collapse Hierarchy | — |
| Data Class | Only fields + getters/setters, no behavior | Encapsulate Field/Collection, Move Method into the class | DTOs, value objects by design |
| Dead Code | Unused variables, parameters, methods, classes | Delete it | — |
| Speculative Generality | Unused abstractions "just in case" | Collapse Hierarchy, Inline Class, Remove Parameter | — |

## Couplers

Excessive coupling between classes.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Feature Envy | Method uses another object's data more than its own | Move Method, Extract Method | Strategy/Visitor patterns by design |
| Inappropriate Intimacy | Class uses internal fields/methods of another class | Move Method/Field, Extract Class, Hide Delegate | — |
| Message Chains | `a.b().c().d()` chains | Hide Delegate, Extract Method | Fluent APIs, builder pattern |
| Middle Man | Class only delegates to another class | Remove Middle Man, inline delegation | Proxy, Decorator patterns by design |

## Other

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Incomplete Library Class | Library missing needed methods | Introduce Foreign Method, Introduce Local Extension | — |
```

**Step 2: Verify file length**

```bash
wc -l /Users/pri/.claude/skills/backend-reviewer/references/code-smells.md
```

Expected: ~80-100 lines

**Step 3: Commit**

```bash
git -C /Users/pri/.claude add skills/backend-reviewer/references/code-smells.md
git -C /Users/pri/.claude commit -m "feat: add code-smells reference for backend-reviewer skill"
```

---

### Task 3: Create references/refactoring.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/refactoring.md`
- Source: `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/refactoring/techniques/*.md` and individual technique files

**Step 1: Write the condensed refactoring techniques reference**

Read all technique category files and individual technique files from the source docs. Condense into a single reference organized by category. For each technique: name, when to use it (the problem it solves), and what to do (the solution in one sentence).

Source category files:
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/composing-methods.md`
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/moving-features-between-objects.md`
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/organizing-data.md`
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/simplifying-conditional-expressions.md`
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/simplifying-method-calls.md`
- `docs/backend-reviewer/refactoring.guru/refactoring/techniques/dealing-with-generalization.md`

Create the reference with this structure:

```markdown
# Refactoring Techniques Reference

Quick-reference for suggesting specific refactoring techniques during review.

## Composing Methods

Streamline methods and remove code duplication.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Extract Method | Code fragment can be grouped | Move to separate method, replace with call |
| Inline Method | Method body is more obvious than the method itself | Replace calls with body, delete method |
| Extract Variable | Hard-to-understand expression | Assign parts to self-explanatory variables |
| Inline Temp | Temp holds a simple expression, nothing more | Replace variable references with the expression |
| Replace Temp with Query | Expression result stored in local variable for reuse | Move expression to a method, call it instead |
| Split Temporary Variable | One variable stores multiple intermediate values | Use different variables for different values |
| Remove Assignments to Parameters | Parameter reassigned inside method | Use a local variable instead |
| Replace Method with Method Object | Long method with intertwined local variables blocking Extract Method | Transform method into class, locals become fields |
| Substitute Algorithm | Want to replace algorithm with clearer/better one | Replace method body with new algorithm |

## Moving Features Between Objects

Redistribute functionality between classes.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Move Method | Method used more in another class | Create in target class, redirect or remove original |
| Move Field | Field used more in another class | Create in target, redirect users |
| Extract Class | One class doing two things | Create new class, move relevant fields/methods |
| Inline Class | Class does almost nothing | Move all features to another class, delete |
| Hide Delegate | Client calls object B through object A | Add delegating method to A, client stops depending on B |
| Remove Middle Man | Class has too many delegating methods | Let client call end methods directly |
| Introduce Foreign Method | Utility class lacks a method you need | Add method to client, pass utility as argument |
| Introduce Local Extension | Utility class lacks several methods | Create wrapper or subclass with the missing methods |

## Organizing Data

Simplify data handling and associations.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Self Encapsulate Field | Direct field access causes problems | Create getter/setter, access through them |
| Replace Data Value with Object | Data field needs its own behavior | Convert to class with behavior |
| Replace Magic Number with Symbolic Constant | Code uses unexplained numeric literals | Create named constant |
| Encapsulate Field | Public field | Make private, add getter/setter |
| Encapsulate Collection | Method returns collection directly | Return read-only copy, add/remove methods |
| Replace Type Code with Class | Type codes without conditional behavior | Create class for the type |
| Replace Type Code with Subclasses | Type code affects behavior | Create subclasses per type value |
| Replace Type Code with State/Strategy | Type code affects behavior but can't subclass | Use State/Strategy pattern |

## Simplifying Conditional Expressions

Tame complex conditionals.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Decompose Conditional | Complex if-then-else | Extract condition, then-branch, else-branch into methods |
| Consolidate Conditional Expression | Multiple conditions lead to same result | Combine into single expression, extract to method |
| Consolidate Duplicate Conditional Fragments | Identical code in all branches | Move outside the conditional |
| Remove Control Flag | Boolean variable controlling flow | Replace with break/continue/return |
| Replace Nested Conditional with Guard Clauses | Deeply nested conditionals | Flatten with early returns for edge cases |
| Replace Conditional with Polymorphism | Conditional switches on type/property | Create subclasses, move branches to overridden methods |
| Introduce Null Object | Many null checks | Return null object with default behavior |

## Simplifying Method Calls

Make method interfaces cleaner.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Rename Method | Name doesn't reflect purpose | Change to descriptive name |
| Add/Remove Parameter | Method needs more/less data | Add needed param or remove unused one |
| Separate Query from Modifier | Method both returns value and changes state | Split into two methods |
| Parameterize Method | Similar methods differ only by internal values | Combine into one with parameter |
| Replace Parameter with Explicit Methods | Method behavior depends on parameter value | Create separate method per variant |
| Preserve Whole Object | Passing several values from same object | Pass the whole object instead |
| Replace Parameter with Method Call | Caller computes value that callee could compute | Let callee call the query itself |
| Introduce Parameter Object | Group of parameters always appear together | Create class for the group |
| Replace Constructor with Factory Method | Constructor logic is complex | Use factory method |
| Replace Error Code with Exception | Method returns error code | Throw exception instead |

## Dealing with Generalization

Manage class hierarchies.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Pull Up Field/Method | Identical field or method in sibling subclasses | Move to superclass |
| Push Down Field/Method | Field or method only used by some subclasses | Move to those subclasses |
| Extract Superclass | Two classes share common code | Create superclass, move shared code up |
| Extract Subclass | Class has features only used in some cases | Create subclass for those features |
| Extract Interface | Multiple classes share the same interface | Create explicit interface |
| Collapse Hierarchy | Subclass barely differs from superclass | Merge into one class |
| Form Template Method | Subclasses have similar algorithms with different details | Move shared steps to superclass, override varying steps |
| Replace Inheritance with Delegation | Subclass only uses part of superclass | Use composition instead |
| Replace Delegation with Inheritance | Class delegates everything to another | Inherit instead |
```

**Step 2: Verify file length**

```bash
wc -l /Users/pri/.claude/skills/backend-reviewer/references/refactoring.md
```

Expected: ~120-140 lines

**Step 3: Commit**

```bash
git -C /Users/pri/.claude add skills/backend-reviewer/references/refactoring.md
git -C /Users/pri/.claude commit -m "feat: add refactoring techniques reference for backend-reviewer skill"
```

---

### Task 4: Create references/design-patterns.md

**Files:**
- Create: `/Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md`
- Source: `/Users/pri/git/fin2/docs/backend-reviewer/refactoring.guru/design-patterns/*.md` (22 pattern files)

**Step 1: Write the condensed design patterns reference**

Read all 22 pattern files from the source docs. For each pattern, extract: name, what problem it solves, and the key signal that tells you when to recommend it during a code review. The focus is on "when to suggest this" — the reviewer needs to recognize the pattern opportunity, not implement it.

Create the reference with this structure:

```markdown
# Design Patterns Reference

Quick-reference for identifying when a design pattern would improve code structure. Only recommend patterns when there's a clear structural problem they solve — don't suggest patterns for already-clean code.

## Creational Patterns

Object creation mechanisms for flexibility and reuse.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Factory Method | Code tightly coupled to specific classes it creates | `new ConcreteClass()` scattered throughout; adding types means editing creation code everywhere |
| Abstract Factory | Creating families of related objects that must be consistent | Multiple factory methods that should produce coordinated objects; platform-specific code |
| Builder | Complex constructor with many optional parameters | Constructor with >4 params, telescoping constructors, or complex object assembly in multiple steps |
| Prototype | Expensive object creation; need copies with slight variations | Cloning logic duplicated across code; creating similar objects repeatedly |
| Singleton | Need exactly one instance with global access | Multiple instances of a resource that should be shared (config, connection pool, logger) — but consider if dependency injection is better |

## Structural Patterns

Assembling objects and classes into larger structures.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Adapter | Incompatible interfaces that need to work together | Wrapper code translating between two interfaces; integration with external APIs or legacy code |
| Bridge | Abstraction and implementation evolving independently | Cartesian product explosion in class hierarchy (e.g., Shape x Color); platform-specific implementations |
| Composite | Working with tree structures uniformly | Recursive structures where containers and leaves should be treated the same; nested menus, file systems, org charts |
| Decorator | Adding behavior dynamically without subclass explosion | Stacked if-checks adding optional behavior; many subclass combinations for feature mixing |
| Facade | Complex subsystem needs a simple interface | Client code calling many subsystem classes directly; initialization sequences repeated across callers |
| Flyweight | Many similar objects consuming too much memory | Large numbers of objects sharing most state; repeated immutable data across instances |
| Proxy | Need to control access, add lazy loading, or log access to an object | Access control checks before method calls; lazy initialization of expensive objects; caching, logging wrappers |

## Behavioral Patterns

Algorithms and responsibility assignment.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|---------------------|
| Chain of Responsibility | Request needs to be handled by one of several handlers | Sequence of if/else checks deciding who handles a request; middleware-like processing |
| Command | Need to parameterize, queue, or undo operations | Method calls that should be deferrable, undoable, or loggable; UI actions tightly coupled to business logic |
| Iterator | Need to traverse a collection without exposing internals | Custom traversal logic repeated across clients; direct access to internal collection structure |
| Mediator | Many objects communicating in complex ways | Classes with many cross-references; changes to one class cascade through many others |
| Memento | Need to save/restore object state (undo) | Manual state snapshots; undo/redo logic scattered across code |
| Observer | Objects need to react to state changes in another object | Polling for state changes; manual notification code; event-driven requirements |
| State | Object behavior changes based on internal state | Large switch/if on state field; methods that check state before acting; state transitions scattered |
| Strategy | Multiple algorithms for the same task, selected at runtime | Switch/if selecting an algorithm; duplicate classes differing only in one method; hardcoded algorithm choice |
| Template Method | Multiple classes follow the same algorithm with varying steps | Subclasses with identical algorithm structure but different details; copy-pasted methods with small variations |
| Visitor | Need to perform operations on elements of different types without modifying them | Type-checking with instanceof/typeof before operating; adding operations requires modifying many classes |
```

**Step 2: Verify file length**

```bash
wc -l /Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md
```

Expected: ~60-80 lines

**Step 3: Commit**

```bash
git -C /Users/pri/.claude add skills/backend-reviewer/references/design-patterns.md
git -C /Users/pri/.claude commit -m "feat: add design-patterns reference for backend-reviewer skill"
```

---

### Task 5: Verify skill installation and test manually

**Files:**
- Read: `/Users/pri/.claude/skills/backend-reviewer/SKILL.md`
- Read: `/Users/pri/.claude/skills/backend-reviewer/references/code-smells.md`
- Read: `/Users/pri/.claude/skills/backend-reviewer/references/refactoring.md`
- Read: `/Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md`

**Step 1: Verify all files exist**

```bash
find /Users/pri/.claude/skills/backend-reviewer -type f | sort
```

Expected:
```
/Users/pri/.claude/skills/backend-reviewer/SKILL.md
/Users/pri/.claude/skills/backend-reviewer/references/code-smells.md
/Users/pri/.claude/skills/backend-reviewer/references/design-patterns.md
/Users/pri/.claude/skills/backend-reviewer/references/refactoring.md
```

**Step 2: Verify SKILL.md frontmatter is valid**

Read the first 10 lines of SKILL.md and confirm the `name` and `description` fields are present and properly formatted in YAML.

**Step 3: Verify the skill appears in Claude's available skills**

Start a new Claude Code session or use `/skills` to confirm `backend-reviewer` appears in the skill list.

**Step 4: Commit any final fixes**

If any corrections were needed, commit them:

```bash
git -C /Users/pri/.claude add skills/backend-reviewer/
git -C /Users/pri/.claude commit -m "fix: corrections to backend-reviewer skill files"
```
