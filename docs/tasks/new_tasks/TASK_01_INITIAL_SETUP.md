# TASK: TASK_01_INITIAL_SETUP (Настройка окружения и скелетов проектов)

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Созданы и запущены скелетные приложения: бэкенд на Spring Boot 4 (Java 21, Maven) в папке `backend` и фронтенд на Next.js 16 (React 19, TypeScript, Tailwind CSS v4, pnpm) в папке `frontend`, настроена локальная база данных через Docker Compose.

---

## Контекст

- **Зависит от:** Нет
- **Затрагивает:** Both (Backend, Frontend, Infrastructure)
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила и структура монорепозитория.
- `TZ_LawTrack_CRM.md` — раздел 1 (Стек технологий) и раздел 5 (Docker).
- `ROADMAP.md` — Фаза 1.

---

## Затронутые файлы

### Создать новые
- `backend/pom.xml` — файл сборки Maven для Spring Boot 4.
- `backend/src/main/java/com/lawtrack/LawtrackApplication.java` — стартовый класс бэкенда.
- `backend/src/main/resources/application.yml` — конфигурация бэкенда (порты, профили, БД).
- `backend/src/main/resources/application-local.yml` — локальная конфигурация с H2/PostgreSQL.
- `frontend/package.json` — конфигурация зависимостей фронтенда.
- `frontend/next.config.ts` — конфигурация Next.js.
- `frontend/tsconfig.json` — конфигурация TypeScript.
- `frontend/src/app/layout.tsx` — базовый макет Next.js.
- `frontend/src/app/page.tsx` — стартовая страница дашборда.
- `frontend/src/app/globals.css` — стили с Tailwind v4.
- `docker-compose.yml` — Docker Compose для PostgreSQL 16.
- `.env.example` — пример переменных окружения.
- `.env` — локальные переменные окружения.

---

## Точная реализация (Technical Design)

### Infrastructure
Создать `docker-compose.yml` в корне проекта с сервисом `postgres:16-alpine`. Имя БД `lawtrack`, пользователь `lawtrack_user`, пароль `lawtrack_pass`.

### Backend
1. Создать `backend/pom.xml` с зависимостями:
   - `spring-boot-starter-web`
   - `spring-boot-starter-data-jpa`
   - `spring-boot-starter-validation`
   - `spring-boot-starter-actuator`
   - `org.postgresql:postgresql`
   - `com.h2database:h2` (для локального fallback/тестов)
   - `org.flywaydb:flyway-core`
   - `org.flywaydb:flyway-database-postgresql`
   - `org.projectlombok:lombok` (scope: provided/annotationProcessor)
   - `org.mapstruct:mapstruct` и `org.mapstruct:mapstruct-processor`
   - `org.springdoc:springdoc-openapi-starter-webmvc-ui` (Swagger UI)
2. Создать maven wrapper (`mvnw.cmd` и `.mvn/` директорию) или использовать существующий. В ТЗ указано использование `./mvnw.cmd`.
3. Создать `com.lawtrack.LawtrackApplication.java` с аннотацией `@SpringBootApplication`.
4. Сконфигурировать `application.yml` для работы с PostgreSQL по умолчанию (порт 8080) и разрешением CORS с `http://localhost:3000`.

### Frontend
1. Инициализировать Next.js 16 проект в папке `frontend` с помощью `npx -y create-next-app@16 ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (или создать package.json вручную с React 19 и Tailwind v4).
2. Зависимости в `package.json`:
   - `react` и `react-dom` (версия 19.x)
   - `next` (версия 16.x)
   - `@tanstack/react-query`
   - `zod`
   - `react-hook-form`
   - `@hookform/resolvers`
   - `lucide-react`
   - `class-variance-authority`
   - `clsx`
   - `tailwind-merge`
3. Настроить Tailwind CSS v4 в `frontend/src/app/globals.css`.

---

## Риски и подводные камни (Edge Cases)

- **Порты:** Убедиться, что порт 8080 (бэкенд) и 5432 (Postgres) не заняты другими службами на машине пользователя.
- **Node.js и pnpm:** Убедиться, что на машине установлен pnpm и используется корректная версия Node (18+).

---

## Порядок реализации для агента

### Infrastructure
- [ ] 1. Создать `docker-compose.yml` в корне.
- [ ] 2. Запустить `docker compose up -d postgres` для поднятия базы данных.

### Backend
- [ ] 3. Создать структуру каталогов бэкенда: `backend/src/main/java/com/lawtrack/` и `backend/src/main/resources/db/migration/`.
- [ ] 4. Создать `backend/pom.xml`.
- [ ] 5. Добавить Maven wrapper файлы (копированием или генерацией).
- [ ] 6. Создать `com.lawtrack.LawtrackApplication.java`.
- [ ] 7. Создать `backend/src/main/resources/application.yml` и настроить профили.
- [ ] 8. Проверить сборку: `cd backend && .\mvnw.cmd clean compile -DskipTests`

### Frontend
- [ ] 9. Инициализировать `frontend/` через `npx -y create-next-app@16 frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`.
- [ ] 10. Установить дополнительные зависимости (`@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`).
- [ ] 11. Очистить стартовый `page.tsx` и настроить `globals.css` с поддержкой Tailwind v4.
- [ ] 12. Проверить сборку фронтенда: `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]` для Фазы 1.
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить Postgres: `docker compose up -d`.
2. Запустить бэкенд: `cd backend && .\mvnw.cmd spring-boot:run`. Убедиться по логам, что старт прошел на порту 8080.
3. Запустить фронтенд: `cd frontend && pnpm run dev`. Открыть `http://localhost:3000` в браузере, убедиться, что отображается стартовая страница Next.js.
