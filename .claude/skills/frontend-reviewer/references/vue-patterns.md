# Vue Patterns Reference

Condensed from [patterns.dev/vue](https://www.patterns.dev/vue/) -- 12 source files.

---

## 1. Component Patterns

| Pattern | What It Does | When to Use | Reviewer Signals |
|---|---|---|---|
| **Components (SFCs)** | Couple HTML, JS, and CSS in a single `.vue` file. Use `ref()` for primitives and `reactive()` for objects to create reactive state. Props pass data parent-to-child. | Always -- the fundamental building block. Extract when a piece is reused or complex enough on its own. | Look for overly large templates that should be split. Verify props are declared, not mutated in children. Check `ref` vs `reactive` usage (primitives vs objects). |
| **Async Components** | Wrap with `defineAsyncComponent()` + dynamic `import()` so the bundle loads only when needed. Supports `loadingComponent`, `errorComponent`, `delay`, and `timeout` options. | Component has a large bundle and is not needed on initial render (modals, dialogs, heavy widgets). | Confirm loading/error UI is provided. Verify component is conditionally rendered (`v-if`); otherwise async adds complexity for no gain. Watch for missing `timeout`. |
| **Dynamic Components** | Use `<component :is="tabs[currentTab]">` to switch between components at runtime. Wrap with `<KeepAlive>` to preserve state across switches. | Tab interfaces, multi-step forms, or any UI toggling between a known set of views without routing. | Ensure `:is` references component definitions, not just strings. Check if `<KeepAlive>` is needed for stateful children. Verify unused components are not imported. |
| **Script Setup** | `<script setup>` is compile-time sugar for Composition API. No `return`, no `components` registration, auto-exposed top-level bindings. Use `defineProps()` and `defineEmits()`. | Recommended default for all SFC + Composition API components. | Flag Options API or bare `setup()` -- prefer `<script setup>`. Verify `defineProps`/`defineEmits` are used. Check TS type-only props use `withDefaults()` for defaults. |

**Key APIs:** `defineAsyncComponent({ loader, loadingComponent, errorComponent })` -- `<component :is="tabs[current]">` -- `<KeepAlive>` -- `defineProps<{ text: string }>()` -- `defineEmits<{ (e: 'close'): void }>()`

---

## 2. Design Patterns

| Pattern | What It Does | When to Use | Reviewer Signals |
|---|---|---|---|
| **Composables** | Extract reusable stateful logic into `use*()` functions using the Composition API (`ref`, `onMounted`, lifecycle hooks). Return reactive state and methods. | Whenever logic is shared across components or a component's script grows complex. Preferred over mixins, renderless components, and data providers. | Naming must start with `use`. Verify cleanup (`onBeforeUnmount` removes listeners). Check returned refs are not unwrapped prematurely. Ensure composables do not rely on template context. |
| **Container-Presentational** | Container components fetch data and manage state. Presentational components receive data via props and only render UI. | Legacy codebases or when strict separation of data-fetching from rendering is desired. | Generally superseded by composables. Verify presentational components are stateless, containers hold no styles. Suggest composable refactor when container wraps a single child. |
| **Data Provider** | A renderless component that fetches data and exposes it via scoped slots: `<slot :data="data" :loading="loading">`. Parent controls rendering with `v-slot`. | Reusable data-fetching with different UI per consumer, when composables are not an option. | Prefer composables (avoids extra component instances). If used, verify slot exposes data + loading/error state. Check for duplicate fetch calls with multiple instances. |
| **Provide / Inject** | `provide('key', value)` in an ancestor makes data available to any descendant via `inject('key')`. Avoids prop-drilling through intermediate components. | App-wide data: theme, locale, auth, feature flags. Plugin development. Can also be set at app level: `app.provide()`. | Ensure keys use Symbols or unique strings. Overuse makes debugging harder than props. Verify reactive values are provided. Flag `inject()` without a default value. |
| **Renderless Components** | Components with only `<slot>` in their template; expose state/methods through scoped slots. Parent renders all UI. | Same behavior drives multiple visual representations (e.g., toggle logic powering switch, button, and tab UIs). | Vue docs recommend composables over renderless components for performance. Verify `<slot>` passes all needed props. Check parent uses `v-slot` destructuring correctly. |

**Key APIs:** `export function useCounter() { const c = ref(0); return { c } }` -- `provide('key', ref(val))` / `inject('key', default)` -- Renderless: `<slot :data="data" :toggle="toggle">`

---

## 3. State & Rendering

| Pattern | What It Does | When to Use | Reviewer Signals |
|---|---|---|---|
| **State Management** | Props flow down, custom events (`$emit`) flow up. For cross-component state: simple reactive store with `reactive({})` or Pinia (`defineStore`). Pinia adds devtools, plugins, TypeScript, and SSR support. | Props/events for parent-child. `reactive()` store for small apps. Pinia for medium-to-large apps. | Verify mutations happen inside store actions only. Pinia stores should use Composition API syntax. Flag direct state mutation from templates. Ensure events are declared with `defineEmits()`. |
| **Render Functions** | Use `h(tag, attrs, children)` (hyperscript) or JSX to build templates programmatically. Functional components are stateless plain functions that return vnodes. | Only when `<template>` cannot express the needed dynamic logic (heavily conditional DOM, component generators). | Templates should be the default -- flag render functions without justification. If JSX, verify `babel-plugin-jsx` is configured. Functional components must not use reactive state. |

**Key APIs:** `reactive({ state, methods })` -- `defineStore('id', () => { const s = ref([]); return { s } })` -- `h(tag, attrs, children)`

---

## Pattern Relationships

```
Composables  ── preferred over ──>  Renderless Components  (fewer instances)
Composables  ── preferred over ──>  Data Provider pattern  (no wrapper needed)
Composables  ── preferred over ──>  Container-Presentational split
<script setup>  ── replaces ──>  Options API / bare setup()
Pinia  ── replaces ──>  simple reactive() store  (at scale, adds devtools)
Provide/Inject  ── solves ──>  prop-drilling  (3+ levels deep)
Async Components  ── solves ──>  large initial bundle  (lazy load on demand)
Dynamic Components  ── solves ──>  v-if/v-else chains  (cleaner tab switching)
KeepAlive  ── solves ──>  state loss on dynamic component switch
```

**Modern Vue 3 defaults:** `<script setup>` + Composition API + composables + Pinia. Older patterns (Options API, renderless components, container-presentational) are still valid but should not be introduced into new code without justification.

---

## Reviewer Quick-Decision Guide

| I see this in a PR... | Ask / Check |
|---|---|
| Large `<template>` (>100 lines) | Should sub-components be extracted? |
| Options API or bare `setup()` in SFC | Migrate to `<script setup>` |
| `defineAsyncComponent` | Is the component conditionally rendered? Loading/error UI provided? |
| `<component :is="...">` without `<KeepAlive>` | Does the switched component hold state that should persist? |
| Duplicated reactive logic across components | Extract into a `use*()` composable |
| Renderless component or Data Provider | Can this be a composable instead? (fewer instances, better perf) |
| `provide()` / `inject()` | Truly app-wide data? Keys unique? Default set on `inject`? |
| Direct store state mutation in a template | Move mutation into a store action or method |
| `h()` or JSX render function | Is `<template>` truly insufficient? Is `babel-plugin-jsx` configured? |
| Props drilled through 3+ levels | Consider `provide/inject` or a Pinia store |
| Missing `defineEmits()` | Events must be explicitly declared for type safety |
| `ref()` wrapping an object | Use `reactive()` for objects; `ref()` for primitives |
| No `onBeforeUnmount` cleanup in a composable | Verify event listeners / subscriptions are removed |
