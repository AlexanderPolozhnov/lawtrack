# TASK: Интерактивная карта зала с live-статусами столиков и управление столиками

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 2  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Claude Sonnet 4.6 (Thinking)

---

## Цель

Реализовать интерактивную 2D-карту зала ресторана в Staff Dashboard с live-статусами столиков через WebSocket, пульсацией при вызовах, звуковыми уведомлениями и управлением столиками (количество гостей, смена статуса, подтверждение вызова).

---

## Контекст

- **Зависит от:** TASK_07 (Staff Dashboard), TASK_06 (WebSocket STOMP), TASK_01 (Tables schema)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Staff API

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (MapStruct, Tailwind v4, Zustand, TanStack Query).
- **Выжимка из KNOWN_ISSUES:**
  - Tailwind CSS v4: конфигурация через CSS переменные в `globals.css`, не через `tailwind.config.js`.
  - `'use client'` обязателен для компонентов с хуками и обработчиками событий.
  - Все компоненты в Next.js App Router по умолчанию серверные.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `docs/FRONTEND_BACKEND_CONTRACT.md` — Staff API endpoints.
- `ROADMAP.md` — Фаза 2, пункты «Интерактивная карта зала» и «Пульсация и звуковые уведомления».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/resources/db/migration/V6__add_table_position_and_guest_count.sql` — Flyway миграция: добавление полей `position_x INT`, `position_y INT`, `width INT DEFAULT 80`, `height INT DEFAULT 80`, `shape VARCHAR(20) DEFAULT 'ROUND'`, `guests_count INT DEFAULT 0` в таблицу `tables`.
- `backend/src/main/java/com/qtab/api/table/dto/TableResponse.java` — DTO для ответа: `id`, `number`, `capacity`, `status`, `guestsCount`, `positionX`, `positionY`, `width`, `height`, `shape`.
- `backend/src/main/java/com/qtab/api/table/dto/UpdateTableStatusRequest.java` — DTO: `@NotBlank String status`.
- `backend/src/main/java/com/qtab/api/table/dto/UpdateGuestsCountRequest.java` — DTO: `@Min(0) Integer guestsCount`.

**Frontend:**
- `frontend/src/components/staff/FloorMap.tsx` — Основной компонент карты зала с рендерингом столиков по координатам, цветовым кодированием статусов, пульсирующей анимацией.
- `frontend/src/components/staff/TableNode.tsx` — Отдельный столик на карте: круглый/прямоугольный, цвет по статусу, пульсация при NEEDS_ATTENTION, отображение номера и количества гостей.
- `frontend/src/components/staff/TableDetailPanel.tsx` — Боковая панель при клике на столик: информация о заказах, кнопки управления (указать гостей, подтвердить вызов, сменить статус, освободить).
- `frontend/src/types/table.ts` — TypeScript-типы для столиков.
- `frontend/src/lib/sounds.ts` — Утилита генерации звуков через Web Audio API (вынос из dashboard page в переиспользуемый модуль).

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/table/TableEntity.java` — Добавить поля: `positionX`, `positionY`, `width`, `height`, `shape`, `guestsCount` с маппингом на новые колонки БД.
- `backend/src/main/java/com/qtab/api/table/TableService.java` — Добавить методы: `updateTableStatus(UUID tableId, UUID restaurantId, String status)` с WebSocket нотификацией, `updateGuestsCount(UUID tableId, UUID restaurantId, int count)` с WebSocket нотификацией, `freeTable(UUID tableId, UUID restaurantId)` — сброс на FREE + guestsCount=0.
- `backend/src/main/java/com/qtab/api/table/TableController.java` — Добавить эндпоинты: `PATCH /api/v1/staff/tables/{tableId}/status`, `PATCH /api/v1/staff/tables/{tableId}/guests-count`.
- `frontend/src/app/(staff)/dashboard/page.tsx` — Заменить текстовый список столов на компонент `FloorMap` с live-обновлениями через WebSocket.

---

## Точная реализация (Technical Design)

### Backend

#### Миграция V6__add_table_position_and_guest_count.sql
```sql
ALTER TABLE tables ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 100;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 100;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 80;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 80;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS shape VARCHAR(20) DEFAULT 'ROUND';
ALTER TABLE tables ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 0;

-- Расставить демо-столики по сетке 3 колонки (для ресторана из seed данных)
UPDATE tables SET position_x = 100, position_y = 80, shape = 'ROUND' WHERE number = 1;
UPDATE tables SET position_x = 280, position_y = 80, shape = 'ROUND' WHERE number = 2;
UPDATE tables SET position_x = 460, position_y = 80, shape = 'ROUND' WHERE number = 3;
UPDATE tables SET position_x = 100, position_y = 240, shape = 'SQUARE' WHERE number = 4;
UPDATE tables SET position_x = 280, position_y = 240, shape = 'ROUND' WHERE number = 5;
UPDATE tables SET position_x = 460, position_y = 240, shape = 'SQUARE' WHERE number = 6;
UPDATE tables SET position_x = 100, position_y = 400, shape = 'ROUND' WHERE number = 7;
UPDATE tables SET position_x = 280, position_y = 400, shape = 'ROUND' WHERE number = 8;
UPDATE tables SET position_x = 460, position_y = 400, shape = 'ROUND' WHERE number = 9;
UPDATE tables SET position_x = 640, position_y = 160, shape = 'RECTANGLE' WHERE number = 10;
```

#### Entity (TableEntity.java — дополнение)
```java
@Column(name = "position_x")
@Builder.Default
private Integer positionX = 100;

@Column(name = "position_y")
@Builder.Default
private Integer positionY = 100;

@Builder.Default
private Integer width = 80;

@Builder.Default
private Integer height = 80;

@Column(length = 20)
@Builder.Default
private String shape = "ROUND";

@Column(name = "guests_count")
@Builder.Default
private Integer guestsCount = 0;
```

#### DTO (TableResponse.java)
```java
public record TableResponse(
    UUID id,
    Integer number,
    Integer capacity,
    String status,
    Integer guestsCount,
    Integer positionX,
    Integer positionY,
    Integer width,
    Integer height,
    String shape
) {}
```

#### Сервис — новые методы в TableService.java
```java
@Transactional
public void updateTableStatus(UUID tableId, UUID restaurantId, String newStatus) {
    // 1. findById + проверка restaurantId
    // 2. table.setStatus(newStatus)
    // 3. save
    // 4. WebSocket /topic/restaurant/{restaurantId}/tables → eventType: TABLE_STATUS_CHANGED
}

@Transactional
public void updateGuestsCount(UUID tableId, UUID restaurantId, int guestsCount) {
    // 1. findById + проверка restaurantId
    // 2. table.setGuestsCount(guestsCount)
    // 3. save
    // 4. WebSocket → eventType: TABLE_GUESTS_UPDATED
}
```

#### Контроллер — новые эндпоинты в TableController.java
```java
@PatchMapping("/{tableId}/status")
public ResponseEntity<?> updateTableStatus(@PathVariable UUID tableId, @RequestBody UpdateTableStatusRequest request);

@PatchMapping("/{tableId}/guests-count")  
public ResponseEntity<?> updateGuestsCount(@PathVariable UUID tableId, @RequestBody UpdateGuestsCountRequest request);
```

### Frontend

#### Types (table.ts)
```typescript
export interface TableInfo {
  id: string;
  number: number;
  capacity: number;
  status: 'FREE' | 'OCCUPIED' | 'NEEDS_ATTENTION' | 'AWAITING_PAYMENT' | 'RESERVED' | 'UNAVAILABLE';
  guestsCount: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE';
}
```

#### FloorMap.tsx — основная логика:
- Рендерит `<div>` с relative позицией (как «холст»)
- Для каждого столика из `tables[]` рендерит `<TableNode>` с `position: absolute`, `left: positionX`, `top: positionY`
- Цвет по статусу: FREE→зелёный, OCCUPIED→синий, NEEDS_ATTENTION→красный+пульсация, AWAITING_PAYMENT→жёлтый, RESERVED→фиолетовый, UNAVAILABLE→серый
- При клике — открывается `TableDetailPanel`
- WebSocket подписка `/topic/restaurant/{restaurantId}/tables` обновляет стейт столиков в реальном времени

#### TableNode.tsx — анимация:
- CSS `@keyframes pulse-red` для статуса `NEEDS_ATTENTION`
- Отображает номер столика и иконку числа гостей
- Радиальный градиент для «подсветки»

#### TableDetailPanel.tsx — боковая панель:
- Номер, статус, capacity, guests count
- Кнопки: «Указать гостей» (NumberInput), «Подтвердить вызов» (POST acknowledge-call), «Сменить статус» (dropdown), «Освободить столик» (set FREE + guestsCount=0)
- Компактный список последних заказов по этому столику (опционально)

#### sounds.ts — переиспользуемый модуль:
- `playCallWaiterSound()` — низкочастотный chime
- `playRequestBillSound()` — среднечастотный chime
- `playNewOrderSound()` — высокочастотный chime
- Все через Web Audio API (AudioContext → OscillatorNode + GainNode)

---

## Риски и подводные камни (Edge Cases)

- **База данных:** Flyway миграция V6 должна быть совместима с существующими записями (используем `DEFAULT` значения и `IF NOT EXISTS`).
- **WebSocket гонка:** Два клиента могут одновременно менять статус столика → последнее сохранение побеждает (eventual consistency — для MVP допустимо).
- **Размеры карты:** На маленьких экранах планшета карта должна скроллиться. Используем `overflow-auto`.
- **Кэш / State:** При получении WebSocket события нужно обновить только конкретный столик в массиве (не перезапрашивать весь список). Используем `setTables(prev => prev.map(t => t.id === event.tableId ? {...t, status: event.status} : t))`.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Flyway миграция `V6__add_table_position_and_guest_count.sql`.
- [x] 2. Обновить `TableEntity.java` — добавить 6 новых полей (positionX, positionY, width, height, shape, guestsCount).
- [x] 3. Создать DTO: `TableResponse.java`, `UpdateTableStatusRequest.java`, `UpdateGuestsCountRequest.java`.
- [x] 4. Обновить `TableService.java` — добавить методы `updateTableStatus()`, `updateGuestsCount()`, обновить `getTables()` для возврата `List<TableResponse>`.
- [x] 5. Обновить `TableController.java` — добавить новые PATCH эндпоинты, обновить GET для возврата `TableResponse`.
- [x] 6. `.\mvnw.cmd clean compile -q -DskipTests`

### Frontend
- [x] 7. Создать `frontend/src/types/table.ts` — типы `TableInfo`.
- [x] 8. Создать `frontend/src/lib/sounds.ts` — утилита звуков Web Audio API.
- [x] 9. Создать `frontend/src/components/staff/TableNode.tsx` — компонент столика с цветом, формой, пульсацией.
- [x] 10. Создать `frontend/src/components/staff/TableDetailPanel.tsx` — панель управления столиком.
- [x] 11. Создать `frontend/src/components/staff/FloorMap.tsx` — основной компонент карты зала.
- [x] 12. Обновить `frontend/src/app/(staff)/dashboard/page.tsx` — интегрировать FloorMap + WebSocket подписку для live-обновлений столиков.
- [x] 13. `cd frontend && pnpm run build`

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта (включая бэкапы `docs/CONTEXT_BACKUP.md`, ROADMAP, файлы задач, исходный код и комментарии) должно производиться **СТРОГО в кодировке UTF-8**. Использование системной кодировки Windows CP1251 (Windows-1251) или создание смешанных кодировок (mixed encoding/mojibake) КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО. Всегда принудительно сохраняйте файлы в UTF-8.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их! Пуш или отчет без 100% успеха ЗАПРЕЩЕН.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
4. [ ] Запиши новые баги/решения в `docs/KNOWN_ISSUES_AND_PATTERNS.md` (только если уверен, что решение — best practice).
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`, `cd frontend && pnpm run dev`.
2. Зайти по адресу `http://localhost:3000/auth/login`, войти под учётными данными персонала (admin / password).
3. Перейти на `/dashboard` — должна отобразиться 2D-карта зала со столиками разных форм (круглые, квадратные).
4. Все столики должны быть зелёными (FREE) по умолчанию.
5. Открыть гостевое меню в другой вкладке, отправить заказ — столик на карте должен стать синим (OCCUPIED) в реальном времени.
6. Нажать «Вызвать официанта» в гостевом интерфейсе — столик на карте должен начать пульсировать красным + прозвучать звуковой сигнал.
7. Нажать на пульсирующий столик — открывается боковая панель с кнопкой «Подтвердить вызов». Нажать — столик перестаёт пульсировать.
8. В панели столика указать количество гостей (например, 3) — число должно отобразиться на столике.
9. Нажать «Освободить столик» — столик становится зелёным, количество гостей сбрасывается.
