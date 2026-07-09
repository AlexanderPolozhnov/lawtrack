# TASK: Настройка инфраструктуры Docker и схемы базы данных Flyway

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 0  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Развернуть локальную инфраструктуру PostgreSQL и Redis через Docker Compose, настроить бэкенд для подключения к БД и применить Flyway-миграции с базовой схемой таблиц (рестораны, столики, сотрудники, меню, сессии).

---

## Контекст

- **Зависит от:** Инициализации проекта
- **Затрагивает:** Backend / Infra
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md)

## Документация для обязательного ознакомления перед началом:
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — общие правила именования таблиц, полей и кодировки UTF-8.
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Схема базы данных в Секции 14.

> [!NOTE]
> **Сверка с эталонным проектом:** Рекомендуется подсматривать настройки Docker, структуру папок и конфигурацию в проекте `C:\.development\Projects\polozhnov-dev\`. Например, сравните `docker-compose.yml` и `backend/src/main/resources/application.yaml`.

---

## Затронутые файлы

### Создать новые
- `docker-compose.yml` — конфигурация контейнеров PostgreSQL 16 и Redis 7.
- `backend/src/main/resources/db/migration/V1__init_schema.sql` — Flyway-миграция для создания всех базовых таблиц и индексов.
- `backend/src/main/resources/application.yaml` — настройки подключения к БД, Redis, Hibernate и Flyway.
- `.env` — локальные переменные окружения для секретов.

### Изменить существующие
- `backend/.gitignore` — игнорирование локального файла `.env`.

---

## Точная реализация (Technical Design)

### 1. Docker Compose (`docker-compose.yml`)
Контейнеры:
- **db** (postgres:16-alpine): порт `5432`, пароли из `.env`, volume `pgdata`.
- **redis** (redis:7-alpine): порт `6379`, volume `redisdata`.

### 2. Переменные окружения (`.env` в корне проекта)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qtab
DB_USER=qtab_user
DB_PASSWORD=qtab_secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Настройки бэкенда (`backend/src/main/resources/application.yaml`)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:qtab}
    username: ${DB_USER:qtab_user}
    password: ${DB_PASSWORD:qtab_secret}
    driver-class-name: org.postgresql.Driver
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate.format_sql: true
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
```

### 4. Схема БД (`V1__init_schema.sql`)
Таблицы должны иметь первичные ключи `UUID` (генерация по умолчанию `gen_random_uuid()`):
1. **restaurants**: id, name, slug (UNIQUE), logo_url, is_active, created_at.
2. **tables**: id, restaurant_id (FK), number, capacity, status, created_at.
3. **staff**: id, restaurant_id (FK), name, login (UNIQUE), password_hash, role, is_active, created_at.
4. **menu_categories**: id, restaurant_id (FK), name_ru, name_en, icon_emoji, sort_order, is_active.
5. **menu_items**: id, category_id (FK), name_ru, name_en, description_ru, description_en, base_price, sort_order, is_active, created_at.
6. **guest_sessions**: id, table_id (FK), status, started_at, ended_at.

Индексы:
- Уникальный индекс на `restaurants.slug`.
- Индекс на `tables.restaurant_id`.
- Индекс на `menu_items.category_id`.

---

## Риски и подводные камни (Edge Cases)

- **Кодировка:** Убедиться, что файл `V1__init_schema.sql` сохранен строго в формате UTF-8 для корректной поддержки кириллицы в названиях категорий по умолчанию (если будут вставляться).
- **PostgreSQL UUID:** Использовать расширение `pgcrypto` или стандартную функцию `gen_random_uuid()` (в PostgreSQL 16 она доступна по умолчанию без необходимости явного включения pgcrypto).

---

## Порядок реализации для агента

### Infrastructure
- [x] 1. Создать `.env` в корне проекта с настройками БД.
- [x] 2. Добавить `.env` в `backend/.gitignore`.
- [x] 3. Создать `docker-compose.yml` в корне проекта.
- [x] 4. Запустить инфраструктуру: `docker compose up -d`.

### Backend
- [x] 5. Создать `backend/src/main/resources/application.yaml` и перенести туда настройки Spring Boot.
- [x] 6. Создать файл миграции `backend/src/main/resources/db/migration/V1__init_schema.sql` с SQL-запросами для создания схем.
- [x] 7. Проверить компиляцию и применение миграций бэкенда: `.\mvnw.cmd clean compile`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручной проверки.

---

## Ручная проверка

1. Запустить БД через Docker: `docker compose up -d`.
2. Проверить успешное применение миграций Flyway при старте бэкенда:
   `.\mvnw.cmd spring-boot:run`
3. Убедиться, что в БД созданы все таблицы (например, подключившись через DBeaver/pgAdmin к порту 5432).
