# Vanilla JS Patterns Reference

Quick-reference for code reviewers. Condensed from patterns.dev source files (24 files).

## 1. Design Patterns

### Factory
- **Does:** Returns new objects via functions without `new`. Adds computed properties to created objects.
- **Use when:** Many similar objects with environment-dependent or configurable properties.
- **Review:** Factory funcs returning `({...})`. Flag when classes with shared prototypes would be more memory-efficient.
### Flyweight
- **Does:** Shares intrinsic state (e.g. title, author) across instances via a cache (Map/Set). Extrinsic state (availability, sales) stored separately.
- **Use when:** Huge number of objects sharing identical data subsets. Reduces RAM consumption.
- **Review:** Cache keyed by identifier, `Map`/`Set` lookups before `new`. Less critical with modern HW but valid for large datasets.
### Mediator
- **Does:** Routes all communication through a central hub instead of direct many-to-many links. Express.js middleware is a real-world mediator.
- **Use when:** Complex multidirectional data flow -- chatrooms, event buses, middleware chains.
- **Review:** Hub with `logMessage`/`send` or `next()` chains. Verify mediator does not become a god object.
### Mixin
- **Does:** Adds reusable functionality to a class prototype via `Object.assign(Class.prototype, mixin)` without inheritance. Mixins can compose other mixins.
- **Use when:** Sharing behavior across unrelated classes without deep inheritance hierarchies.
- **Review:** Flag `Object.assign` on prototypes (pollution risk). In React, prefer Hooks over mixins.
### Module
- **Does:** ES2015 `import`/`export` for encapsulation. Unexported values are private. Supports named exports, default exports, namespace `* as`, and `as` aliasing.
- **Use when:** Always -- the standard code organization unit. Enables tree shaking and scope isolation.
- **Review:** Named exports preferred over default for tree-shaking. Flag `import *`. Flag missing `export` on shared utils.
### Observer
- **Does:** Observable keeps a subscriber list. `notify(data)` pushes events to all registered observer functions. `subscribe`/`unsubscribe` manage the list. RxJS is built on this.
- **Use when:** Async event-based data -- user interactions, real-time feeds, cross-component notifications.
- **Review:** `subscribe`/`notify`/`unsubscribe` triplet. Flag complex observers (perf risk). Ensure unsubscribe to prevent leaks.
### Prototype
- **Does:** Shares properties via JS prototype chain. ES6 class methods live on `prototype`. `Object.create(proto)` sets explicit prototype linkage.
- **Use when:** Sharing methods across many instances without duplication; inheritance via `extends`.
- **Review:** Flag direct `__proto__` manipulation -- prefer `Object.create` or `extends`.
### Proxy
- **Does:** `new Proxy(target, handler)` intercepts `get`/`set` for validation, formatting, logging. `Reflect` API keeps handler code clean.
- **Use when:** Input validation, property access control, logging/debugging, reactive systems.
- **Review:** Flag on perf-critical hot paths (overhead). Verify `set` handler returns `true`.
### Singleton
- **Does:** One instance shared globally. `Object.freeze()` protects it. In JS, a plain exported `const obj = {}` achieves the same result.
- **Use when:** Global shared state (config, counters). Considered an anti-pattern -- hurts testing, hides dependencies.
- **Review:** Flag singleton classes -- prefer frozen objects. In React, prefer Redux/Context for global state.

## 2. Performance Patterns

### Bundle Splitting
- **Does:** Splits one large bundle into multiple smaller ones. Reduces FCP/LCP time. Each bundle loads only what is needed for that entry point.
- **Use when:** Initial bundle includes code unused on first render.
- **Review:** Flag monolithic bundles. Check entry points split logically. Verify build output sizes.
### Compression
- **Does:** Gzip/Brotli compress JS over network. Brotli gives 15-25% better ratio. Static (build time) or dynamic (on-the-fly).
- **Use when:** Always for production. Brotli preferred; Gzip fallback. Combine with minification (Terser).
- **Review:** Check `Content-Encoding` headers. Verify Brotli enabled. Flag uncompressed text assets or missing minification.
### Dynamic Import
- **Does:** `import('module')` returns a Promise, loads modules on demand. Used with `React.lazy` + `Suspense` or `@loadable/component` for SSR.
- **Use when:** Components not needed at initial render -- modals, emoji pickers, below-fold features.
- **Review:** Verify `Suspense` has a `fallback`. Flag eagerly imported heavy components that are conditionally rendered.
### Import on Interaction
- **Does:** Defers loading code/data until user clicks, hovers, or interacts. Use facades (static previews) for 3P widgets like YouTube, chat, auth.
- **Use when:** Heavy 3P embeds, auth SDKs, features behind a click. Google Docs defers 500KB for share feature.
- **Review:** `import()` inside event handlers. Flag eagerly loaded chat/video/auth widgets. Suggest facades for heavy embeds.
### Import on Visibility
- **Does:** Loads modules when element scrolls into viewport via `IntersectionObserver` or `react-loadable-visibility`.
- **Use when:** Below-the-fold components, image carousels, comment sections not visible on initial load.
- **Review:** Verify placeholder/fallback prevents layout shift. Flag ATF content using visibility-based loading.
### Loading Sequence
- **Does:** Optimizes resource order: critical CSS/fonts > LCP image > 1P JS > 3P JS. Goal: FCP < LCP < FID.
- **Use when:** SSR apps, especially Next.js. Aligns resource priority with Core Web Vitals.
- **Review:** Flag: 3P sync in `<head>`, fonts without `preconnect`, unprioritized hero images, BTF images before 1P JS.
### Prefetch
- **Does:** `<link rel="prefetch">` or `/* webpackPrefetch: true */` fetches likely-needed resources during browser idle time at low priority.
- **Use when:** Subsequent-route resources, modules behind probable user interactions.
- **Review:** Flag over-prefetching (wastes bandwidth). Only prefetch high-probability resources.
### Preload
- **Does:** `<link rel="preload">` forces early high-priority fetch. Loads in parallel with main bundle.
- **Use when:** Resources needed within ~1s of render discovered late -- fonts, critical chunks, LCP images.
- **Review:** Flag overuse (delays other resources). Verify preloaded resources used on current page. Font preloads at end of `<head>`.
### PRPL
- **Does:** **P**ush critical resources, **R**ender initial route, **P**re-cache assets via service worker, **L**azy-load remaining routes. Leverages HTTP/2 server push.
- **Use when:** PWAs targeting low-end devices or poor networks. Relies on app shell architecture.
- **Review:** Verify SW caches route assets, initial route loads independently, code-split per route, HTTP/2 enabled.
### Route-Based Splitting
- **Does:** Splits bundles per route using `React.lazy` + `Suspense` in router. Each route becomes a separate chunk loaded on navigation.
- **Use when:** SPAs with multiple routes. Standard pattern with React Router and Next.js.
- **Review:** `lazy(() => import('./Route'))` in router config. Verify each route is separate chunk. Flag eager import of all pages.
### Static Import
- **Does:** `import module from 'module'` at file top. All modules added to initial bundle, executed at load time.
- **Use when:** Core dependencies needed on first render -- React, UI framework, critical components.
- **Review:** Flag static imports of heavy, conditionally used modules. Suggest dynamic import for non-critical deps.
### Third-Party Scripts
- **Does:** 3P scripts (analytics, ads, chat, A/B tests) can block rendering. Use `async`/`defer`, facades, lazy-loading, self-hosting, service workers.
- **Use when:** Any page with 3P. Next.js `Script`: `beforeInteractive`/`afterInteractive`/`lazyOnload`.
- **Review:** Flag: sync 3P in `<head>`, missing `async`/`defer`, GTM on every page, eager chat/video embeds. Use `preconnect` for 3P origins.
### Tree Shaking
- **Does:** Eliminates dead code from bundles. Bundlers analyze ES module `import`/`export` to exclude unused exports. Side-effect modules may block shaking.
- **Use when:** Always. Requires ES module syntax. Set `"sideEffects": false` in package.json when safe.
- **Review:** Flag: `import *`, CommonJS `require()` (not shakeable), packages without ESM builds. Check `sideEffects` field.
### Virtual Lists
- **Does:** Renders only visible rows/cells in a scrollable viewport (windowing). `react-window` (6KB) preferred over `react-virtualized` (35KB). CSS `content-visibility` is a platform alternative.
- **Use when:** Lists or grids with 1000+ items. Prevents rendering thousands of DOM nodes.
- **Review:** Flag rendering large arrays without virtualization. Look for `FixedSizeList`/`VariableSizeList`. Verify sizing props.
### View Transitions
- **Does:** `document.startViewTransition(callback)` captures DOM screenshot, runs callback to update state, animates between old/new via CSS pseudo-elements. Chrome 111+.
- **Use when:** Page navigations, expand/collapse content, any visual DOM state change. Progressive enhancement.
- **Review:** Verify feature detection (`if (document.startViewTransition)`). Flag missing fallback for unsupported browsers.

## 3. Reviewer Quick-Decision Guide

| Code Smell | Recommended Pattern(s) |
|---|---|
| Single massive JS bundle (>500KB) | Bundle Splitting + Route-Based Splitting + Tree Shaking |
| Heavy component imported but conditionally rendered | Dynamic Import + Import on Interaction |
| Large list rendering all DOM nodes (1000+ items) | Virtual Lists (react-window) |
| 3P script in `<head>` without `async`/`defer` | Third-Party Scripts (add `defer`) + Loading Sequence |
| YouTube/chat embed loaded eagerly | Import on Interaction (facade) + Import on Visibility |
| No compression on text assets | Compression (Brotli + Gzip fallback) |
| `import *` or CommonJS `require` in modern codebase | Tree Shaking (named ES module imports) |
| Hero image loads after JavaScript | Loading Sequence + Preload |
| Next-page resources not cached or prepared | Prefetch + PRPL (service worker pre-caching) |
| Global mutable state via singleton class | Frozen object or React Context/Redux |
| Many similar objects with duplicated intrinsic data | Flyweight (shared cache) + Prototype (shared methods) |
| Complex many-to-many component communication | Mediator or Observer |
| Shared behavior via deep inheritance chains | Mixin (`Object.assign`) or React Hooks |
| No validation on object property access/mutation | Proxy (`get`/`set` traps) |
| Layout shift on lazy-loaded below-fold content | Import on Visibility (fixed-size placeholder) |
| Missing `Suspense` fallback on lazy components | Dynamic Import (wrap with `<Suspense fallback>`) |
| Font/CSS from 3P origin without early connection | Loading Sequence + `preconnect` resource hint |
| Unused exports shipped in production bundle | Tree Shaking + `sideEffects: false` in package.json |
