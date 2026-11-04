# DEEPSEEK.md

Instructional context for AI agents working in this repository.

## Project Overview

`frontend-react` is a **React 19 + TypeScript + Vite** single-page application (SPA) that
consumes a **Game REST API**. The home screen shows a random game with its official trailer
(automatically refreshed every 200 s, with a manual refresh button), and the catalog lets
users browse a paginated list of games, filter them by platform through a hamburger side
menu, search games by title, and open a detail view with metadata, YouTube videos and a
Spotify soundtrack embed. The `/news` screen lists paginated video-game news (10 per page)
from the separate `rss-game-node` RSS service.

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
├── .env                        # Variables locales (VITE_API_URL, VITE_NEWS_API_URL y credenciales del JWT)
└── src/
    ├── main.tsx                # React root, StrictMode, onUncaughtError, imports ./index.css
    ├── App.tsx                 # Router only: Layout route + Home + Catalog + lazy GameDetail/News
    ├── App.css / index.css     # index.css: variables del tema y base; App.css: componentes
    ├── vite-env.d.ts           # Types de VITE_API_URL / VITE_NEWS_API_URL / credenciales del login
    ├── components/
    │   ├── Layout.tsx          # Header (marca, tema, menú) + contenido + footer
    │   ├── ErrorBoundary.tsx   # Class boundary that catches render errors
    │   ├── GameDetail.tsx      # Route /game/:id detail view + paginated reviews (lazy-loaded)
    │   ├── VideoEmbed.tsx      # Click-to-load YouTube facade
    │   ├── HamburgerMenu.tsx   # Sidebar derecha: Inicio/Noticias + plataformas (Escape, inert, overlay)
    │   ├── ThemeToggle.tsx     # Alterna tema claro/oscuro y lo guarda en localStorage
    │   └── __tests__/          # All component, page, service and http tests
    ├── pages/
    │   ├── Home.tsx            # `/`: random game + trailer, auto/manual refresh
    │   ├── Catalog.tsx         # `/catalog`: list, debounced search, pagination, error/empty states
    │   └── News.tsx            # `/news`: RSS news, paginated 10 per page (lazy-loaded)
    ├── config/
    │   └── environment.ts      # Expone VITE_API_URL, VITE_NEWS_API_URL y las credenciales del login
    ├── services/
    │   ├── auth.ts             # Login JWT, caché en memoria/localStorage y renovación
    │   ├── http.ts             # Instancia axios compartida + interceptor Bearer + retry 401
    │   ├── gameService.ts      # getGames, searchGames, getGameById, getRandomGame
    │   ├── platformService.ts  # getPlatforms
    │   ├── reviewService.ts    # getReviewsByGame (reseñas paginadas de 10 en 10)
    │   └── newsService.ts      # fetchNewsPage + normalización del feed RSS y formatos de fecha
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
`environment.apiUrl` is `undefined` and every request fails. The API is **backend-python**
(FastAPI) on port **7000**, with every route under `/api`:

```
VITE_API_URL=http://localhost:7000/api
VITE_NEWS_API_URL=http://localhost:3001/api
VITE_API_USERNAME=admin
VITE_API_PASSWORD=Dev-aekiu4-9mHsG
```

`VITE_NEWS_API_URL` points to the separate **rss-game-node** news backend (port **3001**),
which serves `GET /api/game-news`. `VITE_API_USERNAME`/`VITE_API_PASSWORD` are the
development credentials used to obtain the JWT from `POST /api/auth/login` (shared with
backend-node20/rss-game-node, so the same token is valid in both backends). Do not ship real
production credentials in the bundle.

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
- UI copy is mostly English; the Home (random game) screen keeps the Spanish copy inherited
  from the original Thymeleaf design ("Descubre tu próximo juego", "Otro juego al azar"...).
- Formatting is enforced by Prettier (`.prettierrc.json` mirrors the rules above:
  `semi: false`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "none"`).
  Run `npm run format` after editing, and keep `npm run format:check` green.
  `eslint-config-prettier` is the last entry in the flat config so ESLint and Prettier
  never disagree on style.

**Architecture**
- `App.tsx` is **router-only**: it declares the `Layout` route with `Home` at `/`
  (random game), `Catalog` at `/catalog` (paginated list), a lazily imported `GameDetail`
  at `/game/:id` and a lazily imported `News` at `/news`, and nothing else. Page-level logic
  lives in `src/pages/`, reusable UI in `src/components/`.
- `Layout.tsx` owns the global chrome: the `.header` (`.brand`, `ThemeToggle` and
  `HamburgerMenu`), a `.content-wrap` > `.content` column that wraps `<Outlet />` in
  `ErrorBoundary` + `Suspense`, and the footer. Pages render inside `.content` without their
  own page margins.
- Data access is isolated in `src/services/*`. Components must call services, never `axios` directly.
- All requests go through the shared `http` instance in `src/services/http.ts`, which sets
  `baseURL` from `environment.apiUrl` and JSON headers.
- **Authentication**: backend-python protects all business endpoints with a JWT HS256
  (`Authorization: Bearer <jwt>`). `src/services/auth.ts` obtains the token from
  `POST /api/auth/login`, caches it in memory + `localStorage` (`spentpark-catalog-token`)
  until one minute before expiry and deduplicates concurrent logins. The request interceptor
  in `http.ts` adds the `Bearer` to every request except the login; on a `401` it refreshes
  the token once and retries (never in a loop).
- **News backend**: `/news` consumes the separate `rss-game-node` service
  (`VITE_NEWS_API_URL`, port 3001) instead of backend-python. `newsService.fetchNewsPage`
  calls it through the shared `http` instance using an absolute URL, so the `Bearer`
  interceptor and the single `401` refresh+retry also apply; the JWT is accepted by both
  backends (same secret, `issuer` and `audience`). The RSS feed ships `description` as HTML:
  the service converts it to plain text (`stripHtml`) and the page never injects HTML
  (`dangerouslySetInnerHTML` is not used) — image URLs are extracted from the feed markup
  with `extractFirstImage`.
- Environment values are read only via `import.meta.env` inside `src/config/environment.ts`,
  typed in `src/vite-env.d.ts`.
- The platform filter is **URL state**: `Catalog` reads `?platform=<description>` via
  `useSearchParams` (falling back to `"Sony Playstation 4"`) and `HamburgerMenu` links to
  `/catalog?platform=<encoded description>` (plus an "Inicio" link to `/`). Keep the filter
  in the URL so links stay shareable.
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
- `Home` refreshes the random game every `REFRESH_MS = 200000` ms and when the "Otro juego
  al azar" button is pressed. Both paths bump a `requestId` state value consumed by the same
  `useEffect`, so the cleanup aborts the in-flight request and clears the pending timer.
- `getRandomGame` sets a 15 s axios timeout so the Home screen cannot stay in its loading
  state forever when the backend stops responding.
- Search input is debounced (`SEARCH_DEBOUNCE_MS = 350` in `Catalog.tsx`); the debounce sets
  the committed `searchTerm` and resets the page. The submit button commits immediately.

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
- Design tokens live in `src/index.css` as CSS custom properties on `:root` and
  `[data-theme="dark"]` (`--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--accent`,
  `--border`, `--input-bg`...). Components consume those variables instead of hardcoding
  colours, so both themes stay consistent.
- The SPA loads IBM Plex Sans/Mono and Font Awesome 6 from CDN `<link>`s in `index.html`; use
  `<i className="fas fa-..." aria-hidden="true">` for icons. Icon-only buttons still need an
  `aria-label` (tests and screen readers must not depend on the icon font).
- Plain CSS with semantic class names (`header`, `sidebar`, `content`, `card`, `toolbar`,
  `styled-table`, `page-head`, `hero`, `btn-primary`, `btn-pagination`,
  `game-detail-container`, `meta-label`, `section-title`, `news-list`, `news-item`,
  `news-media`, `news-status`) in `App.css`. No CSS framework and **no inline styles** in
  components.
- `.sr-only` provides visually-hidden labels (search input, table caption).
- Heading hierarchy is `h1` per page (`.page-head h1` in `Home`, `Catalog`, `GameDetail` and
  `News`) with `h2` for every section (news cards use `h2.news-title`), so no levels are
  skipped.

**Accessibility**
- The hamburger button (`aria-label="Open menu"`) exposes `aria-expanded` / `aria-controls`;
  the drawer is a right `<aside>` marked `aria-hidden` + `inert` while closed (React 19
  supports the boolean `inert` prop) and closes on Escape or overlay click. The overlay is a
  real `<button>` with an `aria-label`.
- `ThemeToggle` exposes `aria-label` ("Switch to dark/light theme") and persists the choice
  in `localStorage` under `spentpark-theme`; the inline script in `index.html` applies it
  before the first paint to avoid a theme flash.
- Every `iframe` needs a unique, descriptive `title` (e.g. `` `${game.title} - ${label}` ``).
- Heavy third-party embeds (YouTube) are click-to-load facades via `VideoEmbed`; images use
  `loading="lazy"` and `decoding="async"`.

**Testing**
- Tests live in `src/components/__tests__/` and use the `*.test.ts(x)` suffix; Vitest globals
  are enabled, though files still import `describe/it/expect/vi` explicitly.
- Mock at the module boundary: `vi.mock("../../services/gameService")` for components and
  `vi.mock("../../services/http")` for services; reset state with `vi.clearAllMocks()` in `beforeEach`.
- `auth.test.ts` mocks `axios` and `environment` to test login/caching/expiry/dedupe without a
  network; `http.test.ts` mocks `../../services/auth` and uses a custom axios adapter to
  verify the `Bearer` header, the login exemption and the single 401 refresh+retry.
- `newsService.test.ts` mocks `../../services/http` and `../../config/environment` to cover the
  paginated contract, the response aliases, client-side pagination, feed HTML stripping and
  date formatting; `News.test.tsx` mocks `newsService.fetchNewsPage` (keeping the real helpers
  via `importOriginal`) to cover loading/error/empty states and the pagination window.
- Query by user-visible text/placeholder (`findByText`, `findByPlaceholderText`) and use
  `waitFor` for async assertions. Assert forwarded signals with `expect.any(AbortSignal)`.
- `App.test.tsx` renders the real `<App />` (BrowserRouter) in two suites: it pushes `/` for
  the Home tests and `/catalog` for the catalog tests in `beforeEach`, so `?platform=` does
  not leak between tests.
- `ThemeToggle.test.tsx` clears `localStorage` and removes the `data-theme` attribute in
  `beforeEach`/`afterEach`, because the theme is global to the document.
- `src/test/setup.ts` must import `"@testing-library/jest-dom/vitest"` (not the bare
  `"@testing-library/jest-dom"`): only the `/vitest` entrypoint augments Vitest's
  `Assertion` interface, so the bare import makes `tsc -b` fail on matchers such as
  `toBeInTheDocument`.
- Every new feature or bug fix must add or update a test, and `npm run test:coverage` must stay green.
- `npm run test:run` takes ~20s and the default reporter prints nothing until it finishes
  when there is no TTY — that is not a hang. Most of the time goes to creating the jsdom
  environment per file.

## Backend API Contract

Base URL: `VITE_API_URL` → **backend-python** on `http://localhost:7000/api`.

Auth: every business endpoint below requires `Authorization: Bearer <jwt>` (obtained from
`POST /auth/login` with the configured credentials). The shared `http` client adds it
automatically and renews it once on `401`.

| Method | Endpoint | Params | Returns |
| --- | --- | --- | --- |
| POST | `/auth/login` | body `{username,password}` | `{ token, tokenType, expiresAt }` |
| GET | `/games` | `platform`, `page`, `limit` | `ApiResponse` (`{ data: Game[], pagination }`) |
| GET | `/games/search` | `title`, `page`, `limit` | `ApiResponse` |
| GET | `/games/:id` | — | `GameDetail` |
| GET | `/games/random` | — | `RandomGame` (`id`, `title`, `platform`, `publisher`, `releasedate`, `players`, `genre`, `imageOriginal`, `youtubeTrailer`; 404 si no hay ninguno con tráiler) |
| GET | `/platforms` | `limit` | `Platform[]` (desenvuelve `{ data, pagination }`) |
| GET | `/reviews/:id` | `page`, `limit` | `ReviewsResponse` (`{ data: Review[], pagination }`) |

All of them are called with an optional `AbortSignal` as described in *Data fetching*.

### News service (`VITE_NEWS_API_URL`)

Base URL: `VITE_NEWS_API_URL` → **rss-game-node** on `http://localhost:3001/api` (port 3001,
a different backend from the catalog). The JWT HS256 is shared with backend-python (same
secret/`issuer`/`audience`), so the token cached by `auth.ts` is valid there.

| Method | Endpoint | Params | Returns |
| --- | --- | --- | --- |
| GET | `/game-news` | `page`, `limit` | `{ data: GameNews[], pagination }` |

`newsService.unwrapNewsPage` tolerates the raw document shape (`_id`, `published_at`,
`description` with HTML), the `news`/`articles`/`items` aliases and plain arrays (paginated
in the client). The news backend must allow the frontend origin in CORS: any `localhost`
port is allowed outside production, and production origins must be listed in the backend's
`CORS_ORIGINS`.

## Gotchas

- `coverage/` is generated output and **is tracked in git**; regenerate it, never hand-edit it.
  It is listed in `globalIgnores` in `eslint.config.js` and in `.prettierignore`, so it no
  longer pollutes `npm run lint` or `npm run format`.
- `/news` is the only screen that talks to a second backend (`VITE_NEWS_API_URL`, port 3001).
  Without that variable in `.env`, `newsService.NEWS_BASE_URL` becomes `undefined/game-news`
  and the page falls back to its error state; the news backend must also allow the frontend
  origin in CORS (all `localhost` ports are allowed in development).
- `index.html` loads IBM Plex and Font Awesome 6 from CDNs; without network the layout still
  works but custom fonts/icons are missing. Icon-only controls keep `aria-label`s for this
  reason (and for the jsdom tests).
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
