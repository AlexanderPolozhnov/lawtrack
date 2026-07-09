# TASK: WebSocket STOMP сервер и оформление заказа с real-time трекингом статусов гостем

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Настроить WebSocket STOMP сервер на бэкенде, реализовать эндпоинт создания заказа `POST /api/v1/order` и сверстать корзину гостя и страницу live-трекинга статусов заказа через WebSocket.

---

## Контекст

- **Зависит от:** [TASK_05_MENU_API_AND_PWA_VIEW](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_05_MENU_API_AND_PWA_VIEW.md)
- **Затрагивает:** Both
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) #[секция-3]

## Документация для обязательного ознакомления перед началом:
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 5.4, 5.5, 11.1 и 14.
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Хранение данных и Кэширование.

> [!NOTE]
> **Сверка с эталонным проектом:** Для понимания структуры транзакционных JPA сервисов на бэкенде и структуры Next.js Zustand хранилищ на фронтенде обратитесь к следующим файлам `C:\.development\Projects\polozhnov-dev\`:
> - JPA транзакции и репозитории: `backend/src/main/java/com/alexanderpolozhnov/alexdev_app/order/service/OrderService.java` (если есть).
> - Zustand хранилища: `frontend/src/stores/` (например, персистентные корзины).

---

## Затронутые файлы

### Создать новые
- `backend/src/main/java/com/qtab/api/config/WebSocketConfig.java` — Конфигурация брокера сообщений WebSocket STOMP.
- `backend/src/main/java/com/qtab/api/order/OrderEntity.java` — JPA Entity для заказа.
- `backend/src/main/java/com/qtab/api/order/OrderItem.java` — JPA Entity для позиций заказа.
- `backend/src/main/java/com/qtab/api/order/OrderRepository.java` — Репозиторий заказов.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — Сервис создания заказов и WebSocket оповещений.
- `backend/src/main/java/com/qtab/api/order/OrderController.java` — REST контроллер заказов.
- `frontend/src/stores/useCartStore.ts` — Zustand хранилище корзины.
- `frontend/src/components/guest/CartDrawer.tsx` — Компонент корзины (сводка, изменение кол-ва, кнопка оформления).
- `frontend/src/app/(guest)/order/[orderId]/page.tsx` — Страница трекинга заказа (WebSocket клиент, статус-timeline).

---

## Точная реализация (Technical Design)

### 1. WebSocket Config (`WebSocketConfig.java`)
- Эндпоинт подключения: `/ws` с поддержкой SockJS и CORS для фронтенда (`*` или `http://localhost:3000`).
- Простой брокер сообщений: `/topic`, `/queue`. Префикс приложения: `/app`.

### 2. Логика создания заказа (`OrderService.java`)
- `POST /api/v1/order`:
  1. Вычислить суммы: `subtotal` (базовые цены + модификаторы), `total` = `subtotal`.
  2. Записать заказ в БД (`OrderEntity`, статус `CREATED`).
  3. Сохранить позиции `OrderItem` (связь с `menu_item`, количество, комментарий гостя).
  4. Опубликовать событие в WebSocket:
     - Тема: `/topic/restaurant/{restaurantId}/orders` (для панели официантов).
     - Полезная нагрузка: JSON со структурой `ORDER_CREATED`.
  5. Вернуть ID заказа.

### 3. Zustand Корзина (`useCartStore.ts`)
- Массив товаров: `id`, `menuItemId`, `name`, `quantity`, `price`, `selectedSize`, `selectedModifiers` (массив ID), `guestComment`.
- Методы: `addItem`, `removeItem`, `updateQuantity`, `clearCart`.

### 4. Страница Live-Трекинга (`order/[orderId]/page.tsx`)
- Подключается по STOMP к `/ws` при заходе на страницу.
- Подписывается на канал: `/user/queue/guest/{sessionId}` или `/topic/order/{orderId}` (бэкенд шлет обновления).
- Отображает Timeline-статусы: `Принят (CREATED) -> Готовится (COOKING) -> Готов (READY) -> Подан (SERVED)`.
- Интегрировать кнопку "Вызвать официанта" (отправка `POST /api/v1/order/{orderId}/call-waiter` → бэкенд шлет событие в `/topic/restaurant/{restaurantId}/tables`).

---

## Риски и подводные камни (Edge Cases)

- **WebSocket Reconnection:** Сеть на мобильных телефонах часто прерывается. WebSocket-клиент на фронтенде должен автоматически восстанавливать соединение (использовать `@stomp/stompjs` или аналоги с встроенным автореконнектом) и перезапрашивать статус по HTTP, если WebSocket не подключен.
- **Транзакционность:** Создание заказа и сохранение позиций на бэкенде должно происходить строго в единой транзакции (`@Transactional`).

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать `WebSocketConfig.java` с брокером.
- [x] 2. Создать entities `OrderEntity` и `OrderItem`.
- [x] 3. Написать репозитории и `OrderService` (оформление заказа, отправка WS оповещения).
- [x] 4. Реализовать `OrderController` с эндпоинтом `POST /api/v1/order`, вызовом официанта.
- [x] 5. Проверить сборку.

### Frontend
- [x] 6. Создать `useCartStore.ts`.
- [x] 7. Сверстать `CartDrawer.tsx` с анимацией.
- [x] 8. Подключить библиотеку `@stomp/stompjs` во фронтенд для работы по протоколу STOMP.
- [x] 9. Реализовать страницу `order/[orderId]/page.tsx` с живым изменением статусов и кнопкой вызова официанта.
- [x] 10. Проверить сборку фронтенда.

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

1. Сформировать корзину на фронтенде, нажать "Оформить заказ".
2. Проверить создание записи в БД в таблицах `orders` и `order_items`.
3. Убедиться, что гостя перенаправило на страницу `/order/{orderId}`.
4. Сымитировать отправку сообщения в топик WebSocket (через REST API или скрипт) о смене статуса заказа и проверить, что статус на странице гостя изменился на "Готовится" в реальном времени.
