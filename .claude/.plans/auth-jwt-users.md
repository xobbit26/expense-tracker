# План: пользователи + JWT-авторизация в API

## Context

В API сейчас есть только health-check, моделей в Prisma нет, зависимостей для авторизации нет. Нужно добавить:

- модуль пользователей (repository поверх Prisma + service с логикой пользователя);
- отдельный модуль авторизации с JWT и эндпоинтами `register` / `login`.

Решения, согласованные с пользователем:

- **только access-токен** (без refresh), TTL из env;
- **argon2** для хеширования паролей;
- **глобальный `JwtAuthGuard`** + декоратор `@Public()` для открытых роутов.

Всё делается по contract-first паттерну из CLAUDE.md (схема в `packages/shared` → `createZodDto` в API). Фронтенд (`apps/web`) в этот объём **не входит**.

## 1. Зависимости и env

- `pnpm --filter @expense-tracker/api add @nestjs/jwt argon2`
- `pnpm-workspace.yaml`: добавить `argon2` в `onlyBuiltDependencies` и `allowBuilds: { argon2: true }` (у argon2 есть install-скрипт `node-gyp-build`).
- `apps/api/src/config/env.ts` — добавить:
  - `JWT_SECRET: z.string().min(32)`
  - `JWT_EXPIRES_IN: z.coerce.number().int().positive().default(86400)` — в **секундах**, числом: тип `expiresIn` в `@nestjs/jwt` не принимает произвольный `string`.
- `apps/api/.env.example` — добавить `JWT_SECRET=` (с пометкой сгенерировать `openssl rand -base64 48`) и `JWT_EXPIRES_IN=86400`. Также добавить `JWT_SECRET` в локальный `apps/api/.env`, иначе `ConfigModule` упадёт на валидации (в том числе в e2e).

## 2. Prisma-модель

`apps/api/prisma/schema.prisma`:

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

Миграция: `pnpm db:up`, затем `pnpm --filter @expense-tracker/api db:migrate --name add_users`. Email хранится в нижнем регистре (нормализуется в сервисе), поэтому `@unique` достаточно.

## 3. Контракт в `packages/shared`

- `src/schemas/user.ts` — `userSchema`: `{ id: z.uuid(), email: z.email(), name: z.string(), createdAt: z.iso.datetime() }` + тип `User`.
- `src/schemas/auth.ts`:
  - `registerRequestSchema`: `email: z.email().max(254)`, `name: z.string().trim().min(1).max(100)`, `password: z.string().min(8).max(128)` (верхний лимит защищает от DoS через огромный пароль при хешировании);
  - `loginRequestSchema`: `email: z.email()`, `password: z.string().min(1).max(128)`;
  - `authResponseSchema`: `{ accessToken: z.string(), user: userSchema }`;
  - типы `RegisterRequest`, `LoginRequest`, `AuthResponse`.
- Экспортировать всё из `src/index.ts` (в стиле существующего экспорта health).

## 4. Модуль `users` (`apps/api/src/users/`)

- `users.repository.ts` — `@Injectable()`, инжектит `PrismaService` (глобальный, импортировать модуль не нужно). Методы: `findById(id)`, `findByEmail(email)`, `create(data: { email; name; passwordHash })`. Типы `User`/`Prisma` из `../generated/prisma/client.js`. Только доступ к данным, без логики.
- `users.service.ts` — логика пользователя поверх репозитория:
  - `create(...)`: нормализует email (`trim().toLowerCase()`), вызывает репозиторий; ловит `Prisma.PrismaClientKnownRequestError` с кодом `P2002` → `ConflictException('Email already registered')` (без предварительного `findByEmail` — так нет гонки);
  - `findByEmail(email)` (с той же нормализацией), `findById(id)`;
  - `toPublic(user): User` (shared-тип) — маппинг без `passwordHash`, `createdAt.toISOString()`.
- `users.dto.ts` — `UserDto extends createZodDto(userSchema)`.
- `users.controller.ts` — `GET /api/users/me`: `@ApiBearerAuth()`, `@ZodResponse({ type: UserDto })`, берёт `@CurrentUser()` и возвращает `toPublic(await findById(...))` (404, если пользователь удалён). Нужен как минимальная защищённая точка для проверки, что JWT работает.
- `users.module.ts` — providers `UsersRepository`, `UsersService`; controller; `exports: [UsersService]`.

## 5. Модуль `auth` (`apps/api/src/auth/`)

- `auth.module.ts` — `imports: [UsersModule, JwtModule.registerAsync({ inject: [ConfigService], useFactory })]` (secret и `signOptions.expiresIn` из `ConfigService<Env, true>`); `controllers: [AuthController]`; `providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }]`. `APP_GUARD` объявляется именно здесь, т.к. guard зависит от `JwtService`, доступного только в скоупе этого модуля (сам guard при этом действует глобально).
- `auth.service.ts`:
  - `register(dto)`: `argon2.hash(password)` (argon2id по умолчанию) → `usersService.create` → `issue(user)`;
  - `login(dto)`: `findByEmail`; если пользователя нет — всё равно выполнить `argon2.verify` против заранее вычисленного dummy-хеша (выравнивает время ответа, чтобы по таймингу нельзя было перебирать email); при неудаче — `UnauthorizedException('Invalid credentials')` (одно сообщение для обоих случаев);
  - `private issue(user)`: `jwtService.signAsync({ sub: user.id, email: user.email })` → `{ accessToken, user: usersService.toPublic(user) }`.
- `auth.dto.ts` — `RegisterRequestDto`, `LoginRequestDto`, `AuthResponseDto` через `createZodDto`.
- `auth.controller.ts` — `@Controller('auth')` + `@Public()` на классе:
  - `POST /api/auth/register` → `@ZodResponse({ status: 201, type: AuthResponseDto })`;
  - `POST /api/auth/login` → `@HttpCode(200)` + `@ZodResponse({ status: 200, type: AuthResponseDto })`.
    `ZodResponse` (из `nestjs-zod`) даёт и Swagger-описание, и сериализацию через глобальный `ZodSerializerInterceptor` — лишние поля отрежутся.
- `decorators/public.decorator.ts` — `IS_PUBLIC_KEY` + `Public = () => SetMetadata(IS_PUBLIC_KEY, true)`.
- `decorators/current-user.decorator.ts` — `createParamDecorator`, возвращает `request.user` типа `AuthUser = { id: string; email: string }`.
- `jwt-auth.guard.ts` — `CanActivate`, без passport:
  1. `reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler, class])` → `true` для публичных;
  2. достать `Bearer <token>` из `Authorization`, иначе `UnauthorizedException`;
  3. `jwtService.verifyAsync(token)`, результат провалидировать внутренней zod-схемой `jwtPayloadSchema` (`{ sub: z.uuid(), email: z.string() }`); ошибка → `UnauthorizedException`;
  4. записать `request.user = { id: sub, email }`. Тип запроса — локальный `AuthenticatedRequest = Request & { user: AuthUser }` (без глобальной аугментации Express).

## 6. Связка

- `apps/api/src/app.module.ts` — добавить `UsersModule`, `AuthModule` в `imports`.
- `apps/api/src/health/health.controller.ts` — `@Public()`, иначе health станет закрытым.
- `apps/api/src/main.ts` — `.addBearerAuth()` в `DocumentBuilder`.
- `CLAUDE.md` — заменить строку «No domain models exist yet…» на краткое упоминание `User` и добавить в gotchas: глобальный `JwtAuthGuard`, новые роуты по умолчанию закрыты — для открытых нужен `@Public()`.

## 7. Тесты

Unit (`apps/api/src/**`, мокаются зависимости как в `health.controller.spec.ts`):

- `auth/auth.service.spec.ts` — register хеширует пароль (хеш ≠ пароль, `argon2.verify` проходит) и возвращает токен; login успешен; неверный пароль → 401; неизвестный email → 401.
- `auth/jwt-auth.guard.spec.ts` — публичный роут пропускается; нет заголовка → 401; невалидный токен → 401; валидный токен → `request.user` заполнен.
- `users/users.service.spec.ts` — ошибка `P2002` из репозитория → `ConflictException`; email нормализуется; `toPublic` не содержит `passwordHash`.

E2E `apps/api/test/auth.e2e-spec.ts` (как `health.e2e-spec.ts`: `overrideProvider(PrismaService)` фейком `user.create/findUnique` на `Map`, `setGlobalPrefix('api')`):

- register → 201 с `accessToken` и `user` без `passwordHash`;
- повторный register → 409; невалидное тело → 400;
- login → 200; неверный пароль → 401;
- `GET /api/users/me` с токеном → 200, без токена → 401.
  Существующий `health.e2e-spec.ts` должен продолжать проходить (роут `@Public()`).

## Verification

1. `pnpm install` (при запросе — `pnpm approve-builds` для argon2), `pnpm db:up`, миграция из п.2.
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @expense-tracker/api test:e2e`.
3. Ручная проверка на `pnpm --filter @expense-tracker/api dev`:
   - `curl -X POST localhost:3001/api/auth/register -H 'content-type: application/json' -d '{"email":"a@b.co","name":"A","password":"password123"}'` → 201;
   - `curl -X POST localhost:3001/api/auth/login ...` → 200, взять `accessToken`;
   - `curl localhost:3001/api/users/me -H "Authorization: Bearer $TOKEN"` → 200; без заголовка → 401;
   - `curl localhost:3001/api/health` → 200 без токена;
   - `localhost:3001/docs` — видны роуты auth/users и кнопка Authorize.
