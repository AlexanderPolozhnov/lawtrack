# TASK: Панель персонала (Staff Dashboard) и экран кухни (Kitchen Display System)

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Реализовать API управления заказами/столиками для персонала, а также разработать интерфейсы Staff Dashboard (очередь заказов, обработка вызовов) и Kitchen Display System (KDS, очередь приготовления блюд на кухне) с обновлением в реальном времени.

---

## Контекст

- **Зависит от:** [TASK_06_WEBSOCKET_AND_ORDER_FLOW](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_06_WEBSOCKET_AND_ORDER_FLOW.md)
- **Затрагивает:** Both
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) #[секция-staff-api]

## Документация для обязательного ознакомления перед началом:
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 6.3, 6.4 и 11.1.
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Архитектурные правила монорепозитория.

> [!NOTE]
> **Сверка с эталонным проектом:** Для верстки дашбордов персонала и интеграции WebSocket-событий вы можете подсматривать примеры REST API контроллеров и аудио-оповещений в `C:\.development\Projects\polozhnov-dev\`:
> - Структура REST эндпоинтов и маппингов: `backend/src/main/java/com/alexanderpolozhnov/alexdev_app/ai/controller/` или `telegram/controller/`.
> - Аудио уведомления на клиенте: обратите внимание на логику уведомлений в реальном времени во фронтенде (если применимо).

---

## Затронутые файлы

### Создать новые
- `frontend/src/app/(staff)/dashboard/page.tsx` — Панель персонала (список заказов, активные вызовы).
- `frontend/src/app/(staff)/kitchen/page.tsx` — Экран кухни (KDS, контрастный интерфейс, очередь блюд).
- `frontend/src/components/staff/OrderQueueCard.tsx` — Карточка активного заказа для официанта.
- `frontend/src/components/staff/KitchenOrderCard.tsx` — Карточка блюд для повара.

### Изменить существующие
- `backend/src/main/java/com/qtab/api/order/OrderController.java` — Добавить REST эндпоинты для смены статуса заказов/позиций персоналом.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — Добавить бизнес-логику переключения статусов и рассылки WS событий.
- `backend/src/main/java/com/qtab/api/table/TableRepository.java` — Добавить методы поиска столиков по ресторану.
- `backend/src/main/java/com/qtab/api/table/TableController.java` — REST эндпоинты для управления столиками (статус, сброс вызовов).

---

## Точная реализация (Technical Design)

### 1. Backend REST API
- `GET /api/v1/staff/orders` — Получить список активных заказов (статусы: `CREATED`, `COOKING`, `READY`).
- `PATCH /api/v1/staff/orders/{orderId}/status` — Смена статуса заказа (`status` в body). При смене статуса на `COOKING` или `READY`:
  - Сохранить в БД.
  - Отправить WS сообщение гостю (`/user/queue/guest/{sessionId}`).
  - Отправить WS сообщение официантам (`/topic/restaurant/{restaurantId}/orders`).
- `POST /api/v1/staff/tables/{tableId}/acknowledge-call` — Подтвердить принятие вызова официанта (смена статуса стола с `NEEDS_ATTENTION` на `OCCUPIED`). Отправка обновления в `/topic/restaurant/{restaurantId}/tables`.

### 2. Интерфейс Официанта (`/staff/dashboard`)
- Разделы:
  1. **Активные Вызовы:** Список столов, откуда поступил вызов или запрос счета. Кнопка "Принять вызов" (вызывает `POST /acknowledge-call`).
  2. **Очередь Заказов:** Список активных заказов. Карточка заказа показывает номер стола, время создания, список позиций и кнопку перевода статуса: `CREATED -> Принять на кухню (COOKING) -> Готов (READY) -> Подан (SERVED)`.
- Реализовать звуковое оповещение (HTML5 Audio) при получении события вызова через топик `/topic/restaurant/{restaurantId}/tables`.

### 3. Экран кухни KDS (`/staff/kitchen`)
- Высококонтрастный темный интерфейс.
- Карточки сгруппированы по времени ожидания (более старые в начале).
- Каждая карточка содержит:
  - Номер столика, таймер времени с момента заказа.
  - Позиции: название, количество, **комментарий гостя** (выделить желтым/красным, если указаны аллергены/исключения).
  - Кнопка "Готово" напротив каждой позиции (или заказа в целом). Нажатие переводит статус в `READY`.

---

## Риски и подводные камни (Edge Cases)

- **Шум на кухне и пропущенные заказы:** Визуальная вибрация карточек (CSS animation pulse) и звуковые сигналы критически важны для KDS.
- **Права доступа:** Убедиться, что эндпоинты `/api/v1/staff/**` защищены Spring Security и требуют роль `WAITER`, `KITCHEN` или `ADMIN`.

---

## Порядок реализации для агента

### Backend
- [x] 1. Добавить методы обновления статусов в `OrderService.java` и `OrderController.java`.
- [x] 2. Реализовать эндпоинт подтверждения вызовов официанта в `TableController.java`.
- [x] 3. Написать Unit-тесты для смены статусов заказов и проверки авторизации персонала.

### Frontend
- [x] 4. Сверстать страницу Staff Dashboard `/staff/dashboard` (список заказов, обработка вызовов).
- [x] 5. Реализовать звуковые уведомления через Web Audio API.
- [x] 6. Сверстать экран KDS `/staff/kitchen` с крупным шрифтом и карточками блюд.
- [x] 7. Подключить WebSocket-подписки в компонентах персонала.
- [x] 8. Проверить сборку фронтенда: `pnpm run build`.

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

1. Авторизоваться под учетной записью официанта на фронтенде и открыть `/staff/dashboard`.
2. В другой вкладке открыть `/staff/kitchen` (повар).
3. Со стороны гостя отправить заказ.
4. Проверить, что на KDS и Staff Dashboard мгновенно появился заказ (без перезагрузки страницы).
5. На KDS нажать "Готово" -> проверить, что статус заказа на Staff Dashboard изменился на "Готов", а у гостя на странице трекинга отобразился статус "Готов к подаче".
