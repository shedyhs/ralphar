# Refactoring Techniques Reference

Quick-reference for suggesting specific, named refactoring techniques during code review.
When a code smell is identified, use this table to recommend the precise refactoring by name.

**How to use:** Match the "When to Use" column to the problem observed in the code under review.
Cite the technique name in review comments so the author can look up the full procedure.

---

## Composing Methods

Excessively long methods are the root of many problems. These techniques streamline methods,
remove code duplication, and pave the way for future improvements.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Extract Method | A code fragment can be grouped together | Move the fragment to a new method with a descriptive name and replace the old code with a call to it. |
| Inline Method | A method body is more obvious than the method itself | Replace calls to the method with the method's content and delete the method. |
| Extract Variable | An expression is hard to understand | Place the result of the expression or its parts in separate, self-explanatory variables. |
| Inline Temp | A temp variable holds the result of a simple expression and nothing more | Replace references to the variable with the expression itself. |
| Replace Temp with Query | A local variable stores an expression result for later use | Move the expression to a separate method and call that method instead of using the variable. |
| Split Temporary Variable | A local variable is reused to store different intermediate values (not a loop counter) | Use a separate variable for each distinct value, each responsible for one thing. |
| Remove Assignments to Parameters | A value is assigned to a parameter inside the method body | Use a local variable instead of reassigning the parameter. |
| Replace Method with Method Object | A long method has intertwined local variables that prevent Extract Method | Transform the method into a separate class where locals become fields, then split the method within that class. |
| Substitute Algorithm | You want to replace an existing algorithm with a simpler or better one | Replace the body of the method with the new algorithm. |

## Moving Features Between Objects

Even if functionality is distributed poorly among classes, these techniques show how to safely
move it between classes, create new classes, and hide implementation details from public access.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Move Method | A method is used more in another class than in its own class | Create the method in the class that uses it most, move the code there, and redirect or remove the original. |
| Move Field | A field is used more in another class than in its own class | Create the field in the new class and redirect all users of the old field to it. |
| Extract Class | One class does the work of two | Create a new class and move the fields and methods for the secondary responsibility into it. |
| Inline Class | A class does almost nothing and has no planned responsibilities | Move all features from the class into another one and delete the empty class. |
| Hide Delegate | A client traverses object A to get object B, then calls a method on B | Create a delegating method in class A so the client doesn't need to know about class B. |
| Remove Middle Man | A class has too many methods that simply delegate to other objects | Delete the delegating methods and have the client call the end methods directly. |
| Introduce Foreign Method | A utility class lacks a method you need and you cannot modify it | Add the method to a client class, passing the utility object as an argument. |
| Introduce Local Extension | A utility class lacks several methods you need and you cannot modify it | Create a subclass or wrapper of the utility class containing the new methods. |

## Organizing Data

These techniques help with data handling, replacing primitives with rich class functionality.
Another important result is untangling class associations, making classes more portable and reusable.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Self Encapsulate Field | You access private fields directly inside the class | Create a getter and setter for the field and use only those accessors within the class. |
| Replace Data Value with Object | A field has its own behavior and associated data | Create a new class for the field and its behavior, and store an object of that class in the original. |
| Change Value to Reference | You have many identical instances of a class that should be one shared object | Convert the identical objects to a single reference object managed via a factory or registry. |
| Change Reference to Value | A reference object is too small and rarely changed to justify lifecycle management | Turn it into an immutable value object. |
| Replace Array with Object | An array contains various types of data | Replace the array with an object that has separate named fields for each element. |
| Duplicate Observed Data | Domain data is stored in GUI classes | Separate the data into domain classes and synchronize them with the GUI via the Observer pattern. |
| Change Unidirectional to Bidirectional | Two classes need each other's features but the association is only one-way | Add the missing reverse association to the class that needs it. |
| Change Bidirectional to Unidirectional | A bidirectional association exists but one class doesn't use the other's features | Remove the unused association to reduce coupling. |
| Replace Magic Number with Symbolic Constant | Code uses a numeric literal that has a specific meaning | Replace the number with a named constant that explains its meaning. |
| Encapsulate Field | You have a public field | Make the field private and create getter/setter access methods. |
| Encapsulate Collection | A class has a collection field with a simple getter and setter | Return a read-only copy from the getter and provide explicit add/remove methods for elements. |
| Replace Type Code with Class | A field contains type code values not used in conditionals or affecting behavior | Create a new class and use its objects instead of the raw type code values. |
| Replace Type Code with Subclasses | A coded type directly affects program behavior via conditionals | Create subclasses for each type value, move behavior into them, and replace conditionals with polymorphism. |
| Replace Type Code with State/Strategy | A coded type affects behavior but subclassing the original class is not possible | Replace the type code field with a state/strategy object and swap implementations at runtime. |
| Replace Subclass with Fields | Subclasses differ only in their constant-returning methods | Replace those methods with fields in the parent class and delete the subclasses. |

## Simplifying Conditional Expressions

Conditionals tend to get more complicated over time. These techniques reduce
conditional complexity and make control flow easier to understand.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Decompose Conditional | You have a complex if-then-else or switch | Extract the condition, then-branch, and else-branch into separate well-named methods. |
| Consolidate Conditional Expression | Multiple conditionals lead to the same result or action | Combine them into a single expression and extract it into a descriptively named method. |
| Consolidate Duplicate Conditional Fragments | Identical code appears in all branches of a conditional | Move the duplicated code outside the conditional. |
| Remove Control Flag | A boolean variable acts as a control flag for multiple expressions | Replace the flag variable with `break`, `continue`, or `return`. |
| Replace Nested Conditional with Guard Clauses | Nested conditionals obscure the normal flow of execution | Convert special cases to guard clauses with early returns so the main logic is flat. |
| Replace Conditional with Polymorphism | A conditional performs different actions based on object type or properties | Create subclasses with a shared method for each branch, then dispatch via polymorphism. |
| Introduce Null Object | Methods return null, causing many null checks throughout the code | Return a null object that exhibits default behavior instead of null. |
| Introduce Assertion | Code requires certain conditions to be true to work correctly | Replace implicit assumptions with explicit assertion checks. |

## Simplifying Method Calls

These techniques make method calls simpler and easier to understand, which in turn
simplifies the interfaces for interaction between classes.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Rename Method | A method name does not explain what the method does | Rename the method to clearly describe its purpose. |
| Add Parameter | A method lacks data it needs to perform an action | Add a new parameter to pass the necessary data. |
| Remove Parameter | A parameter is not used in the method body | Remove the unused parameter. |
| Separate Query from Modifier | A method both returns a value and changes object state | Split it into two methods: one that returns the value and one that modifies state. |
| Parameterize Method | Multiple methods perform similar actions differing only in internal values | Combine them into one method that takes a parameter for the varying value. |
| Replace Parameter with Explicit Methods | A method is split into parts selected by a parameter value | Extract each part into its own method and call the appropriate one directly. |
| Preserve Whole Object | You extract several values from an object and pass them as separate parameters | Pass the whole object instead. |
| Replace Parameter with Method Call | A caller queries a value then passes it as a parameter, but the callee could query it directly | Remove the parameter and let the method call the query internally. |
| Introduce Parameter Object | Methods share a repeating group of parameters | Replace the parameter group with an object. |
| Remove Setting Method | A field's value should be set only at creation time and never changed | Remove the setter so the field can only be set in the constructor. |
| Hide Method | A method is not used by other classes or only within its own hierarchy | Make the method private or protected. |
| Replace Constructor with Factory Method | A constructor does more than just setting field values | Create a factory method and use it instead of direct constructor calls. |
| Replace Error Code with Exception | A method returns a special value to indicate an error | Throw an exception instead of returning an error code. |
| Replace Exception with Test | An exception is thrown where a simple conditional check would suffice | Replace the exception with a precondition test. |

## Dealing with Generalization

Abstraction has its own group of refactoring techniques, primarily associated with moving
functionality along the class inheritance hierarchy, creating new classes and interfaces,
and replacing inheritance with delegation and vice versa.

| Technique | When to Use | What to Do |
|-----------|-------------|------------|
| Pull Up Field | Two or more subclasses have the same field | Move the field from the subclasses to the superclass. |
| Pull Up Method | Subclasses have methods that perform similar work | Make the methods identical, then move them to the superclass. |
| Pull Up Constructor Body | Subclass constructors contain mostly identical code | Create a superclass constructor with the shared code and call it from subclass constructors. |
| Push Down Method | Behavior in a superclass is used by only one or a few subclasses | Move the method to those specific subclasses. |
| Push Down Field | A field in the superclass is used by only a few subclasses | Move the field to those subclasses. |
| Extract Subclass | A class has features used only in certain cases | Create a subclass for those cases and move the relevant features into it. |
| Extract Superclass | Two classes have common fields and methods | Create a shared superclass and move the identical fields and methods into it. |
| Extract Interface | Multiple clients use the same subset of a class interface, or two classes share part of their interface | Extract the common portion into a dedicated interface. |
| Collapse Hierarchy | A subclass is practically the same as its superclass | Merge the subclass into the superclass. |
| Form Template Method | Subclasses implement algorithms with similar steps in the same order | Move the algorithm structure and identical steps to a superclass, leaving variant steps in subclasses. |
| Replace Inheritance with Delegation | A subclass uses only a portion of superclass methods or cannot properly inherit its data | Create a field holding a superclass object, delegate to it, and remove the inheritance relationship. |
| Replace Delegation with Inheritance | A class contains many simple methods that all delegate to another class | Make the delegating class inherit from the delegate, eliminating the pass-through methods. |
