# TASK: Инициализация и восстановление гостевой сессии (Backend Redis/PostgreSQL)

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Реализовать бизнес-логику инициализации и валидации гостевой сессии при сканировании QR-кода на бэкенде с использованием Redis в качестве кэша сессий (TTL 4 часа) и PostgreSQL для постоянной истории сессий.

---

## Контекст

- **Зависит от:** [TASK_01_INFRA_AND_DB](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_01_INFRA_AND_DB.md)
- **Затрагивает:** Backend
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) #[секция-1]

## Документация для обязательного ознакомления перед началом:
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 5.1 и 14.
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Хранение данных и Caching.

> [!NOTE]
> **Сверка с эталонным проектом:** При проектировании JPA-сущностей, мапперов (MapStruct) и REST-контроллеров ориентируйтесь на примеры из `C:\.development\Projects\polozhnov-dev\backend\src\main\java\com\alexanderpolozhnov\alexdev_app\`:
> - Базовые сущности и репозитории: в пакете `order` или `telegram`.
> - Глобальная обработка исключений и DTO: в пакете `common/exception` и `common/dto`.

---

## Затронутые файлы

### Создать новые
- `backend/src/main/java/com/qtab/api/config/RedisConfig.java` — конфигурация подключения к Redis и RedisTemplate.
- `backend/src/main/java/com/qtab/api/restaurant/Restaurant.java` — сущность ресторана.
- `backend/src/main/java/com/qtab/api/restaurant/RestaurantRepository.java` — репозиторий ресторанов.
- `backend/src/main/java/com/qtab/api/table/TableEntity.java` — сущность столика.
- `backend/src/main/java/com/qtab/api/table/TableRepository.java` — репозиторий столиков.
- `backend/src/main/java/com/qtab/api/auth/GuestSession.java` — сущность сессии в PostgreSQL.
- `backend/src/main/java/com/qtab/api/auth/GuestSessionRepository.java` — репозиторий сессий.
- `backend/src/main/java/com/qtab/api/auth/dto/SessionInitRequest.java` — DTO для инициализации.
- `backend/src/main/java/com/qtab/api/auth/dto/SessionResponse.java` — DTO для деталей сессии.
- `backend/src/main/java/com/qtab/api/auth/GuestSessionController.java` — контроллер гостевых сессий.
- `backend/src/main/java/com/qtab/api/auth/GuestSessionService.java` — сервис сессий гостя.

---

## Точная реализация (Technical Design)

### 1. Redis Configuration (`RedisConfig.java`)
- Настроить `RedisConnectionFactory` и `RedisTemplate<String, Object>` для сериализации JSON в строки с использованием `Jackson2JsonRedisSerializer`.

### 2. Структура Redis кэша
Ключ: `session:{sessionId}`  
Формат данных в кэше:
```json
{
  "sessionId": "UUID",
  "tableId": "UUID",
  "restaurantId": "UUID",
  "restaurantName": "String",
  "tableNumber": 12,
  "status": "ACTIVE"
}
```
TTL: 14400 секунд (4 часа).

### 3. Алгоритм `POST /api/v1/guest/session/init`
1. Найти `Restaurant` по `slug`. Если не найден → бросить `ResourceNotFoundException`.
2. Найти `TableEntity` по `tableId`. Если не найден → бросить `ResourceNotFoundException`.
3. Убедиться, что столик принадлежит выбранному ресторану (`table.restaurantId == restaurant.id`). Если нет → бросить `BadRequestException`.
4. Сгенерировать новый `sessionId` (UUID).
5. Сохранить сессию в PostgreSQL через `GuestSessionRepository` (со статусом `ACTIVE`, `startedAt = LocalDateTime.now()`).
6. Сохранить данные сессии в Redis по ключу `session:{sessionId}` с TTL 4 часа.
7. Вернуть DTO `SessionResponse`.

### 4. Алгоритм `GET /api/v1/guest/session/{sessionId}`
1. Попробовать прочитать данные из Redis по ключу `session:{sessionId}`.
2. Если сессия найдена → вернуть.
3. Если нет в Redis → проверить в PostgreSQL `GuestSessionRepository`.
4. Если сессия закрыта или не существует в БД → бросить `ResourceNotFoundException` (клиент должен будет сгенерировать новую сессию).
5. Если в БД сессия активна (`ended_at IS NULL`), пересохранить её в Redis (восстановить кэш) и вернуть.

---

## Риски и подводные камни (Edge Cases)

- **Redis Offline:** Если Redis временно не доступен, система должна осуществлять fallback-запросы напрямую в PostgreSQL. Исключения подключения к Redis не должны приводить к 500 ошибке для гостя.
- **Очистка сессий:** Следить, чтобы при завершении сессии (будет реализовано далее при оплате) кэш в Redis принудительно удалялся.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать сущности `Restaurant`, `TableEntity`, `GuestSession` и их репозитории.
- [x] 2. Написать класс конфигурации `RedisConfig.java` с сериализатором Jackson.
- [x] 3. Реализовать DTO запроса и ответа сессии.
- [x] 4. Написать бизнес-логику в `GuestSessionService.java`.
- [x] 5. Реализовать эндпоинты в `GuestSessionController.java`.
- [x] 6. Написать Unit/Integration тесты с моканием Redis.
- [x] 7. Проверить сборку: `.\mvnw.cmd clean compile`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручной проверки.

---

## Ручная проверка

1. Заполнить тестовый ресторан и столик в PostgreSQL:
   ```sql
   INSERT INTO restaurants (id, name, slug, is_active, created_at) VALUES ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'Чайхона Минск', 'chaihona-minsk', true, NOW());
   INSERT INTO tables (id, restaurant_id, number, capacity, status, created_at) VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 12, 4, 'FREE', NOW());
   ```
2. Выполнить запрос `POST /api/v1/guest/session/init` с телом:
   `{"restaurantSlug": "chaihona-minsk", "tableId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"}`.
3. Проверить, что вернулся `sessionId` и сессия сохранилась в Redis с TTL (можно проверить командой `ttl session:<sessionId>` в `redis-cli`).
