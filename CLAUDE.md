# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Build everything: `npm run compile`
- Build extension only: `npm run compile:extension`
- Build webview only: `npm run build:webview`
- Type-check webview: `npm run typecheck:webview`
- Watch extension + webview builds: `npm run watch`
- Watch extension only: `npm run watch:extension`
- Watch webview build only: `npm run watch:webview`
- Lint everything: `npm run lint`
- Lint extension only: `npm run lint:extension`
- Lint webview only: `npm run lint:webview`
- Run the existing focused test: `npm run test:dashboard-search`
- Run the compiled Node test directly: `node --test out/modules/mainView/bridges/dashboardSearchRanking.test.js`

## High-level architecture

Ampify is a VS Code extension with a single unified MainView webview. The product surface is intentionally narrowed to five capabilities:

1. Copier: copy `path:line` / `path:start-end`
2. Skills manager
3. Commands manager
4. Git Share sync
5. MainView webview shell

Visible MainView sections are fixed to:

- `dashboard`
- `skills`
- `commands`
- `gitshare`
- `settings`

`copier` remains command-driven and does not have its own section.

### Extension host vs webview

The codebase is split into two main halves:

- Extension host (`src/`): VS Code activation, command registration, filesystem access, Git operations, and view-model construction.
- Webview app (`webview/`): Vue 3 + Pinia + Vue Router + Element Plus UI rendered inside the MainView.

The build outputs are:

- Extension JS -> `out/`
- Webview bundle -> `webview-dist/mainView/`

Do not hand-edit `webview-dist/`; regenerate it from the source in `webview/`.

### Activation flow

`src/extension.ts` is the extension entrypoint. Activation order is important and currently goes:

1. MainView
2. Copier
3. Git Share
4. Skills
5. Commands

MainView is registered first because the other modules refresh or route through it.

### MainView backend architecture

MainView host-side code lives in `src/modules/mainView/` and is organized as:

- `AmpifyViewProvider.ts`: VS Code `WebviewViewProvider`
- `controller/MainViewController.ts`: orchestration layer for state, overlays, confirms, progress, and section refreshes
- `controller/MessageRouter.ts`: routes webview messages into controller methods
- `controller/SectionHandlerRegistry.ts`: maps section IDs to handlers
- `bridges/*.ts`: adapt each module into UI-friendly view models and action handlers
- `shared/contracts.ts`: shared message protocol and view-model types used by both host and webview
- `templates/htmlTemplate.ts`: webview HTML shell

When changing MainView behavior, treat `shared/contracts.ts` as the source of truth for host/webview communication. The webview imports it through the `@shared` alias defined in `webview/vite.config.ts`.

### Webview frontend architecture

The MainView frontend lives under `webview/src/`:

- `main.ts`: bootstraps Vue + Pinia + router
- `App.vue`: mounts the shell and global dialogs
- `router.ts`: uses memory history and maps the five sections to routes
- `composables/useMessageBus.ts`: receives extension messages, updates stores, and sends `appReady`
- `stores/`: app/bootstrap state, per-section data, overlays, progress state
- `sections/`: top-level route components (`DashboardSection`, `ResourceSection`, `SettingsSection`)
- `components/ResourceWorkbench.vue`: shared UI for `skills`, `commands`, and `gitshare`

The UI is data-driven: the extension host sends section view models, and the webview mostly renders them and emits typed actions back.

### Skills and commands modules

`src/modules/skills/` and `src/modules/commands/` follow similar patterns:

- `core/*ConfigManager.ts`: load and manage stored assets
- `core/*Importer.ts`: import from dialogs or dragged files/folders
- `core/*Creator.ts`: create new assets
- `core/*Applier.ts`: copy assets into the current workspace
- `core/*AiTagger.ts`: AI-based tagging workflows
- `templates/`: content templates
- `index.ts`: command registration

MainView does not own these modules’ business logic; it calls into them through bridges and VS Code commands.

### Git Share

Git Share is implemented in `src/modules/gitShare/` and `src/common/git/`.

Important behavior:

- Git Share stores data under the Ampify app root, defaulting to `~/.vscode-ampify/`
- Shared repository root is `~/.vscode-ampify/gitshare/`
- Synced content is expected in:
  - `vscodeskillsmanager/skills`
  - `vscodecmdmanager/commands`
- Git Share performs startup receive and shutdown flush logic through its lifecycle returned from `registerGitShare`
- MainView’s Git Share section is a status/configuration surface over `GitManager`

### Storage and paths

Shared path helpers live in `src/common/paths.ts`.

Key settings that affect filesystem behavior:

- `ampify.rootDir`
- `ampify.skills.injectTarget`
- `ampify.commands.injectTarget`
- `ampify.language`

Default storage root is `~/.vscode-ampify/`. Injection targets are standardized around the `.claude/` directory structure.

### Contracts and section model

The canonical section IDs and payload contracts are in `src/modules/mainView/shared/contracts.ts`.

Important patterns:

- Navigation is limited to `dashboard`, `skills`, `commands`, `gitshare`, `settings`
- Resource sections use shared structures like `TreeNode`, `CardItem`, `ToolbarAction`
- Extension/webview messages are strongly typed (`WebviewMessage`, `ExtensionMessage`)
- Dashboard search has its own typed result/action model

When adding a field to a section or message, update the shared contract first, then the host bridge/controller, then the Vue consumer.

### Linting and TypeScript setup

- Extension TypeScript is compiled by `tsc` using `tsconfig.json` into `out/`
- Webview TypeScript is checked separately with `vue-tsc -p webview/tsconfig.json --noEmit`
- ESLint ignores `out/**`, `node_modules/**`, and `webview-dist/**`
- Vue components intentionally allow single-word component names

## Repository-specific notes

- Existing repo guidance is in `AGENTS.md`; keep this file aligned with it rather than duplicating conflicting instructions.
- README and AGENTS both describe the product as a compact VS Code extension centered on the five capabilities above.
- Legacy launcher/opencode local data may exist on disk but is not used by Ampify anymore.
