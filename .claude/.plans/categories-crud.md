# План: категории трат (CRUD) в API

## Context

Авторизация (JWT, глобальный `JwtAuthGuard`) уже есть. Следующий шаг — категории трат: у каждого пользователя свой набор категорий, к которым позже будут привязываться траты. Нужны: Prisma-модель, сервис (create / findAll / update / delete) и защищённый контроллер.

Решения, согласованные с пользователем:

- **валидация на Zod** (как во всём проекте: схема в `packages/shared` → `createZodDto`), class-validator **не добавляем**;
- поля: **`name` + `color` (hex `#RRGGBB`) + `icon`** (строковый идентификатор, напр. имя иконки lucide);
- **имя уникально в пределах пользователя** → `@@unique([userId, name])`, дубль → 409.

Фронтенд (`apps/web`) в этот объём **не входит**. Образец для всего — модули `users` и `auth`.

## Чеклист

По ходу работы отмечаю `[x]` в обоих файлах плана: `~/.claude/plans/sharded-painting-parrot.md` и `.claude/.plans/categories-crud.md`.

- [x] 1. Prisma: модель `Category` и связь `categories` в `User`, миграция `add_categories`, `db:generate` (п.1)
- [x] 2. shared: `schemas/category.ts`, экспорт из `index.ts`, сборка `@expense-tracker/shared` (п.2)
- [x] 3. `src/prisma/prisma-errors.ts`, перевести на него `users.service.ts` (п.3)
- [x] 4. `categories.repository.ts` (п.4)
- [x] 5. `categories.service.ts` (п.4)
- [x] 6. `categories.dto.ts` и `categories.controller.ts` (п.4)
- [x] 7. `categories.module.ts`, подключить в `app.module.ts` (п.4–5)
- [x] 8. Unit-тест `categories.service.spec.ts` (п.6)
- [x] 9. Вынести `FakePrismaService` в `test/fake-prisma.service.ts` и добавить в него `category.*`, обновить `auth.e2e-spec.ts` (п.6)
- [x] 10. E2E `test/categories.e2e-spec.ts` (п.6)
- [x] 11. Обновить `CLAUDE.md` (п.5)
- [x] 12. `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @expense-tracker/api test:e2e` — всё зелёное
- [x] 13. Ручная проверка через curl и Swagger (Verification, шаг 3)

## 1. Prisma-модель

`apps/api/prisma/schema.prisma`:

```prisma
model User {
  // ...существующие поля
  categories Category[]
}

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String
  color     String
  icon      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@map("categories")
}
```

Составной уникальный индекс начинается с `user_id`, поэтому отдельный индекс для выборки по пользователю не нужен. Миграция: `pnpm db:up`, затем `pnpm --filter @expense-tracker/api db:migrate --name add_categories`.

## 2. Контракт в `packages/shared`

`src/schemas/category.ts`:

- поля: `name: z.string().trim().min(1).max(50)`, `color: z.string().regex(/^#[0-9a-fA-F]{6}$/)`, `icon: z.string().trim().min(1).max(50).regex(/^[a-z0-9-]+$/)` (kebab-case, как у lucide);
- `categorySchema`: `{ id: z.uuid(), name, color, icon, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() }` + тип `Category` (`userId` в ответ не отдаём — это всегда текущий пользователь);
- `createCategoryRequestSchema`: `{ name, color, icon }` + тип `CreateCategoryRequest`;
- `updateCategoryRequestSchema`: `createCategoryRequestSchema.partial()` + `.refine(...)` «хотя бы одно поле» + тип `UpdateCategoryRequest`.

Экспортировать из `src/index.ts` в стиле существующих экспортов.

## 3. Хелпер ошибок Prisma (переиспользование)

`apps/api/src/prisma/prisma-errors.ts`: константы `PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002'`, `PRISMA_RECORD_NOT_FOUND_CODE = 'P2025'` и `isPrismaError(error, code): error is Prisma.PrismaClientKnownRequestError`. Перевести `users.service.ts` на этот хелпер (сейчас там локальная константа `P2002`), чтобы не дублировать проверку.

## 4. Модуль `categories` (`apps/api/src/categories/`)

- `categories.repository.ts` — `@Injectable()`, `PrismaService`, только доступ к данным:
  - `create(userId, data)` → `prisma.category.create({ data: { ...data, userId } })`;
  - `findManyByUserId(userId)` → `findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })`;
  - `update(userId, id, data)` → `update({ where: { id, userId }, data })`;
  - `delete(userId, id)` → `delete({ where: { id, userId } })`.
    Проверено: `CategoryWhereUniqueInput` — это `AtLeast<{ id, ... }>`, поэтому `userId` можно добавить в `where`. Проверка владельца атомарна, без предварительного `findFirst` и без гонки.
- `categories.service.ts`:
  - `create(userId, dto)`: P2002 → `ConflictException('Category with this name already exists')`;
  - `findAll(userId)`;
  - `update(userId, id, dto)`: P2025 → `NotFoundException('Category not found')`, P2002 → `ConflictException`;
  - `remove(userId, id)`: P2025 → `NotFoundException`;
  - `toPublic(category): Category` (shared-тип) — маппинг без `userId`, даты через `toISOString()` (как `UsersService.toPublic`).
    Чужая категория отдаёт **404, а не 403** — так ответ не выдаёт, что такая категория существует.
- `categories.dto.ts` — `CategoryDto`, `CreateCategoryRequestDto`, `UpdateCategoryRequestDto` через `createZodDto`.
- `categories.controller.ts` — `@Controller('categories')` + `@ApiBearerAuth()` на классе, **без** `@Public()`, поэтому роуты закрыты глобальным `JwtAuthGuard`. Пользователь берётся из `@CurrentUser() user: AuthUser`:
  - `POST /api/categories` → `@ZodResponse({ status: 201, type: CategoryDto })`;
  - `GET /api/categories` → `@ZodResponse({ type: [CategoryDto] })` (массивы поддерживаются, проверено в nestjs-zod 5.5.0);
  - `PATCH /api/categories/:id` → `@Param('id', ParseUUIDPipe)`, `@ZodResponse({ type: CategoryDto })`;
  - `DELETE /api/categories/:id` → `@HttpCode(204)`, `ParseUUIDPipe`, без тела.
    Глобальный `ZodValidationPipe` пропускает не-Zod параметры без изменений, поэтому `ParseUUIDPipe` работает (проверено); невалидный id → 400.
- `categories.module.ts` — providers `CategoriesRepository`, `CategoriesService`, controller `CategoriesController`.

## 5. Связка

- `apps/api/src/app.module.ts` — добавить `CategoriesModule` в `imports`.
- `CLAUDE.md` — в разделе Prisma упомянуть `Category` (привязан к `User`, `onDelete: Cascade`, уникальность `[userId, name]`) и хелпер `src/prisma/prisma-errors.ts`.

## 6. Тесты

Unit `apps/api/src/categories/categories.service.spec.ts` (репозиторий мокается, как в `users.service.spec.ts`):

- `create` передаёт `userId` в репозиторий; P2002 → `ConflictException`; прочие ошибки пробрасываются;
- `update` / `remove`: P2025 → `NotFoundException`; `update` с P2002 → `ConflictException`;
- `toPublic` без `userId`, даты в ISO.

E2E:

- Вынести `FakePrismaService` из `apps/api/test/auth.e2e-spec.ts` в `apps/api/test/fake-prisma.service.ts` и добавить `category.create/findMany/update/delete` на `Map` (эмуляция P2002 для `[userId, name]` и P2025 при несовпадении `{ id, userId }`). `auth.e2e-spec.ts` импортирует его оттуда.
- Новый `apps/api/test/categories.e2e-spec.ts` (регистрируются два пользователя через `/api/auth/register`):
  - без токена → 401;
  - create → 201; дубль имени → 409; невалидный `color` / пустой `name` → 400;
  - list возвращает только свои категории (второй пользователь не видит чужие);
  - patch → 200; patch чужой категории → 404; пустое тело → 400; невалидный uuid → 400;
  - delete → 204; повторный delete → 404.

## Verification

1. `pnpm db:up`, миграция из п.1, `pnpm db:generate`, `pnpm --filter @expense-tracker/shared build`.
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @expense-tracker/api test:e2e` (auth и health e2e тоже должны проходить).
3. Ручная проверка на `pnpm --filter @expense-tracker/api dev`:
   - получить токен через `POST /api/auth/login`;
   - `curl -X POST localhost:3001/api/categories -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"Еда","color":"#ff8800","icon":"utensils"}'` → 201;
   - `GET /api/categories` → массив; `PATCH /api/categories/<id>` → 200; `DELETE` → 204;
   - любой из роутов без заголовка → 401;
   - `localhost:3001/docs` — роуты categories с замком (Authorize).
