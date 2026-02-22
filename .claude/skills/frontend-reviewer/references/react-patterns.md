# React Patterns Reference

Quick-reference for identifying when a React design pattern or rendering strategy
would improve code during review.

## Design Patterns

Patterns for component composition, logic reuse, and separation of concerns.

| Pattern | What It Does | When to Use | Reviewer Signals |
|---------|-------------|-------------|-----------------|
| Compound Components | Parent shares implicit state via Context with child sub-components (`<FlyOut>`, `<FlyOut.Toggle>`, `<FlyOut.List>`). Children are attached as static properties on the parent. | Multi-part UI elements (selects, menus, dropdowns) that share open/toggle state; component library design | Tightly-coupled siblings passing the same state through excessive props; related components that must coordinate but consumers shouldn't manage the shared state themselves |
| Higher-Order Component (HOC) | Function wrapping a component to inject cross-cutting behavior (e.g., `withLoader(Component, url)` adds loading state, `withStyles` adds shared styling). HOCs compose via nesting. | Same uncustomized behavior across many components; component works standalone without the added logic | Duplicated loading indicators, auth gates, or styling boilerplate across many components; but watch for prop naming collisions, wrapper hell, and hard-to-trace prop origins |
| Hooks | Built-in (`useState`, `useEffect`, `useContext`, `useReducer`) and custom hooks (`useKeyPress`, `useHover`) extract stateful and side-effect logic into reusable functions callable from any functional component. | Reusable stateful logic; replacing class lifecycle methods; sharing non-visual logic; behavior that needs customization per-component | Class components that should be functional; duplicated `useEffect`/state logic; nested HOC/render-prop wrappers that a Hook could flatten; lifecycle methods like `componentDidMount` |
| Presentational / Container | Separates data-fetching (Container) from display (Presentational). Modern equivalent: custom hook for data + pure functional component for UI. Presentational components are pure functions of props. | Enforcing separation of concerns; making UI components reusable and independently testable | Component both fetches data AND renders complex JSX; API calls mixed into display logic; can't reuse the rendering piece with different data sources |
| Render Props | Component receives a function prop (or children-as-function) it calls with internal data, letting the consumer control what gets rendered. Solves HOC naming collisions. | Sharing stateful logic while giving consumer full control over rendered output; avoiding HOC prop-name conflicts | Render props causing deeply nested JSX callback chains; libraries like older Apollo Client using `<Mutation>` wrappers; prefer Hooks for new code |

**Modern guidance (React 18+):** Hooks are the preferred mechanism for logic reuse.
HOCs and Render Props remain valid but add component layers that hurt readability and
block React Compiler optimizations. The React Compiler (React 19+) can auto-memoize
functional components, eliminating many manual `useMemo`/`useCallback` calls. Compound
Components via Context remain recommended for coordinated UI element libraries.

### Design Pattern Tradeoffs

| Pattern | Pros | Cons |
|---------|------|------|
| Compound | Internal state is hidden; clean consumer API; single import | Limited to Context-connected children; nesting constraints with `React.Children.map` |
| HOC | Logic centralized in one place; DRY; component stays standalone | Prop naming collisions; wrapper hell with deep nesting; hard to trace which HOC provides which prop |
| Hooks | Flat component tree; composable; testable; React Compiler-friendly | Must follow Rules of Hooks; `useEffect` misuse is common; wrong use of `useCallback`/`useMemo` |
| Presentational/Container | Easy to test presentational components (pure functions); reusable UI | Can be overkill for small apps; Hooks achieve the same separation with less boilerplate |
| Render Props | No naming collisions; explicit data flow; consumer controls output | Deep nesting with multiple render props; largely replaced by Hooks |

## Rendering Strategies

Patterns for how and where HTML is generated, affecting performance (FCP, TTI, LCP) and SEO.

| Strategy | What It Does | When to Use | Reviewer Signals |
|----------|-------------|-------------|-----------------|
| Client-Side Rendering (CSR) | Browser downloads minimal HTML shell; JS renders all content on the client. Entire app loads on first request; navigation is route-change without server round-trips. | Internal dashboards, SPAs where SEO is irrelevant; highly interactive apps after initial load | Large JS bundle delaying FCP and TTI; blank screen until JS loads and executes; apply code-splitting, lazy loading, and preloading to mitigate; budget initial JS under 170KB gzipped |
| Server-Side Rendering (SSR) | Server generates full HTML per request; client hydrates for interactivity. FCP equals TTI since less JS is needed. Uses `renderToString` or streaming APIs. | Dynamic, personalized pages needing SEO and fast FCP; content changes per-request | Content must be crawlable; user-specific data on every request; slower TTFB under load -- consider caching or streaming SSR; full page reloads needed for some interactions |
| Static Site Generation (SSG) | HTML pre-rendered at build time via `getStaticProps`/`generateStaticParams`; served from CDN. Near-zero server processing per request. | Content that rarely changes: blogs, docs, marketing, product listings | Same content for all users; fast TTFB via CDN caching; stale if not rebuilt after content changes; large sites face long build times -- consider ISR |
| Incremental Static Regeneration (ISR) | SSG with background revalidation using `revalidate` timeout. New pages built lazily on first request via `fallback: true`. Stale-while-revalidate strategy. | Large sites with mostly-static but periodically-updated content | SSG site rebuilding too often; stale content complaints; use on-demand revalidation (`revalidatePath`/`revalidateTag`) for instant updates; consistent low latency since regeneration is per-page |
| Progressive Hydration | SSR delivers HTML; JS hydrates components incrementally based on viewport visibility, priority, or user interaction rather than all-at-once. | Pages with large non-interactive sections; reducing TTI gap after SSR | Long delay between FCP and TTI ("uncanny valley" -- buttons look clickable but aren't); wrap non-critical/below-fold components in `<Suspense>` + `React.lazy`; React 18 selective hydration prioritizes interacted-with components automatically |
| Streaming SSR | Server sends HTML in chunks as rendering progresses via `renderToPipeableStream`. Suspense fallbacks display for slow-resolving parts while fast parts appear immediately. | SSR pages with heterogeneous data sources (some fast, some slow); improving TTFB | Slow TTFB from waiting on full server render to complete; one slow API call blocking the entire page response; use Suspense boundaries to delineate independently-streamable sections |
| React Server Components (RSC) | Components execute on the server only; their JS never ships to the client. Can be refetched without losing client-side state. Automatic code-splitting for client component imports. | Data-fetching logic; heavy library usage (markdown, sanitization, date formatting); components needing no interactivity | Large client bundle from server-only libraries; `'use client'` directive should be pushed to leaf interactive components; container/data-fetching logic is a natural RSC candidate; 20%+ bundle reduction reported |

### Rendering Strategy Tradeoffs

| Strategy | Pros | Cons |
|----------|------|------|
| CSR | Rich interactivity; clear client/server separation; fast route transitions | Poor SEO; slow initial load; blank screen during JS download |
| SSR | Fast FCP; SEO-friendly; less client JS needed | Slower TTFB under load; full page reloads for some interactions; server cost |
| SSG | Fastest TTFB (CDN-served); SEO-friendly; resilient (static files) | Stale content without rebuild; long build times for large sites; no per-user personalization |
| ISR | SSG speed + dynamic updates; per-page regeneration; CDN-distributable | Stale-while-revalidate means briefly outdated content; requires hosting that supports ISR |
| Progressive Hydration | Reduces TTI; smaller initial JS; code-splitting built-in | Not ideal for fully-interactive pages where everything needs immediate hydration |
| Streaming SSR | Faster TTFB than traditional SSR; progressive content display | Requires Suspense boundaries; more complex server setup; older `renderToString` must be replaced |
| RSC | Dramatically smaller client bundles; direct server data access; automatic code-splitting | Cannot use client-side state/effects; requires framework support (Next.js App Router); new mental model |

## Reviewer Quick-Decision Guide

**Spot duplicated cross-cutting logic (auth, loading, logging) across components?**
If uncustomized and identical, suggest HOC. If behavior varies per component, suggest a custom Hook.

**Spot tightly-coupled sibling components sharing toggle/selection state?**
Suggest Compound Components with Context API.

**Spot a component that fetches data AND renders complex UI?**
Suggest separating into a custom hook (or Server Component for RSC apps) + presentational component.

**Spot class components with lifecycle methods?**
Suggest refactoring to function components with Hooks. Modern React docs recommend function components for all new code.

**Spot render props or HOCs causing deep nesting / callback hell?**
Suggest replacing with a custom Hook to flatten the component tree.

**Spot `useEffect` deriving state from other state?**
Suggest computing directly in the component body instead. Unnecessary effects cause double-renders and stale-closure bugs.

**Spot a public-facing page using pure CSR (big bundle, blank initial screen)?**
Suggest SSR or SSG with hydration for better FCP and SEO. Use code-splitting with `React.lazy` and `<Suspense>`.

**Spot SSR pages with slow TTFB from heavy data fetching?**
Suggest Streaming SSR with Suspense boundaries to flush content incrementally.

**Spot a static site rebuilding entirely for small content changes?**
Suggest ISR with `revalidate` or on-demand revalidation (`revalidatePath`/`revalidateTag`).

**Spot a long gap between FCP and TTI (SSR page feels frozen)?**
Suggest Progressive Hydration. Wrap non-critical sections in `<Suspense>` with `React.lazy`. React 18 auto-prioritizes hydration of components the user interacts with.

**Spot large client bundles from server-only libraries (markdown parsers, date formatters)?**
Suggest React Server Components to keep that code off the client entirely.

**Spot `getServerSideProps` / `getStaticProps` in Next.js App Router?**
Suggest migrating to async Server Components with `generateStaticParams` for the modern pattern.

**Spot manual `React.lazy()` scattered across the codebase for code-splitting?**
In RSC apps, Server Components get automatic code-splitting for client component imports.
In non-RSC apps, ensure lazy components are wrapped in `<Suspense>` with meaningful fallbacks.

**Spot a Next.js page mixing `'use client'` at the top level?**
Push `'use client'` down to the smallest interactive leaf components. Keep parent
layout and data-fetching logic as Server Components to minimize client bundle size.

**Spot prop drilling through 3+ component layers?**
Suggest Context (for infrequently-changing values like theme/auth) or a lightweight
state library (Zustand, Jotai) for frequently-updated shared state. Avoid Context for
high-frequency updates as it re-renders all consumers.
