# Blinko Offline Client (PWA + Android)

An offline-first mobile/web client for [Blinko](https://github.com/blinkospace/blinko) — the open-source, self-hosted, AI-powered note app. Capture fleeting thoughts and permanent notes instantly on your phone or desktop, even with no connection, and auto-sync them to your own Blinko server when you're back online. Vibe-coded of course)

## Features

- **Offline-first** — notes live in IndexedDB; every create/edit/delete works without network.
- **Auto-sync engine** — an Outbox queue pushes local changes (`upsert` / trash / restore / delete) and pulls remote notes with last-write-wins conflict handling.
- **Real Blinko OpenAPI** — talks to `POST /api/v1/note/list`, `/api/v1/note/upsert`, `/api/v1/note/batch-trash`, `/api/v1/note/batch-update`, `/api/v1/note/batch-delete`, `GET /api/v1/tags/list` with `Bearer` token auth. Server responses (numeric ids, `isRecycle`/`isTop`, object tags) are normalized to the local model.
- **Server-side proxy** (`POST /api/blinko/proxy`) to bypass browser CORS / mixed-content when the Blinko instance is plain HTTP. On Android (Capacitor, no local proxy) the client falls back to direct fetch automatically.
- **PWA** — installable (WebAPK on Android Chrome, Add-to-Home-Screen on iOS), offline asset caching via Workbox.
- **Android APK via Capacitor 8** — built by GitHub Actions, versioned releases (see below).
- **Tags, search, filters** (all / blinko / note / pinned / archived / trash), markdown + checklists, pin/archive/trash, JSON backup export, voice capture (Web Speech API).

## Project structure

```
.
├── src/                    # React + Tailwind PWA
│   ├── components/         # Header, Sidebar, CaptureInput, NoteCard, ...
│   ├── lib/
│   │   ├── blinkoClient.ts   # Blinko OpenAPI client + normalization
│   │   ├── syncEngine.ts     # Outbox queue + push/pull sync
│   │   ├── attachmentStore.ts# IndexedDB blob store for offline files
│   │   ├── db.ts             # IndexedDB (notes, queue, config)
│   │   └── version.ts        # APP_VERSION (injected from package.json)
│   └── index.css           # Official-Blinko design tokens (:root / .dark)
├── server.ts               # Express host: mock API + /api/blinko/proxy + Vite/dist
├── android/                # Capacitor Android shell (version via env)
├── .github/workflows/     # CI: typecheck + versioned APK build + GitHub Release
└── dist/                   # Production web build (git-ignored)
```

## Run locally (browser / Vite)

Prerequisites: Node.js 20+ (or Bun), a running Blinko instance (default `http://localhost:1111`, e.g. any Docker deploy of blinkospace/blinko).

```bash
npm install
npm run dev      # tsx server.ts + Vite middleware -> http://localhost:3000
```

Then open the app, click the gear icon → Settings:

1. Uncheck **Demo Mode**.
2. **Server URL**: Blinko root, e.g. `http://192.168.x.x:1111` (no trailing `/api`).
3. **Open API token**: from Blinko web → Settings → Open API / Access Token.
4. Keep **Use Server-Side Proxy** ON in the browser (avoids CORS/mixed-content).
5. **Test Connection** should report the real note count, then **Force Sync Now**.

> Plain `npx vite` has no `/api/blinko/proxy` (it lives in `server.ts`). Either run `npm run dev`, or turn the proxy OFF and serve both over the same scheme/host.

Other scripts: `npm run build` (PWA to `dist/`), `npm run preview`, `npm run lint`.

## Android APK

### Locally

```bash
npm run mobile:build   # vite build + cap sync android
cd android && ./gradlew assembleDebug
```

## Versioning

Single source of truth: **`version` in `package.json`** (currently `0.1.0`).

- Web/PWA: `vite.config.ts` injects it as `__APP_VERSION__`; `src/lib/version.ts` exports `APP_VERSION`, shown in Settings → About with a "Check for updates" link to Releases.
- Android: `android/app/build.gradle` reads `VERSION_CODE`/`VERSION_NAME` from the environment (CI sets `VERSION_NAME` from the git tag or `package.json`, and `VERSION_CODE` from the ever-increasing `GITHUB_RUN_NUMBER` so updates always install).
- Release flow: bump `package.json` → commit → `git tag vX.Y.Z` → push tag → CI builds + releases.

## Sync / API notes

- List requests send server-valid defaults (`type: -1` = all, `isArchived: false`, `isRecycle: false`); the local tag filter uses tag *names*, so `tagId` is omitted (server ids are numeric).
- Upserts send numeric `id` only when the note already exists server-side; client ids (`note-…`, `seed-…`) are omitted on create. Tags are re-derived server-side from `#hashtags`.
- Restore uses `batch-update { isRecycle: false }`; `batch-trash` takes `{ids}` with no flags.
- A `Test Connection` that reports success with **0 notes** while the server has notes means the client hit the SPA fallback (HTML instead of JSON) — check the Server URL/port.

## License

GPL-3.0 — same as the upstream [blinkospace/blinko](https://github.com/blinkospace/blinko) project.
