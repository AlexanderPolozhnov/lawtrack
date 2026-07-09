# TASK: TASK_06_BONUS_FEATURES (Дополнительные фичи: таймлайн событий, карточка дела в Drawer, дедлайны и темная тема)

**Дата создания:** 2026-07-09  
**Приоритет:** Medium  
**Фаза:** Phase 4  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализована хронология действий по делу клиента (таймлайн событий в БД и интерфейсе), боковая панель (Drawer) с подробной карточкой клиента, визуальная индикация просроченных дедлайнов и переключатель темной темы.

---

## Контекст

- **Зависит от:** TASK_05_FRONTEND_CLIENTS
- **Затрагивает:** Both (Backend, Frontend)
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md #Модуль 3

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — создание схем Flyway, анимации переходов, темы Tailwind v4.
- `TZ_LawTrack_CRM.md` — раздел 3.2 (схема `client_events`) и раздел 8 (приоритеты P2).

---

## Затронутые файлы

### Создать новые
- `backend/src/main/resources/db/migration/V2__client_events.sql` — миграция таблицы событий.
- `backend/src/main/java/com/lawtrack/entity/ClientEvent.java` — Entity события.
- `backend/src/main/java/com/lawtrack/entity/ClientEventType.java` — Enum типов событий (`CREATED`, `STATUS_CHANGED`, `NOTE_ADDED`).
- `backend/src/main/java/com/lawtrack/dto/request/CreateNoteRequest.java` — Request для добавления заметки.
- `backend/src/main/java/com/lawtrack/dto/response/ClientEventResponse.java` — Response DTO события.
- `backend/src/main/java/com/lawtrack/repository/ClientEventRepository.java` — Репозиторий событий.
- `frontend/src/components/client-details-drawer.tsx` — боковая панель с деталями дела и таймлайном.

### Изменить существующие
- `backend/src/main/java/com/lawtrack/service/ClientService.java` — логирование событий при создании/изменении статуса, добавление ручных заметок.
- `backend/src/main/java/com/lawtrack/controller/ClientController.java` — эндпоинты `GET /api/clients/{id}/events` и `POST /api/clients/{id}/notes`.
- `frontend/src/lib/types.ts` — добавить типы для событий.
- `frontend/src/lib/api.ts` — добавить функции fetchEvents и addNote.
- `frontend/src/components/client-row.tsx` — сделать строку таблицы кликабельной для открытия Drawer.
- `frontend/src/app/page.tsx` — подключить Drawer для выбранного клиента.
- `frontend/src/app/globals.css` — стили для темной темы.

---

## Точная реализация (Technical Design)

### Схема событий (`V2__client_events.sql`)
```sql
CREATE TABLE client_events (
    id          BIGSERIAL PRIMARY KEY,
    client_id   BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_events_client_id ON client_events(client_id);
```

### Автоматическая генерация событий
В `ClientService` при:
- `createClient`: автоматически сохранять запись в `client_events` с типом `CREATED` и описанием `Клиент создан`.
- `updateStatus`: автоматически сохранять запись в `client_events` с типом `STATUS_CHANGED` и описанием `Статус изменен с {old} на {new}`.

### Фронтенд: Индикация просрочки дедлайна
В `ClientRow` и `ClientDetailsDrawer` сравнивать поле `deadline` (если задано) с текущей датой. Если `deadline < today` и `status != 'CLOSED'`, то показывать дедлайн красным цветом с иконкой предупреждения (`AlertCircle`).

### Темная тема
В `globals.css` настроить медиа-запрос `@media (prefers-color-scheme: dark)` или класс `.dark` для инверсии цветов. Добавить простой переключатель темы (`theme-toggle.tsx`) в Header.

---

## Риски и подводные камни (Edge Cases)

- **Каскадное удаление:** При удалении клиента (`DELETE /api/clients/{id}`) все его события должны удаляться автоматически через внешний ключ `ON DELETE CASCADE`.
- **Форматирование дат:** Даты событий должны красиво форматироваться на русском языке (например, "9 июля 2026, 14:15") с помощью `date-fns/locale/ru`.

---

## Порядок реализации для агента

### Backend
- [ ] 1. Создать миграцию `V2__client_events.sql`.
- [ ] 2. Создать Enum `ClientEventType` и Entity `ClientEvent`.
- [ ] 3. Создать DTO `CreateNoteRequest` и `ClientEventResponse`.
- [ ] 4. Создать `ClientEventRepository`.
- [ ] 5. Обновить `ClientService` для сохранения событий `CREATED` и `STATUS_CHANGED`, а также метод `addNote` для добавления ручных заметок.
- [ ] 6. Обновить `ClientController` (добавить GET `/api/clients/{id}/events` и POST `/api/clients/{id}/notes`).
- [ ] 7. Скомпилировать и запустить тесты бэкенда: `cd backend && .\mvnw.cmd clean test`.

### Frontend
- [ ] 8. Добавить типы и API-функции во фронтенд (`lib/types.ts`, `lib/api.ts`).
- [ ] 9. Создать компонент `client-details-drawer.tsx` (используя shadcn `Sheet` или `Drawer`). Показать в нем:
  - Информацию о деле, дедлайн с индикацией просрочки.
  - Форму добавления заметки.
  - Список событий (таймлайн с точками и линиями).
- [ ] 10. Обновить `client-row.tsx`, чтобы при клике на строку (кроме селектора статуса) открывался Drawer.
- [ ] 11. Добавить переключатель темы в Header и настроить стили темной темы в `globals.css`.
- [ ] 12. Проверить сборку фронтенда: `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]` для Фазы 4.
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть приложение, кликнуть по строке клиента. Должна открыться боковая панель с деталями.
2. В боковой панели добавить текстовую заметку (например, "Созвонился с судом, заседание назначено на 20-е"). Убедиться, что заметка появилась на таймлайне сверху вниз.
3. Изменить статус клиента. Убедиться, что на таймлайне автоматически появилась запись о смене статуса.
4. Добавить клиента с прошедшим дедлайном. Убедиться, что в таблице и в панели дедлайн отображается красным.
5. Переключить темную тему, проверить визуальную корректность элементов.
