# Todo List App

**Author:** pri
**Updated:** 2026.02.21

## The Problem

Users need a simple way to track daily tasks and stay organized. Existing solutions are bloated with features, slow to load, and require accounts. Users want something lightweight that just works.

## Target Use Cases

- As a user, I want to add a task so I can remember what I need to do.
- As a user, I want to mark a task as done so I can track my progress.
- As a user, I want to delete a task so I can remove items I no longer need.
- As a user, I want to see all my tasks so I have an overview of what's pending.

## Proposed Solution

A minimal React + TypeScript todo list app with local state. No backend, no auth — just a clean UI for managing tasks.

## Goals

- Fast and lightweight
- Intuitive UI with zero learning curve
- Works immediately without setup or accounts

## Out-of-Scope

- Persistence (localStorage, database)
- User authentication
- Categories or tags
- Due dates or reminders

## Requirements

### [P0] Project setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Configure ESLint and basic project structure
- [ ] Add Tailwind CSS for styling

### [P1] Add and display tasks
- [x] User can type a task and press Enter or click a button to add it
- [x] Tasks appear in a list below the input
- [x] Empty input should not create a task

### [P2] Complete and delete tasks
- [ ] User can click a checkbox to mark a task as done
- [ ] Completed tasks show with strikethrough styling
- [ ] User can click a delete button to remove a task
