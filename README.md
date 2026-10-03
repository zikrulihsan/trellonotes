# TrelloNotes

A Trello-style board whose cards open into full-page free-writing notes. Soft gray scrollable lists, white cards, purple accents, and a charcoal sidebar frame the board; Tiptap powers the spacious writing editor.

## Stack

- **Vite + TypeScript** — development server, bundling, and strict type checking.
- **React 19** — function components and feature-based composition.
- **React Router** — board and note routes using `HashRouter`, suitable for static hosting.
- **React Context + useReducer** — typed workspace actions, shared UI state, and predictable updates.
- **Supabase Auth + Postgres** — email magic-link sign-in and per-user workspace synchronization protected by row-level security.
- **Tiptap** — rich text, headings, lists, links, quotes, undo, and redo.
- **CSS + Lucide** — feature styles and accessible icon controls.
- **Vitest + Testing Library** — reducer, persistence, context, and writing-helper tests.
- **ESLint + Prettier** — code quality and consistent formatting.

## Get started

Use Node 22 LTS (`nvm use`) and npm. Node 20.19+ is also supported.

```sh
npm ci
```

For cloud sync, copy `.env.example` to `.env.local` and add the SweGrowth project's URL and publishable key. The app can still run without these values using browser storage only.

In Supabase Auth settings, allow the local callback URLs `http://localhost:5173/**` and `http://127.0.0.1:5173/**`. Add the deployed app origin there when publishing. Magic-link emails return to the app origin.

```sh
npm run dev
```

```sh
npm run check         # Type checking, lint, tests, and production build
npm run format:check  # Check formatting
npm run format       # Format source
npm run test:watch    # Watch tests
npm run preview      # Preview a production build
```

## Architecture

```text
src/
  app/                  # App routes and provider composition
  context/              # Workspace and UI providers; separate context definitions
  features/
    boards/             # Board page, columns, note cards, and drag interactions
    editor/             # Writing page, toolbar, note options, and link dialog
    workspace/          # Types, factories, reducer, seed data, and workspace dialogs
  components/
    layout/             # App shell, sidebar, and topbar
    ui/                 # Reusable buttons, dialogs, and dropdowns
  hooks/                # Context access, responsive state, focus, and dropdown hooks
  lib/                  # Storage validation, text, links, and metadata utilities
  integrations/         # Optional browser agent actions
  styles/               # Global, shared, layout, board, and editor styles
  test/                 # Test setup
  main.tsx              # Small application bootstrap
```

Workspace components call `useWorkspaceActions()` instead of modifying storage or arrays themselves. Actions go through `workspaceReducer`; `WorkspaceProvider` saves the result using the storage adapter. State and actions have separate contexts, and temporary menu or editor state stays in the relevant feature.

The reducer rejects cross-board moves and orphan notes, prevents deletion of the last board, cascades board/list deletion to their notes, and changes a note’s writing timestamp only when its title or content changes. Labels and card movement preserve the writing timestamp.

## Routes

- `#/board/:boardId` — a board with lists and cards.
- `#/card/:noteId` — the full writing editor.

The editor is lazy-loaded. Browser back/forward works without server route configuration.

## Saving and existing notes

The workspace is saved in `localStorage` under the existing `folio.workspace.v1` key, so this refactor preserves notes already saved by the previous app. After signing in, the app loads the account's workspace from Supabase. If no cloud workspace exists yet, the current browser workspace is uploaded on first sync. The persisted `cards` field is retained for compatibility; the TypeScript domain calls each item a `Note`.

Cloud data uses the dedicated `public.trellonotes_workspaces` table. RLS restricts each row to its authenticated owner; the migration is in `supabase/migrations`. Local browser storage remains a fallback copy. Cloud sync failures are shown while editing remains available.

## Background asset

`public/images/highland-board.png` is an original image generated with the built-in image_gen tool. Prompt: Photorealistic wide Icelandic highland panorama with rugged ochre/brown rhyolite ridges, narrow valleys, scattered snow and glacial ice, and soft overcast gray sky; landscape fills the lower 85% of the image. Muted natural brown, gold, charcoal, gray, and white. No people, buildings, UI, text, logos, or watermark.

## CI

The ready-to-enable workflow is in `docs/ci.yml`. Move it to `.github/workflows/ci.yml` using a GitHub login with workflow write permission to enable automated checks on pushes and pull requests. It installs from the lockfile and runs type checking, lint, tests, a production build, and a formatting check. The current publishing login cannot write workflow files; all checks were run locally. Dependencies and generated build output are excluded from Git.
