# Object Calisthenics — Complete Reference

Originally defined by Jeff Bay in *The ThoughtWorks Anthology* (2008). These are **programming exercises** — strict constraints designed to force better habits. Like physical calisthenics, they build strength through discipline.

---

## Rule 1: Only One Level of Indentation per Method

### The Rule
Each method/function should have at most one level of indentation. If the body of a method is inside a control structure, that's one level. No nesting beyond that.

### Why It Matters
Deep nesting is the #1 readability killer. Each level of indentation doubles the cognitive load — the reader must track all parent conditions mentally. Flat code is scannable; nested code requires a debugger mindset.

### Violation Example (TypeScript)
```typescript
function processOrders(orders: Order[]) {
  for (const order of orders) {
    if (order.isValid()) {
      for (const item of order.items) {        // 2 levels deep
        if (item.inStock()) {                   // 3 levels deep
          item.reserve();
        }
      }
    }
  }
}
```

### Fixed Example
```typescript
function processOrders(orders: Order[]) {
  orders.filter(order => order.isValid()).forEach(processOrder);
}

function processOrder(order: Order) {
  order.items.filter(item => item.inStock()).forEach(item => item.reserve());
}
```

### Techniques
- **Extract Method** — pull inner blocks into named functions
- **Collection pipelines** — replace loops with `.filter()`, `.map()`, `.forEach()`
- **Early return** — invert conditions to exit early, reducing nesting

---

## Rule 2: Don't Use the ELSE Keyword

### The Rule
Never use `else` or `else if`. Every conditional should be handled by early returns, guard clauses, polymorphism, or lookup tables.

### Why It Matters
`else` creates two equally-weighted branches that force the reader to track both paths. Guard clauses establish "the normal flow goes down" — early exits handle edge cases at the top, then the rest of the function is the happy path. This is dramatically easier to read.

### Violation Example (TypeScript)
```typescript
function getDiscount(customer: Customer): number {
  if (customer.isPremium()) {
    if (customer.years > 5) {
      return 0.2;
    } else {
      return 0.1;
    }
  } else {
    return 0;
  }
}
```

### Fixed Example
```typescript
function getDiscount(customer: Customer): number {
  if (!customer.isPremium()) return 0;
  if (customer.years > 5) return 0.2;
  return 0.1;
}
```

### Techniques
- **Guard clauses** — handle edge cases first with early returns
- **Ternary** — for simple value assignments: `const x = condition ? a : b`
- **Polymorphism** — replace type-checking conditionals with method overrides
- **Strategy/Map** — replace if/else chains with lookup tables or strategy objects
- **Null Object** — replace null checks with objects that have default behavior

---

## Rule 3: Wrap All Primitives and Strings

### The Rule
Any primitive type (string, number, boolean) that has domain meaning should be wrapped in a dedicated type or class.

### Why It Matters
`string` can be an email, a name, a URL, or a SQL injection attack. A `userId: string` tells you nothing about validation, format, or behavior. `UserId` is self-documenting, can enforce validation at construction time, and prevents mixing incompatible values (passing an `orderId` where a `userId` is expected).

### Violation Example
```typescript
function createUser(name: string, email: string, age: number): void {
  // name and email are interchangeable by type — easy to swap accidentally
}

createUser(email, name, age); // Compiles fine, wrong semantics
```

### Fixed Example (TypeScript branded types)
```typescript
type UserName = string & { readonly __brand: 'UserName' };
type Email = string & { readonly __brand: 'Email' };
type Age = number & { readonly __brand: 'Age' };

function createUser(name: UserName, email: Email, age: Age): void { }

// Or with value objects:
class Email {
  constructor(private readonly value: string) {
    if (!value.includes('@')) throw new Error('Invalid email');
  }
  toString() { return this.value; }
}
```

### Pragmatic Exceptions
- Loop counters (`i`, `j`)
- Framework-required signatures (`req.params.id`)
- Configuration values
- Simple boolean flags with clear names

---

## Rule 4: First Class Collections

### The Rule
Any class/module that contains a collection should contain no other member variables. The collection gets its own class with domain-specific behavior.

### Why It Matters
Collections with domain behavior scattered across services create Feature Envy and Shotgun Surgery. A `Cart` class that wraps `Product[]` can have `totalPrice()`, `hasItem()`, `removeExpired()` — behavior lives with the data.

### Violation Example
```typescript
class OrderService {
  private orders: Order[] = [];
  private maxOrders: number = 100;  // second field alongside collection

  getActiveOrders(): Order[] {
    return this.orders.filter(o => o.isActive());
  }

  getTotalRevenue(): number {
    return this.orders.reduce((sum, o) => sum + o.total, 0);
  }
}
```

### Fixed Example
```typescript
class Orders {
  constructor(private readonly items: Order[]) {}

  active(): Orders {
    return new Orders(this.items.filter(o => o.isActive()));
  }

  totalRevenue(): number {
    return this.items.reduce((sum, o) => sum + o.total, 0);
  }

  count(): number {
    return this.items.length;
  }
}
```

### Pragmatic Exceptions
- DTOs and API response types
- Framework-required shapes (React state with arrays + other fields)
- Simple utility functions that transform arrays

---

## Rule 5: One Dot per Line

### The Rule
Don't chain multiple method calls: `obj.getA().getB().doC()`. Each line should have at most one dot (method call on an object).

### Why It Matters
This is the Law of Demeter in action. Method chains create coupling to the internal structure of objects. If `getA()` return type changes, everything downstream breaks. It also signals that behavior is in the wrong place — you're reaching through objects to get data instead of asking them to act.

### Violation Example
```typescript
const city = order.getCustomer().getAddress().getCity();
```

### Fixed Example
```typescript
// Option 1: Delegate
const city = order.shippingCity();

// Option 2: Intermediate variables (when delegation doesn't make sense)
const customer = order.getCustomer();
const address = customer.getAddress();
const city = address.getCity();
```

### Explicit Exceptions
These are NOT violations:
- **Fluent builders**: `QueryBuilder.select('*').from('users').where('id', 1)`
- **Stream/pipeline APIs**: `array.filter(x => x.active).map(x => x.name)`
- **Promise chains**: `fetch(url).then(res => res.json()).then(data => process(data))`
- **jQuery-style APIs**: `$('.item').addClass('active').show()`

The rule targets **navigation through object graphs**, not **fluent APIs designed for chaining**.

---

## Rule 6: Don't Abbreviate

### The Rule
No abbreviated names. If a name is too long to type, the scope is too large or the concept needs rethinking.

### Why It Matters
Abbreviations optimize for typing speed; full names optimize for reading speed. Code is read 10x more than written. `processCustomerRegistrationRequest` is instantly clear; `procCustRegReq` requires mental decryption every time.

### Common Violations
| Abbreviated | Full Name |
|------------|-----------|
| `mgr` | `manager` |
| `ctx` | `context` |
| `btn` | `button` |
| `tmp` | `temporary` (or better: name the actual purpose) |
| `val` | `value` (or better: name what value) |
| `cb` | `callback` (or better: name the event) |
| `fn` | `function` (or better: name the behavior) |
| `impl` | `implementation` |
| `cfg` | `configuration` |
| `usr` | `user` |
| `msg` | `message` |
| `resp` | `response` |
| `req` | `request` |

### Accepted Conventions
These are so universal they don't count as abbreviations:
- `i`, `j`, `k` — loop indices
- `e`, `err` — error in catch blocks
- `id` — identifier
- `db` — database
- `io` — input/output
- `url` — uniform resource locator
- `api` — application programming interface
- `fs` — file system (Node.js convention)
- `el` — DOM element (widely accepted)

---

## Rule 7: Keep All Entities Small

### The Rule
- **Functions**: ≤ 20 lines (logical lines, excluding blanks and comments)
- **Classes/modules**: ≤ 200 lines
- **Files**: ≤ 400 lines
- **Packages/directories**: ≤ 10 files

### Why It Matters
Small entities have single responsibilities by necessity — there's no room for multiple concerns. A 200-line class can do one thing well. A 1000-line class inevitably mixes concerns. Size limits force decomposition, which forces better design.

### Techniques for Functions > 20 Lines
1. **Extract Method** — pull coherent blocks into named functions
2. **Replace Temp with Query** — extract calculations into methods
3. **Decompose Conditional** — extract complex conditions into boolean methods
4. **Replace Loop with Pipeline** — `.filter().map().reduce()` is often shorter and clearer

### Techniques for Large Classes
1. **Extract Class** — group related fields and methods into a new class
2. **Extract Superclass/Interface** — when classes share structure
3. **Move Method** — when a method uses another class's data more than its own

### Pragmatic Thresholds (for reviewer judgment)
| Entity | Strict | Acceptable | Flag |
|--------|--------|------------|------|
| Function | ≤ 20 lines | ≤ 30 lines | > 30 lines |
| Class | ≤ 200 lines | ≤ 300 lines | > 300 lines |
| File | ≤ 400 lines | ≤ 500 lines | > 500 lines |

Test files are exempt from these limits.

---

## Rule 8: No Classes with More Than Two Instance Variables

### The Rule
A class should have at most two instance variables (fields). If you need more, decompose into smaller classes and compose them.

### Why It Matters
This is the most extreme rule and the hardest to follow. It forces radical decomposition — instead of a `User` with 8 fields, you get `User(Name, Credentials)` where `Name(first, last)` and `Credentials(email, passwordHash)`. Each small class has high cohesion.

### Strict Example
```typescript
// Violation: 4 instance variables
class User {
  constructor(
    private firstName: string,
    private lastName: string,
    private email: string,
    private passwordHash: string,
  ) {}
}

// Fixed: max 2 per class
class Name {
  constructor(private first: string, private last: string) {}
}

class Credentials {
  constructor(private email: string, private passwordHash: string) {}
}

class User {
  constructor(private name: Name, private credentials: Credentials) {}
}
```

### Pragmatic Adaptation
The strict 2-variable limit is an exercise target. In production:
- **2-3 fields**: Excellent
- **4 fields**: Acceptable if cohesive
- **5+ fields**: Flag for review — likely mixing concerns
- **8+ fields**: Definite violation — decompose

---

## Rule 9: No Getters/Setters/Properties

### The Rule
Don't expose internal state through getters and setters. Instead, add behavior to the class — Tell, Don't Ask.

### Why It Matters
Getters extract data for external logic. This means the behavior that uses the data is in the wrong place — it should be on the class that owns the data. `order.getTotal()` and then doing something with it externally should be `order.applyDiscount()` or `order.checkout()`.

### Violation Example
```typescript
class Account {
  getBalance(): number { return this.balance; }
  setBalance(amount: number) { this.balance = amount; }
}

// External code doing the work:
if (account.getBalance() >= amount) {
  account.setBalance(account.getBalance() - amount);
}
```

### Fixed Example
```typescript
class Account {
  withdraw(amount: number): void {
    if (this.balance < amount) throw new InsufficientFunds();
    this.balance -= amount;
  }

  canAfford(amount: number): boolean {
    return this.balance >= amount;
  }
}
```

### Pragmatic Exceptions
- **DTOs/serialization**: Data transfer objects exist to expose data
- **React/Vue props**: Component props are read-only data by design
- **Framework requirements**: ORMs, serializers, form libraries need getters
- **Pure data records**: TypeScript interfaces/types with readonly fields are fine

---

## Summary Table

| # | Rule | Severity | Key Signal |
|---|------|----------|------------|
| 1 | One Level of Indentation | Warning | Nested if/for/while inside if/for/while |
| 2 | No ELSE | Warning | `else` or `else if` keyword present |
| 3 | Wrap Primitives | Info | Bare `string`/`number` for domain concepts |
| 4 | First Class Collections | Info | Arrays with domain behavior scattered elsewhere |
| 5 | One Dot per Line | Warning | `a.b().c().d()` — navigating object graphs |
| 6 | Don't Abbreviate | Warning | `mgr`, `ctx`, `btn`, `tmp`, `val`, `cb` |
| 7 | Keep Entities Small | Warning | Functions > 20 lines, classes > 200, files > 400 |
| 8 | Max Two Instance Variables | Info | Classes with 5+ fields |
| 9 | No Getters/Setters | Info | Public getters exposing state without behavior |

---

## Language-Specific Notes

### TypeScript/JavaScript
- Use branded types or value objects for Rule 3
- Use readonly arrays and Readonly<T> to enforce immutability
- Rule 5 exemptions: Array methods, RxJS pipes, Promise chains
- Rule 9: TypeScript `readonly` properties in interfaces are acceptable

### Python
- Use dataclasses with `__post_init__` for validation (Rule 3)
- Use `@property` sparingly — it's a getter in disguise (Rule 9)
- List comprehensions count as one level of indentation (Rule 1)
- f-strings with simple expressions are fine (Rule 5)

### Go
- Use named types for Rule 3: `type UserID string`
- Go's error handling (`if err != nil`) is exempt from Rule 2
- Go interfaces naturally enforce Rule 9 (behavior over data)

### Java/Kotlin
- Use records/data classes for DTOs (exempt from Rule 9)
- Kotlin scope functions (let, run, apply) are exempt from Rule 5
- Java Stream API is exempt from Rule 5
