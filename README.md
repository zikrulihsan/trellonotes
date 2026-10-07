# TrelloNotes

A Trello-style board whose cards open into full-page free-writing notes. Soft gray scrollable lists, white cards, purple accents, and a charcoal sidebar frame the board; Tiptap powers the spacious writing editor.

## Stack

- **Vite + TypeScript** — development server, bundling, and strict type checking.
- **React 19** — function components and feature-based composition.
- **React Router** — board and note routes using `HashRouter`, suitable for static hosting.
- **React Context + useReducer** — typed workspace actions, shared UI state, and predictable updates.
- **Supabase Auth + Postgres** — Google sign-in and per-user workspace synchronization protected by row-level security.
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

To enable Google sign-in, create a Google OAuth client of type **Web application**. Add `http://localhost:5173` and `http://127.0.0.1:5173` as authorized JavaScript origins, and add `https://vqtzmhfnyaujkbczibwu.supabase.co/auth/v1/callback` as its authorized redirect URI. Enter that client ID and secret in the SweGrowth project's **Authentication → Sign In / Providers → Google** settings. In **Authentication → URL Configuration**, allow `http://localhost:5173/**` and `http://127.0.0.1:5173/**`; add the deployed app origin before publishing.

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

## Telegram

Messages sent to a Telegram bot can become notes. The first line is the note's title and the rest is its body; notes land in the list chosen under **Telegram** in the sidebar (by default the first list of the first board). The bot only answers private chats.

The bot is a Netlify function, `netlify/functions/telegram.ts`, served at `/api/telegram`. Chat links live in `public.trellonotes_telegram_links` (migration in `supabase/migrations`). In the app, **Telegram → Connect Telegram** makes a one-time code valid for 15 minutes; opening the bot with it (`/start <code>`) links that chat to the account. `/where` shows where notes go and `/stop` unlinks the chat.

To set it up:

1. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`) and keep its token.
2. Apply the migration to the Supabase project.
3. In Netlify **Site configuration → Environment variables**, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (any long random string), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase **Project Settings → API Keys**, the secret key; never expose it to the browser), and `VITE_TELEGRAM_BOT_USERNAME` (the bot's username, for the "Open in Telegram" link). Redeploy.
4. Point the bot at the function once:

```sh
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d url=https://<your-site>/api/telegram \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET> \
  -d 'allowed_updates=["message"]'
```

The function adds a note with the same `updated_at` check the app uses, so an open app merges the new note in on its next sync (it also refetches when the window regains focus).

## Background asset

`public/images/highland-board.png` is an original image generated with the built-in image_gen tool. Prompt: Photorealistic wide Icelandic highland panorama with rugged ochre/brown rhyolite ridges, narrow valleys, scattered snow and glacial ice, and soft overcast gray sky; landscape fills the lower 85% of the image. Muted natural brown, gold, charcoal, gray, and white. No people, buildings, UI, text, logos, or watermark.

## CI

The ready-to-enable workflow is in `docs/ci.yml`. Move it to `.github/workflows/ci.yml` using a GitHub login with workflow write permission to enable automated checks on pushes and pull requests. It installs from the lockfile and runs type checking, lint, tests, a production build, and a formatting check. The current publishing login cannot write workflow files; all checks were run locally. Dependencies and generated build output are excluded from Git.
