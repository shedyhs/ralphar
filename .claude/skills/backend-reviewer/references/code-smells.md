# Code Smells Reference

Quick-reference for identifying and treating code smells during review.

## Bloaters

Code, methods, and classes that have grown so large they are hard to work with. They accumulate over time as the program evolves.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Long Method | Method longer than ~10 lines; needs comments to explain sections | Extract Method, Replace Temp with Query, Introduce Parameter Object, Preserve Whole Object, Replace Method with Method Object, Decompose Conditional | Performance concerns are almost never justified |
| Large Class | Class with too many fields, methods, or lines of code | Extract Class, Extract Subclass, Extract Interface, Duplicate Observed Data | -- |
| Primitive Obsession | Primitives instead of small objects (currency, ranges, phone numbers); constants for type codes; string field names in arrays | Replace Data Value with Object, Introduce Parameter Object, Preserve Whole Object, Replace Type Code with Class/Subclasses/State/Strategy, Replace Array with Object | -- |
| Long Parameter List | More than 3-4 method parameters | Replace Parameter with Method Call, Preserve Whole Object, Introduce Parameter Object | Removing params would create unwanted class dependencies |
| Data Clumps | Same groups of variables appear together repeatedly (e.g., DB connection params) | Extract Class, Introduce Parameter Object, Preserve Whole Object | Passing whole object would create undesirable dependency between classes |

## Object-Orientation Abusers

Incomplete or incorrect application of OO programming principles.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Switch Statements | Complex `switch`/`if` chains based on type or state | Extract Method + Move Method, Replace Type Code with Subclasses/State/Strategy, Replace Conditional with Polymorphism, Replace Parameter with Explicit Methods, Introduce Null Object | Simple actions; factory patterns (Factory Method, Abstract Factory) |
| Temporary Field | Fields only populated under certain conditions, empty otherwise | Extract Class (method object), Replace Method with Method Object, Introduce Null Object | -- |
| Refused Bequest | Subclass uses only some inherited methods/properties; overrides to throw exceptions | Replace Inheritance with Delegation, Extract Superclass | -- |
| Alternative Classes with Different Interfaces | Two classes do the same thing but have different method names | Rename Method, Move Method, Add Parameter, Parameterize Method, Extract Superclass | Classes are in different libraries you cannot modify |

## Change Preventers

Changing something in one place forces many changes elsewhere, making development expensive.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Divergent Change | One class must change in many different ways for different reasons (opposite of Shotgun Surgery) | Extract Class, Extract Superclass, Extract Subclass | -- |
| Shotgun Surgery | A single change requires many small edits across many classes (opposite of Divergent Change) | Move Method, Move Field, Inline Class | -- |
| Parallel Inheritance Hierarchies | Creating a subclass in one hierarchy requires creating a subclass in another | Move Method, Move Field (merge hierarchies) | De-duplicating would produce uglier code |

## Dispensables

Pointless and unneeded elements whose absence would make code cleaner and easier to understand.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Comments | Method filled with explanatory comments to clarify unclear code | Extract Variable, Extract Method, Rename Method, Introduce Assertion | Explaining *why* (not *what*); genuinely complex algorithms |
| Duplicate Code | Two or more code fragments look almost identical | Extract Method, Pull Up Field, Pull Up Constructor Body, Form Template Method, Substitute Algorithm, Extract Superclass, Extract Class, Consolidate Conditional Expression, Consolidate Duplicate Conditional Fragments | Merging would make code less intuitive (rare) |
| Lazy Class | Class that does too little to justify its maintenance cost | Inline Class, Collapse Hierarchy | Class delineates intentions for planned future development |
| Data Class | Class with only fields and getters/setters, no behavior | Encapsulate Field, Encapsulate Collection, Move Method, Extract Method, Remove Setting Method, Hide Method | -- |
| Dead Code | Unused variables, parameters, fields, methods, or classes | Delete unused code, Inline Class, Collapse Hierarchy, Remove Parameter | -- |
| Speculative Generality | Unused classes, methods, fields, or parameters created "just in case" | Collapse Hierarchy, Inline Class, Inline Method, Remove Parameter | Framework code needed by consumers; elements used only in tests |

## Couplers

Excessive coupling between classes, or excessive delegation replacing coupling.

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Feature Envy | Method accesses another object's data more than its own | Move Method, Extract Method | Intentional separation via Strategy or Visitor pattern |
| Inappropriate Intimacy | Class uses internal fields/methods of another class extensively | Move Method, Move Field, Extract Class, Hide Delegate, Change Bidirectional Association to Unidirectional, Replace Delegation with Inheritance | -- |
| Message Chains | Long chains of calls like `a.b().c().d()` | Hide Delegate, Extract Method + Move Method | Avoid over-hiding (leads to Middle Man) |
| Middle Man | Class that only delegates to another class without adding value | Remove Middle Man | Added to avoid inter-class dependencies; design patterns (Proxy, Decorator) |

## Other

| Smell | Symptoms | Treatment | Ignore When |
|-------|----------|-----------|-------------|
| Incomplete Library Class | Library lacks needed features and cannot be modified | Introduce Foreign Method, Introduce Local Extension | Library changes would cascade into your code |
