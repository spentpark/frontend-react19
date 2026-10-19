# DEEPSEEK.md

Instructional context for AI agents working in this repository.

## Project Overview

`frontend-react` is a **React 19 + TypeScript + Vite** single-page application (SPA) that
consumes a **Game REST API**. It lets users browse a paginated list of games, filter them
by platform through a hamburger side menu, search games by title, and open a detail view
with metadata, YouTube videos and a Spotify soundtrack embed.

The repository is a real deployment project (not just a scaffold): it ships a multi-stage
`Dockerfile`, an Nginx config, and a full Jenkins CI/CD pipeline that publishes build
artifacts to a Nexus repository and reports coverage to SonarQube. The stock Vite
`README.md` is a leftover template and does **not** describe this application.

### Tech Stack

| Area | Technology |
| --- | --- |
| UI library | React 19.3 (`react`, `react-dom`) |
| Routing | `react-router-dom` v7 (`BrowserRouter` + nested `Route`/`Outlet`) |
| HTTP client | `axios` (single shared instance) |
| Build tool | Vite 8 (`@vitejs/plugin-react` 6, Rolldown-based bundler) |
| Language | TypeScript 5.9, strict mode, `verbatimModuleSyntax` |
| Testing | Vitest 5 + jsdom 30 + `@testing-library/react` + `@testing-library/jest-dom` 7 |
| Coverage | `@vitest/coverage-v8` (text, lcov, html) |
| Lint | ESLint 10 flat config + `typescript-eslint` + react-hooks + react-refresh |
| Formatting | Prettier 3 + `eslint-config-prettier` (no conflicting rules) |
| Serving | Nginx (Alpine), port `8065` |
| Runtime | Node.js 22.12+ (Node 24 used locally, in Docker and in Jenkins) |

## Repository Structure

```
frontend-react19/
├── index.html                  # Vite entry HTML (mounts /src/main.tsx into #root)
├── vite.config.ts              # Vite + Vitest config (jsdom, globals, setup, coverage, manualChunks)
├── eslint.config.js            # ESLint flat config
├── .prettierrc.json            # Prettier config (no semicolons, double quotes, 100 cols)
├── .prettierignore             # node_modules, dist, coverage, package-lock.json, *.md
├── tsconfig.json               # Solution file -> references app + node configs
├── tsconfig.app.json           # App compiler options (strict, bundler resolution)
├── tsconfig.node.json          # Config for build tooling
├── Dockerfile                  # 2-stage build: node:24-alpine -> nginx:alpine
├── nginx.conf                  # SPA fallback (try_files ... /index.html) on :8065
├── Jenkinsfile                 # CI/CD pipeline (test, build, SonarQube, Nexus)
├── .env                        # Local environment variables (VITE_API_URL)
└── src/
    ├── main.tsx                # React root, StrictMode, onUncaughtError, imports ./index.css
    ├── App.tsx                 # Router only: Layout route + Home + lazy GameDetail
    ├── App.css / index.css     # Global styles and component classes
    ├── vite-env.d.ts           # Types VITE_API_URL on import.meta.env
    ├── components/
    │   ├── Layout.tsx          # Header + <main> + footer, ErrorBoundary + Suspense around <Outlet/>
    │   ├── ErrorBoundary.tsx   # Class boundary that catches render errors
    │   ├── GameDetail.tsx      # Route /game/:id detail view + paginated reviews (lazy-loaded)
    │   ├── VideoEmbed.tsx      # Click-to-load YouTube facade
    │   ├── HamburgerMenu.tsx   # Platform drawer (CSS classes, Escape, inert)
    │   └── __tests__/          # All component, page, service and http tests
    ├── pages/
    │   └── Home.tsx            # List, debounced search, pagination, error/empty states
    ├── config/
    │   └── environment.ts      # Exposes VITE_API_URL
    ├── services/
    │   ├── http.ts             # Shared axios instance + isCanceledError / isNotFoundError
    │   ├── gameService.ts      # getGames, searchGames, getGameById
    │   ├── platformService.ts  # getPlatforms
    │   └── reviewService.ts    # getReviewsByGame (reseñas paginadas de 10 en 10)
    └── test/
        └── setup.ts            # Imports @testing-library/jest-dom/vitest
```

## Building and Running

Requires **Node.js 22.12+**. Vitest 5 dropped Node 20 support
(`^22.12.0 || ^24.0.0 || >=26.0.0`), so Node 24 is what the Dockerfile, the Jenkins
pipeline and the local environment use. Install dependencies once:

```bash
npm install
```

A `.env` file at the repository root must define the backend endpoint, otherwise
`environment.apiUrl` is `undefined` and every request fails:

```
VITE_API_URL=http://<backend-host>:<port>
```

Key commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and produce the production bundle in `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Run ESLint over the project |
| `npm run format` | Rewrite `src/**` and root configs with Prettier |
| `npm run format:check` | Verify formatting without writing (CI-friendly) |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run the test suite once (CI mode) |
| `npm run test:coverage` | Run tests and emit `coverage/` (text, lcov, html) |
| `npm run test:ui` | Open the Vitest UI (`@vitest/ui`) |

### Container / Deployment

```bash
docker build -t frontend-react .
docker run -p 8065:8065 frontend-react
```

The image builds with `node:24-alpine` and serves the static bundle from
`nginx:alpine` on port **8065**. `nginx.conf` rewrites unknown paths to
`/index.html` so client-side routes (e.g. `/game/42`) work on refresh.

### CI/CD (Jenkinsfile)

The pipeline runs, in order: `npm install --legacy-peer-deps` → `npm run test:coverage`
→ `npm run build` → SonarQube scan (sources `src`, LCOV from `coverage/lcov.info`,
tests excluded from analysis) → tars `dist/` into `frontend.tar.gz` → uploads the
artifact to Nexus (`raw-releases`, `${APP_NAME}/${APP_VERSION}/`). SonarQube and Nexus
credentials come from Jenkins credential IDs (`sonar-token`, `nexus`) — never hardcode
tokens or credentials in source or in this file. The pipeline requests the `node24`
tool from Jenkins.

## Development Conventions

**Language and formatting**
- No semicolons; **double quotes**; 2-space indentation; arrow-function components.
- Comments are written in **Spanish** and often use banner separators, e.g.
  `/* ================= GAMES ================= */`. Keep this style when editing existing files.
- UI copy is in English.
- Formatting is enforced by Prettier (`.prettierrc.json` mirrors the rules above:
  `semi: false`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "none"`).
  Run `npm run format` after editing, and keep `npm run format:check` green.
  `eslint-config-prettier` is the last entry in the flat config so ESLint and Prettier
  never disagree on style.

**Architecture**
- `App.tsx` is **router-only**: it declares the `Layout` route (with `Home` at `/` and a
  lazily imported `GameDetail` at `/game/:id`) and nothing else. Page-level logic lives in
  `src/pages/`, reusable UI in `src/components/`.
- `Layout.tsx` owns the global header/footer and wraps `<Outlet />` in `ErrorBoundary` +
  `Suspense`, so navigation chrome survives both render errors and lazy-chunk loading.
- Data access is isolated in `src/services/*`. Components must call services, never `axios` directly.
- All requests go through the shared `http` instance in `src/services/http.ts`, which sets
  `baseURL` from `environment.apiUrl` and JSON headers.
- Environment values are read only via `import.meta.env` inside `src/config/environment.ts`,
  typed in `src/vite-env.d.ts`.
- The platform filter is **URL state**: `Home` reads `?platform=<description>` via
  `useSearchParams` (falling back to `"Sony Playstation 4"`) and `HamburgerMenu` links to
  `/?platform=<encoded description>`. Keep the filter in the URL so links stay shareable.
- Changing the platform resets pagination to page 1 using React's documented
  "adjust state during render" pattern (comparing a `previousPlatform` state value), which
  avoids an extra request with the stale page.

**Data fetching**
- Every service function accepts an optional trailing `signal?: AbortSignal` and forwards it
  to axios. Components create an `AbortController` inside `useEffect` and call
  `controller.abort()` in the cleanup so in-flight requests are cancelled when filters change
  or the component unmounts.
- Swallow cancellations with `isCanceledError(err)` from `src/services/http.ts`; never render
  them as user-facing errors.
- Guard against late state updates with `if (!controller.signal.aborted)` before
  `setLoading(false)` in the `finally` block.
- Search input is debounced (`SEARCH_DEBOUNCE_MS = 350` in `Home.tsx`); the debounce sets the
  committed `searchTerm` and resets the page. The submit button commits immediately.

**Typing**
- `tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters` and
  `verbatimModuleSyntax` — type-only imports must use `import type { ... }`.
- Response/domain interfaces (`Game`, `GameDetail`, `Pagination`, `ApiResponse`, `Platform`)
  are declared and exported **only** next to the service that returns them — never redeclare
  them in components. Note the API's inconsistent PascalCase/camelCase/snake_case field names
  (`image_Large`, `Platform`, `spotify_ost`) — preserve them exactly as the backend returns them.
- Avoid `any` and type casts in new code. Test doubles that need a partial axios response use
  `as unknown as AxiosResponse<T>` instead of `as any`.
- **TypeScript is intentionally pinned to 5.9.x.** TypeScript 7 is the current `latest` but
  `typescript-eslint` (8.71.x) still declares a peer range of `>=4.8.4 <6.1.0`, so bumping
  TypeScript breaks the ESLint toolchain. Do not raise it until `typescript-eslint` supports it.

**Styling**
- Plain CSS with semantic class names (`game-list`, `styled-table`, `pagination`, `spinner`,
  `video-container`, `game-detail-container`, `meta-label`, `section-title`) in
  `App.css` / `index.css`. No CSS framework and **no inline styles** in components.
- `.sr-only` provides visually-hidden labels (search input, table caption).
- Heading hierarchy is `h1` per page (`.title` in `Home`, `.game-info h1` in `GameDetail`)
  with `h2` for every section, so no levels are skipped.

**Accessibility**
- The hamburger button exposes `aria-expanded` / `aria-controls`; the drawer is a `<nav>`
  marked `inert` while closed (React 19 supports the boolean `inert` prop) and closes on
  Escape. The overlay is a real `<button>` with an `aria-label`.
- Every `iframe` needs a unique, descriptive `title` (e.g. `` `${game.title} - ${label}` ``).
- Heavy third-party embeds (YouTube) are click-to-load facades via `VideoEmbed`; images use
  `loading="lazy"` and `decoding="async"`.

**Testing**
- Tests live in `src/components/__tests__/` and use the `*.test.ts(x)` suffix; Vitest globals
  are enabled, though files still import `describe/it/expect/vi` explicitly.
- Mock at the module boundary: `vi.mock("../../services/gameService")` for components and
  `vi.mock("../../services/http")` for services; reset state with `vi.clearAllMocks()` in `beforeEach`.
- Query by user-visible text/placeholder (`findByText`, `findByPlaceholderText`) and use
  `waitFor` for async assertions. Assert forwarded signals with `expect.any(AbortSignal)`.
- `App.test.tsx` renders the real `<App />` (BrowserRouter), so it resets the URL with
  `window.history.pushState({}, "", "/")` in `beforeEach` to avoid leaking `?platform=` between tests.
- `src/test/setup.ts` must import `"@testing-library/jest-dom/vitest"` (not the bare
  `"@testing-library/jest-dom"`): only the `/vitest` entrypoint augments Vitest's
  `Assertion` interface, so the bare import makes `tsc -b` fail on matchers such as
  `toBeInTheDocument`.
- Every new feature or bug fix must add or update a test, and `npm run test:coverage` must stay green.
- `npm run test:run` takes ~20s and the default reporter prints nothing until it finishes
  when there is no TTY — that is not a hang. Most of the time goes to creating the jsdom
  environment per file.

## Backend API Contract

Base URL: `VITE_API_URL`.

| Method | Endpoint | Params | Returns |
| --- | --- | --- | --- |
| GET | `/games` | `platform`, `page`, `limit` | `ApiResponse` (`{ data: Game[], pagination }`) |
| GET | `/games/search` | `title`, `page`, `limit` | `ApiResponse` |
| GET | `/games/:id` | — | `GameDetail` |
| GET | `/platforms` | `limit` | `Platform[]` (desenvuelve `{ data, pagination }`) |
| GET | `/reviews/:id` | `page`, `limit` | `ReviewsResponse` (`{ data: Review[], pagination }`) |

All of them are called with an optional `AbortSignal` as described in *Data fetching*.

## Gotchas

- `coverage/` is generated output and **is tracked in git**; regenerate it, never hand-edit it.
  It is listed in `globalIgnores` in `eslint.config.js` and in `.prettierignore`, so it no
  longer pollutes `npm run lint` or `npm run format`.
- `eslint-plugin-jsx-a11y` (6.10.2) and `eslint-plugin-react` (7.37.5) only declare peer
  support up to ESLint 9, so they are deliberately **not** installed alongside ESLint 10.
  Revisit when they widen their peer range.
- `eslint.config.js` sets `ecmaVersion: 2022`; class fields (used by `ErrorBoundary`) fail to
  parse under the previous `2020` value.
- The `react-hooks` v7 preset enables `react-hooks/set-state-in-effect`, which flags
  **synchronous** `setState` calls in an effect body. Keep such calls inside an async function
  or, better, derive the value and return early before the effect (see `GameDetail`'s `!id` guard).
- `vite.config.ts` uses the **function** form of `rollupOptions.output.manualChunks`; this
  bundler version no longer types the object (`{ "chunk": [...] }`) form. The current split
  produces `react-vendor` (~259 kB / 82 kB gzip), `http-vendor` (~50 kB), the app chunk
  (~8 kB) and a separate lazy `GameDetail` chunk (~4 kB).
- `@testing-library/jest-dom` 7 requires the `/vitest` entrypoint in `src/test/setup.ts`.
