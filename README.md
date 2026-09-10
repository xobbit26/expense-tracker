# Expense Tracker

Монорепозиторий трекера расходов: фронтенд на Next.js, бэкенд на NestJS с Prisma поверх PostgreSQL.

## Стек

- **Монорепо**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: NestJS 11, nestjs-zod, Swagger
- **БД**: PostgreSQL 18 через Docker Compose, Prisma 7 (`@prisma/adapter-pg`)
- **Контракты**: Zod-схемы в `packages/shared`, используются и на бэке, и на фронте
- **Тесты**: Jest 30 + supertest
- **Линт/формат**: ESLint 9 (flat config) + Prettier 3

## Требования

- Node.js ≥ 24.11 (рекомендуется 26, см. `.nvmrc`)
- Docker (для PostgreSQL)

## Установка pnpm

В Node.js 25+ corepack больше не входит в поставку, поэтому его нужно установить отдельно:

```bash
brew install corepack
corepack enable pnpm
```

(или `npm i -g corepack`, если Homebrew не используется).

В каталоге проекта `pnpm -v` должен показать версию из `packageManager` (`package.json`).

## Первый запуск

```bash
pnpm install
# при необходимости pnpm попросит подтвердить build-скрипты зависимостей:
pnpm approve-builds

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm db:up
pnpm db:generate

pnpm dev
```

После запуска:

- `http://localhost:3000` — фронтенд
- `http://localhost:3001/api/health` — health-check API
- `http://localhost:3001/docs` — Swagger

## Обычный запуск

Когда зависимости уже установлены и `.env`-файлы созданы (см. «Первый запуск»), для повторного запуска достаточно:

```bash
pnpm db:up   # поднять Postgres, если контейнер ещё не запущен
pnpm dev     # запустить web (Next.js) и api (NestJS) в watch-режиме
```

Проверить, что всё поднялось:

```bash
curl http://localhost:3001/api/health
# {"status":"ok","database":"up"}
```

## Остановка

```bash
Ctrl+C          # остановить pnpm dev
pnpm db:down    # остановить контейнер Postgres
```

## Команды

| Команда                             | Назначение                           |
| ----------------------------------- | ------------------------------------ |
| `pnpm dev`                          | Запуск всех приложений в dev-режиме  |
| `pnpm build`                        | Сборка всех пакетов и приложений     |
| `pnpm lint`                         | Линт всех пакетов                    |
| `pnpm typecheck`                    | Проверка типов                       |
| `pnpm test`                         | Тесты                                |
| `pnpm format` / `pnpm format:check` | Форматирование Prettier              |
| `pnpm db:up` / `pnpm db:down`       | Поднять/остановить Postgres в Docker |
| `pnpm db:generate`                  | Сгенерировать Prisma Client          |
| `pnpm db:migrate`                   | Применить миграции Prisma            |
| `pnpm db:studio`                    | Prisma Studio                        |
