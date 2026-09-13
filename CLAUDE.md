# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`packageManager` in root `package.json` pins the exact version; run via corepack: `corepack enable pnpm`). All top-level commands fan out to every workspace package through Turborepo.

```bash
pnpm install                 # install all workspace deps
pnpm dev                     # run web (Next.js) + api (NestJS) in watch mode
pnpm build                   # build all packages/apps (turbo, respects task graph)
pnpm lint                    # eslint across all packages
pnpm typecheck               # tsc --noEmit across all packages
pnpm test                    # jest unit tests (api only currently has tests)
pnpm format / format:check   # prettier write/check for the whole repo

pnpm db:up / db:down         # start/stop Postgres via docker compose
pnpm db:generate             # prisma generate (delegates to apps/api)
pnpm db:migrate              # prisma migrate dev (delegates to apps/api)
pnpm db:studio               # prisma studio
```

Run a command for a single workspace package with `--filter`:

```bash
pnpm --filter @expense-tracker/api dev
pnpm --filter @expense-tracker/api test          # jest unit tests
pnpm --filter @expense-tracker/api test:e2e       # jest e2e (test/*.e2e-spec.ts)
pnpm --filter @expense-tracker/web dev
pnpm --filter @expense-tracker/shared build       # tsdown build
```

Run a single test file/case in `apps/api` (jest, rootDir is `apps/api/src`):

```bash
cd apps/api
pnpm test -- health.controller          # by filename pattern
pnpm test -- -t "returns database"      # by test name
```

Local Postgres runs on **port 5433** (not 5432) to avoid clashing with other local Postgres instances — see `DATABASE_URL` in `apps/api/.env.example`.

## Architecture

This is a **pnpm workspaces + Turborepo monorepo** with three layers:

- `apps/web` — Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui (`components.json`, style `new-york`), react-hook-form + zodResolver for forms, next-themes for dark mode. Frontend follows **Feature-Sliced Design** — see the dedicated section below.
- `apps/api` — NestJS 11, Prisma 7 (via `@prisma/adapter-pg`, driver adapters, no `DATABASE_URL` needed at build time), `nestjs-zod`, Swagger
- `packages/shared` — Zod schemas that define the API contract, built with `tsdown` to dual ESM+CJS (`dist/index.{mjs,cjs}` + `.d.{mts,cts}`), consumed by both apps as `@expense-tracker/shared`
- `packages/typescript-config`, `packages/eslint-config` — shared `tsconfig`/`eslint.config.mjs` bases (`nestjs.json`/`nest.js`, `nextjs.json`/`next.js`, `library.json`, `base.json`/`base.js`), imported via package `exports`, not relative paths

### CQRS (`apps/api/src/transactions/`)

`transactions` is the only module built on `@nestjs/cqrs` (pinned to `^11.0.3` — v12 requires Nest 12, we're on Nest 11). `CqrsModule.forRoot()` is registered once in `app.module.ts`. The controller injects only `CommandBus`/`QueryBus` — no direct service/repository access — and dispatches `Command<T>`/`Query<T>` subclasses (`commands/`, `queries/`) to their `@CommandHandler`/`@QueryHandler`. Handlers own business logic and call `TransactionsRepository` directly; there's no separate service layer for this module (unlike `categories`, which keeps a service). Follow this pattern only for modules that actually benefit from command/query separation — it's deliberately not used elsewhere in the API.

### Contract-first flow (the pattern to follow when adding new endpoints)

1. Define a Zod schema in `packages/shared/src/schemas/*.ts`, export it from `packages/shared/src/index.ts`.
2. In `apps/api`, wrap it with `createZodDto(...)` (see `src/health/health.dto.ts`) and use it as the controller's return type / `@ApiOkResponse({ type: ... })`. Validation and response serialization are wired globally in `app.module.ts` via `APP_PIPE: ZodValidationPipe` and `APP_INTERCEPTOR: ZodSerializerInterceptor` — no per-route decorators needed for basic cases.
3. In `apps/web`, `.parse()` the same schema against the fetch response (see `src/entities/health` + `src/shared/api/api-client.ts`) so the frontend and backend can never drift on shape.

Swagger docs are cleaned up with `cleanupOpenApiDoc` from **`nestjs-zod`** (not `@nestjs/swagger` — easy to import from the wrong package).

### Prisma specifics

- Schema: `apps/api/prisma/schema.prisma`. Generator is the new `provider = "prisma-client"` (not `prisma-client-js`), output is `apps/api/src/generated/prisma` (gitignored, must run `pnpm db:generate` after clone/schema changes — turbo's `build`/`dev`/`typecheck`/`test` tasks already depend on it, see `turbo.json`).
- Connection uses `@prisma/adapter-pg` (`PrismaPg`) instead of a `DATABASE_URL` binary engine — `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) builds the adapter from `ConfigService` and is a `@Global()` module, so it's injectable anywhere without re-importing `PrismaModule`.
- `apps/api/prisma.config.ts` loads `DATABASE_URL` via `dotenv/config` — required for `prisma generate`/`migrate` CLI to see the env var outside of Nest's `ConfigModule`.
- `User` (`apps/api/prisma/schema.prisma`) is the first domain model — `email`/`name`/`passwordHash` plus timestamps, mapped to a `users` table. Add further models the same way and run `pnpm db:migrate`.
- `Category` (`apps/api/prisma/schema.prisma`) belongs to a `User` (`onDelete: Cascade`) and is unique per `[userId, name]`, but as a **partial** unique index scoped to active rows (`@@unique([userId, name], where: { deletedAt: null })`, needs the `partialIndexes` preview feature) — duplicate names among active categories for the same user map to a 409, see `apps/api/src/categories/categories.service.ts`.
- Categories are **soft-deleted**: `remove()` sets `deletedAt` instead of deleting the row (`CategoriesRepository.archive`). A deleted category disappears from `GET /categories` and can't be assigned to new transactions, but existing transactions keep referencing it (and it still counts toward totals) so history stays intact. Because of the partial unique index, deleting "Food" frees up the name "Food" for a new category.
- `Transaction` (`apps/api/prisma/schema.prisma`) stores `amount` as `Decimal(12, 2)` and `date` as `@db.Date` (no time component) — the API contract (`packages/shared/src/schemas/transaction.ts`) passes `amount` as a **string** end-to-end (request, response, totals) to avoid floating-point rounding on money. `category` uses `onDelete: NoAction`, not `Restrict`: categories are never hard-deleted, but a user delete must cascade through both `categories` and `transactions` in one statement, and Postgres checks `RESTRICT` immediately (before the cascade can run) whereas `NO ACTION` is deferred to the end of the statement.
- `apps/api/src/prisma/prisma-errors.ts` — `isPrismaError(error, code)` plus `PRISMA_UNIQUE_CONSTRAINT_CODE`/`PRISMA_RECORD_NOT_FOUND_CODE` constants, shared by `UsersService`, `CategoriesService`, and the `transactions` command/query handlers to map `P2002`/`P2025` to `ConflictException`/`NotFoundException`. Reuse this instead of re-checking `Prisma.PrismaClientKnownRequestError` codes inline.
- Creating a migration non-interactively (e.g. from an agent without a TTY): `prisma migrate dev` refuses outright ("environment is non-interactive"), even with `--create-only` and stdin piped. Instead generate the SQL with `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script`, hand-write it into a new `prisma/migrations/<timestamp>_<name>/migration.sql`, then apply with `prisma migrate deploy` (non-interactive by design). Verify no drift afterwards by re-running the same `migrate diff` — it should print `-- This is an empty migration.`.

### Frontend: Feature-Sliced Design

`apps/web` follows the official FSD layout for Next.js App Router:

```
apps/web/
├── app/            # Next.js routing ONLY — every file re-exports from src/
├── proxy.ts
└── src/
    ├── _app/       # root/auth layouts, providers, global styles
    ├── _pages/     # one slice per route (composes widgets/features/entities)
    ├── widgets/    # composite UI blocks (e.g. app-header)
    ├── features/   # user actions (auth/login, auth/register, auth/logout, theme-toggle)
    ├── entities/   # domain data (session, user, health)
    └── shared/     # ui (shadcn), api, lib, config — no business logic
```

- Import rule: a layer may only import from layers **below** it (`app → pages → widgets → features → entities → shared`). Slices within the same layer never import each other directly (e.g. `features/auth/login` cannot import from `features/auth/register`).
- A slice's public API is its `index.ts` — always import `@/entities/user`, never reach into `@/entities/user/model/...`.
- Server-only code (cookies, `redirect`, anything importing `server-only`) is exported from a separate `index.server.ts` next to `index.ts`, so a client component can't accidentally pull it in through the barrel.
- `app/` and `src/_app`/`src/_pages` are named with a leading underscore because Next.js reserves plain `src/app`/`src/pages` for its own router — the real router lives only in the root `app/` directory, which re-exports the default/`metadata` from the matching `_pages`/`_app` slice and contains no logic of its own.
- Inside a feature, put server actions in `api/`, client components in `ui/`, and shared types in `model/`.
- Add shadcn components from `apps/web` with `pnpm dlx shadcn@latest add <name>` — `components.json` aliases are wired to `@/shared/ui`, `@/shared/lib`, etc., so generated files land in the right slice automatically. shadcn's registry currently emits `import { cn } from "cn"` (a separate npm package) instead of the local util — replace that import with `@/shared/lib/utils` and drop the `cn` dependency after every `add`.

### Frontend auth flow

- The JWT lives in an **httpOnly** cookie (`access_token`, set by `entities/session`), never in browser-accessible JS — Server Actions call the API and set the cookie; Server Components read it and forward it as `Bearer` to the API.
- `proxy.ts` (root of `apps/web`) does an **optimistic** check only: does the cookie exist and is it not obviously expired (decoded client-side via `shared/lib/jwt`, no signature check). It deliberately does **not** redirect away from `/login`/`/register` — the authoritative check for those pages is `redirectIfAuthenticated()`, which calls the real API. If `proxy.ts` also redirected off `/login`, a token that looks unexpired but was rejected by the API (e.g. after a `JWT_SECRET` rotation) would create a redirect loop.
- `requireUser()` / `redirectIfAuthenticated()` (`entities/user/index.server.ts`) are the authoritative checks — they call `GET /users/me` and redirect based on the real response.
- `getCurrentUser` is wrapped in React `cache()` so calling it from both a layout and a page in the same request only hits the API once.

### Non-obvious gotchas

- **`nodenext` module resolution**: `apps/api` uses `moduleResolution: nodenext`, so relative imports in TS source use explicit `.js` extensions (e.g. `import { PrismaService } from '../prisma/prisma.service.js'`) even though the files are `.ts`. `ts-jest` does not resolve these on its own — both `apps/api/package.json`'s `jest` config and `apps/api/test/jest-e2e.json` have a `moduleNameMapper` (`"^(\\.{1,2}/.*)\\.js$": "$1"`) to strip the extension back. Keep this in mind if jest starts failing with "Cannot find module" after adding new relative imports.
- **ESLint self-lint**: `apps/api/eslint.config.mjs` uses `projectService: true` (type-aware linting), which normally can't lint itself since it isn't part of `tsconfig.json`. `packages/eslint-config/nest.js` sets `parserOptions.projectService.allowDefaultProject: ['eslint.config.mjs']` to work around this.
- **`packages/shared` dual build**: exports both an ESM and a CJS build so the CJS `apps/api` and ESM `apps/web` each get a native module format — don't add a single `main`/`module` without keeping both `tsdown` outputs in sync with `package.json#exports`.
- **`pnpm-workspace.yaml`** pins shared dependency versions via the `catalog:` protocol (`typescript`, `zod`, `@types/node`, `eslint`) — bump versions there, not per-package. It also lists `onlyBuiltDependencies`/`neverBuiltDependencies` and an `allowBuilds` map (pnpm's build-script approval); `pnpm approve-builds` may need re-running after adding a new native dependency.
- Health check flow (`GET /api/health`, global prefix `api` set in `main.ts`) is the reference implementation for the whole contract-first + Prisma + global pipes pattern above — read `apps/api/src/health/*` and `apps/web/src/app/page.tsx` together when unsure how a new feature should be wired.
- **Auth is global-by-default**: `AuthModule` (`apps/api/src/auth/`) registers `JwtAuthGuard` as an `APP_GUARD`, so every route requires a valid `Authorization: Bearer <token>` header unless the controller or handler is decorated with `@Public()` (see `apps/api/src/auth/decorators/public.decorator.ts`; `HealthController` and `AuthController` use it). New unauthenticated routes need this decorator explicitly. `@CurrentUser()` (`apps/api/src/auth/decorators/current-user.decorator.ts`) reads the `{ id, email }` payload the guard attaches to the request.
- **`middleware.ts` → `proxy.ts`**: Next 16 renamed the middleware file convention to `proxy.ts` (same `NextRequest`/`NextResponse`/`config.matcher` API — a drop-in rename). Having both files present is a build error.
- **`z.config(z.locales.ru())`** (`apps/web/src/shared/lib/zod-locale.ts`, imported once from `_app/providers`) sets zod's global error-message locale to Russian. This affects schemas imported from `@expense-tracker/shared` too, because `apps/web` and `packages/shared` resolve to the exact same `zod` instance (pinned via the `catalog:` protocol) — zod's locale config lives on `globalThis`, so there's only one config to set.
- **`suppressHydrationWarning` on `<html>`** (`apps/web/src/_app/layouts/root-layout.tsx`): required because `next-themes` sets the `class` attribute on `<html>` before React hydrates, which would otherwise trip React's hydration mismatch warning.
