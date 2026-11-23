# Monthly Roadmap Frontend Overview

This document captures a high-level recap of the Monthly Roadmap UI features, tooling, and integration points for quick onboarding.

## Key Capabilities
- Authenticated access via Laravel Sanctum-compatible token workflow with login, register, and logout.
- Kanban-style board showing four consecutive months with drag-and-drop support for ordering and moving cards.
- Inline editing, status toggling, and quick-add for roadmap items backed by optimistic TanStack Query mutations.
- Tailwind CSS + shadcn/ui design system with accessible interactions and toast-driven feedback.

## Tooling Snapshot
- React + TypeScript bootstrapped through Vite with ESLint, Prettier, and Vitest integration.
- State management via TanStack Query and a persisted Zustand auth store.
- @dnd-kit handles keyboard-friendly drag-and-drop with cross-column reordering.

Refer to the in-repo implementation for complete details, including providers, feature modules, and tests that exercise the full UX flow.
