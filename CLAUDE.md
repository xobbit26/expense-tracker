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

- `apps/web` — Next.js 16 (App Router, `src/`), Tailwind CSS 4, shadcn/ui (`components.json`, style `new-york`)
- `apps/api` — NestJS 11, Prisma 7 (via `@prisma/adapter-pg`, driver adapters, no `DATABASE_URL` needed at build time), `nestjs-zod`, Swagger
- `packages/shared` — Zod schemas that define the API contract, built with `tsdown` to dual ESM+CJS (`dist/index.{mjs,cjs}` + `.d.{mts,cts}`), consumed by both apps as `@expense-tracker/shared`
- `packages/typescript-config`, `packages/eslint-config` — shared `tsconfig`/`eslint.config.mjs` bases (`nestjs.json`/`nest.js`, `nextjs.json`/`next.js`, `library.json`, `base.json`/`base.js`), imported via package `exports`, not relative paths

### Contract-first flow (the pattern to follow when adding new endpoints)

1. Define a Zod schema in `packages/shared/src/schemas/*.ts`, export it from `packages/shared/src/index.ts`.
2. In `apps/api`, wrap it with `createZodDto(...)` (see `src/health/health.dto.ts`) and use it as the controller's return type / `@ApiOkResponse({ type: ... })`. Validation and response serialization are wired globally in `app.module.ts` via `APP_PIPE: ZodValidationPipe` and `APP_INTERCEPTOR: ZodSerializerInterceptor` — no per-route decorators needed for basic cases.
3. In `apps/web`, `.parse()` the same schema against the fetch response (see `src/app/page.tsx` + `src/lib/api.ts`) so the frontend and backend can never drift on shape.

Swagger docs are cleaned up with `cleanupOpenApiDoc` from **`nestjs-zod`** (not `@nestjs/swagger` — easy to import from the wrong package).

### Prisma specifics

- Schema: `apps/api/prisma/schema.prisma`. Generator is the new `provider = "prisma-client"` (not `prisma-client-js`), output is `apps/api/src/generated/prisma` (gitignored, must run `pnpm db:generate` after clone/schema changes — turbo's `build`/`dev`/`typecheck`/`test` tasks already depend on it, see `turbo.json`).
- Connection uses `@prisma/adapter-pg` (`PrismaPg`) instead of a `DATABASE_URL` binary engine — `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) builds the adapter from `ConfigService` and is a `@Global()` module, so it's injectable anywhere without re-importing `PrismaModule`.
- `apps/api/prisma.config.ts` loads `DATABASE_URL` via `dotenv/config` — required for `prisma generate`/`migrate` CLI to see the env var outside of Nest's `ConfigModule`.
- `User` (`apps/api/prisma/schema.prisma`) is the first domain model — `email`/`name`/`passwordHash` plus timestamps, mapped to a `users` table. Add further models the same way and run `pnpm db:migrate`.

### Non-obvious gotchas

- **`nodenext` module resolution**: `apps/api` uses `moduleResolution: nodenext`, so relative imports in TS source use explicit `.js` extensions (e.g. `import { PrismaService } from '../prisma/prisma.service.js'`) even though the files are `.ts`. `ts-jest` does not resolve these on its own — both `apps/api/package.json`'s `jest` config and `apps/api/test/jest-e2e.json` have a `moduleNameMapper` (`"^(\\.{1,2}/.*)\\.js$": "$1"`) to strip the extension back. Keep this in mind if jest starts failing with "Cannot find module" after adding new relative imports.
- **ESLint self-lint**: `apps/api/eslint.config.mjs` uses `projectService: true` (type-aware linting), which normally can't lint itself since it isn't part of `tsconfig.json`. `packages/eslint-config/nest.js` sets `parserOptions.projectService.allowDefaultProject: ['eslint.config.mjs']` to work around this.
- **`packages/shared` dual build**: exports both an ESM and a CJS build so the CJS `apps/api` and ESM `apps/web` each get a native module format — don't add a single `main`/`module` without keeping both `tsdown` outputs in sync with `package.json#exports`.
- **`pnpm-workspace.yaml`** pins shared dependency versions via the `catalog:` protocol (`typescript`, `zod`, `@types/node`, `eslint`) — bump versions there, not per-package. It also lists `onlyBuiltDependencies`/`neverBuiltDependencies` and an `allowBuilds` map (pnpm's build-script approval); `pnpm approve-builds` may need re-running after adding a new native dependency.
- Health check flow (`GET /api/health`, global prefix `api` set in `main.ts`) is the reference implementation for the whole contract-first + Prisma + global pipes pattern above — read `apps/api/src/health/*` and `apps/web/src/app/page.tsx` together when unsure how a new feature should be wired.
- **Auth is global-by-default**: `AuthModule` (`apps/api/src/auth/`) registers `JwtAuthGuard` as an `APP_GUARD`, so every route requires a valid `Authorization: Bearer <token>` header unless the controller or handler is decorated with `@Public()` (see `apps/api/src/auth/decorators/public.decorator.ts`; `HealthController` and `AuthController` use it). New unauthenticated routes need this decorator explicitly. `@CurrentUser()` (`apps/api/src/auth/decorators/current-user.decorator.ts`) reads the `{ id, email }` payload the guard attaches to the request.
