# Design Patterns Reference

Quick-reference for identifying when a design pattern would improve code structure during review.

## Creational Patterns

Patterns that deal with object creation mechanisms, aiming to create objects in a manner suitable to the situation.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|----------------------|
| Factory Method | Tight coupling between creator and concrete product classes | Direct `new` calls with conditionals selecting which class to instantiate; adding a new type requires modifying existing creation code; code coupled to concrete classes instead of interfaces |
| Abstract Factory | Need to create families of related objects that must be consistent with each other | Multiple factory methods in one class blurring its responsibility; parallel `if/switch` chains creating related objects (e.g., UI widgets that must match a theme); mixing product variants would cause bugs |
| Builder | Complex object construction with many optional parameters | Telescoping constructors (multiple overloads with increasing params); `new Foo(true, false, null, 7, null)`-style calls; scattered multi-step object initialization across client code |
| Prototype | Need to copy objects without depending on their concrete classes; too many subclasses differing only in initialization | Code doing manual field-by-field copying of objects; `instanceof` checks to determine how to clone; subclass explosion where classes differ only in initial config values |
| Singleton | Need exactly one instance of a class with a global access point | Multiple instances of a resource manager causing conflicts (DB connections, config); global variables used to share a single instance; scattered initialization checks for a shared resource |

## Structural Patterns

Patterns that deal with object composition, forming larger structures from individual objects and classes.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|----------------------|
| Adapter | Incompatible interfaces between existing classes that need to collaborate | Wrapper code translating between two interfaces inline; inability to use a useful class because its interface doesn't match; data format conversion scattered through client code (e.g., XML to JSON) |
| Bridge | Class hierarchy exploding from combining two independent dimensions of variation | Cartesian product of subclasses (e.g., `RedCircle`, `BlueCircle`, `RedSquare`, `BlueSquare`); monolithic class trying to support multiple platforms/variants; adding one dimension requires N new subclasses |
| Composite | Need to treat individual objects and groups of objects uniformly in tree structures | Recursive tree structures with separate handling for leaves vs. containers; client code using `instanceof` to distinguish simple vs. compound elements; repeated "sum up children" traversal logic |
| Decorator | Need to add responsibilities to objects dynamically without subclass explosion | Combinatorial explosion of subclasses for feature combinations (e.g., `EncryptedCompressedStream`); `final` class that can't be extended; needing to stack optional behaviors at runtime |
| Facade | Complex subsystem with too many classes exposed to clients | Client code initializing and coordinating many subsystem objects directly; repeated boilerplate sequences to use a library; tight coupling between business logic and 3rd-party framework internals |
| Flyweight | Large number of similar objects consuming too much memory | Thousands of objects with mostly identical field values (e.g., shared color/texture); high memory usage from duplicated immutable data across object instances; objects differing only in a few context-dependent fields |
| Proxy | Need to control access to an object (lazy init, caching, access control, logging) | Expensive object created eagerly when it's rarely used; repeated identical calls to a slow service without caching; scattered access-control checks before delegating to a service; no request logging |

## Behavioral Patterns

Patterns that deal with communication between objects, defining how objects interact and distribute responsibility.

| Pattern | Problem It Solves | Suggest When You See |
|---------|-------------------|----------------------|
| Chain of Responsibility | Processing a request through a dynamic sequence of handlers | Nested `if/else` chains for sequential checks (auth, validation, caching, logging); duplicated filtering logic across components; rigid processing pipeline that can't be reordered or extended |
| Command | Need to parameterize, queue, log, or undo operations | Operations duplicated across UI triggers (button, menu, shortcut doing the same thing); no undo/redo support where users need it; operations that need to be queued, scheduled, or serialized |
| Iterator | Need to traverse a collection without exposing its internal structure | Client code depending on a collection's concrete data structure for traversal; duplicated traversal logic across multiple clients; need to support multiple traversal strategies over the same collection |
| Mediator | Chaotic many-to-many dependencies between tightly coupled components | Classes with direct references to many peers, making them hard to reuse; changes to one component cascading through many others; components that can't be tested or used independently |
| Memento | Need to save and restore object state without exposing internal structure | Undo/redo implemented by exposing all internal fields publicly; external code reaching into private state to create snapshots; state backup logic scattered across multiple classes |
| Observer | Need to notify multiple objects about state changes without tight coupling | Polling loops checking for state changes; hardcoded notification calls to specific objects; adding a new listener requires modifying the publisher class |
| State | Object behavior changes based on internal state, implemented with large conditionals | Methods full of `if/switch` on a status/state field; state-specific behavior duplicated across multiple methods; adding a new state requires touching every method that checks state |
| Strategy | Multiple algorithms for the same task selected by conditionals | Large `if/switch` selecting an algorithm variant at runtime; similar classes differing only in one behavior; algorithm logic embedded in a class instead of being interchangeable |
| Template Method | Duplicate algorithm structure across subclasses differing only in specific steps | Multiple classes with nearly identical method sequences but different step implementations; copy-pasted algorithm skeletons with small variations; no hook points for subclass customization |
| Visitor | Need to add new operations to a stable class hierarchy without modifying it | `instanceof` cascades to perform type-specific operations; new cross-cutting behavior requiring changes to every class in a hierarchy; operations on a Composite tree that don't belong in the element classes |

## Reviewer Quick-Decision Guide

**Spot conditional object creation?** Start with Factory Method. If multiple related products, escalate to Abstract Factory.

**Spot a constructor with 5+ parameters?** Suggest Builder.

**Spot a class hierarchy growing in two dimensions?** Suggest Bridge (designed up-front) or Adapter (retrofitted onto legacy code).

**Spot subclass explosion from combining features?** Suggest Decorator for stackable behaviors, or Strategy if only one behavior varies.

**Spot big `if/switch` on a type or state field?**
- If switching on *object type* to perform operations: Visitor.
- If switching on *state* that changes over time: State.
- If switching on *algorithm variant*: Strategy.
- If switching on *request type* in a processing pipeline: Chain of Responsibility.

**Spot classes that can't be reused because they reference too many peers?** Suggest Mediator.

**Spot "notify these N things when X changes" logic?** Suggest Observer.

**Spot duplicated algorithm skeletons across sibling classes?** Suggest Template Method.

**Spot need for undo, replay, or deferred execution?** Suggest Command (+ Memento for state snapshots).
