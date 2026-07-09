# TASK: Backend — Order Confirmation Code, Per-Item Statuses, KDS API, Notification Service

**Дата создания:** 2026-07-08  
**Приоритет:** High  
**Фаза:** Phase 4 (Integration & Polish)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

> [!TIP]
> Эта задача — чисто бэкенд. Крупная архитектурная доработка: добавление 4-значного кода подтверждения заказа, per-item статусов, выделенного KDS API, и NotificationService для WebSocket.

---

## Цель

Реализовать полный backend order lifecycle: (1) 4-значный код подтверждения заказа, (2) независимые per-item статусы на кухне, (3) выделенный Kitchen API с endpoint'ами, (4) NotificationService как абстракция над WebSocket/Telegram, (5) автоматическое вычисление статуса заказа из статусов позиций.

---

## Контекст

- **Зависит от:** TASK_28_PRODUCTION_BUGFIXES
- **Затрагивает:** Backend only
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — секции Orders, Staff, Kitchen

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — MapStruct для маппинга, `@Valid` на все DTO, `MessageDigest.isEqual` для constant-time сравнений, Flyway миграции.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- **Выжимка из текущего кода:**
  - `OrderService.java` (701 строк) — монолитный сервис, WebSocket отправляется inline через `SimpMessagingTemplate`
  - `OrderStatus` enum: `CREATED, COOKING, READY, SERVED, CANCELLED, PAID`
  - `OrderItem` entity имеет поле `status` типа `OrderStatus` (а не `OrderItemStatus`)
  - Нет confirmation code в БД и коде — нужно добавить
  - Нет per-item status updates — `updateOrderStatus()` ставит одинаковый статус на ВСЕ items
  - Нет KDS controller — кухня использует `/api/v1/staff/orders`
  - Нет NotificationService — всё inline

---

## Затронутые файлы

### Создать новые

#### 1. Flyway миграция
- `backend/src/main/resources/db/migration/V15__add_confirmation_code_and_item_status.sql`
  - Добавить `confirmation_code VARCHAR(4)` в таблицу `orders`
  - Добавить `confirmed_at TIMESTAMP` в таблицу `orders`
  - Создать отдельный `OrderItemStatus` — НЕ нужен как отдельная таблица, но нужно обновить тип `status` в `order_items` чтобы допускать значения нового enum

#### 2. OrderItemStatus enum (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/order/OrderItemStatus.java`
  - Значения: `PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`
  - Отдельный enum от `OrderStatus` потому что набор статусов различается

#### 3. Notification Service (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/notification/NotificationService.java`
  - Абстракция над WebSocket + Telegram
  - Методы:
    - `notifyStaff(Long restaurantId, OrderNotification notification)` — WebSocket + Telegram
    - `notifyKitchen(Long restaurantId, OrderNotification notification)` — WebSocket
    - `notifyGuest(String sessionId, OrderNotification notification)` — WebSocket
    - `notifyOrderSubscribers(Long orderId, OrderNotification notification)` — WebSocket

#### 4. OrderNotification DTO (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/notification/dto/OrderNotification.java`
  ```java
  public record OrderNotification(
      String type,        // "ORDER_CREATED", "ORDER_STATUS_CHANGED", "ITEM_STATUS_CHANGED", "CONFIRMATION_REQUIRED", etc.
      Long orderId,
      Long tableId,
      Integer tableNumber,
      String status,      // nullable — order status
      Long itemId,        // nullable — for item-specific events
      String itemName,    // nullable — human-readable item name
      String itemStatus,  // nullable — item status
      String message,     // human-readable message in Russian
      LocalDateTime timestamp
  ) {}
  ```

#### 5. ConfirmOrderRequest DTO (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/order/dto/ConfirmOrderRequest.java`
  ```java
  public record ConfirmOrderRequest(
      @NotBlank @Size(min = 4, max = 4) String code
  ) {}
  ```

#### 6. KitchenController (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/order/KitchenController.java`
  - Endpoint'ы:
    - `GET /api/v1/kitchen/orders` — заказы со статусом `CONFIRMED` или с items в статусе `PENDING`/`PREPARING`
    - `POST /api/v1/kitchen/orders/{orderId}/take` — взять заказ в работу (все items → PREPARING)
    - `PATCH /api/v1/kitchen/orders/{orderId}/items/{itemId}/status` — обновить статус конкретной позиции
  - Защита: JWT + roles `KITCHEN`, `ADMIN`, `MANAGER`
  - Header `X-Restaurant-Id` для tenant isolation

#### 7. UpdateItemStatusRequest DTO (НОВЫЙ)
- `backend/src/main/java/com/qtab/api/order/dto/UpdateItemStatusRequest.java`
  ```java
  public record UpdateItemStatusRequest(
      @NotNull OrderItemStatus status
  ) {}
  ```

### Изменить существующие

#### 1. OrderEntity.java
- Добавить поля:
  ```java
  @Column(name = "confirmation_code", length = 4)
  private String confirmationCode;
  
  @Column(name = "confirmed_at")
  private LocalDateTime confirmedAt;
  ```
- Добавить `PENDING_CONFIRMATION` и `CONFIRMED` в OrderStatus

#### 2. OrderStatus.java — ИЗМЕНИТЬ enum
- Было: `CREATED, COOKING, READY, SERVED, CANCELLED, PAID`
- Стало: `PENDING_CONFIRMATION, CONFIRMED, PREPARING, READY, SERVED, CANCELLED, PAID`
- `CREATED` → `PENDING_CONFIRMATION` (при создании заказа — ожидает код)
- `COOKING` → `PREPARING` (стандартизация)
- Добавить `CONFIRMED` (код введён, заказ передан на кухню)
- ⚠️ **КРИТИЧЕСКИ ВАЖНО**: Нужна Flyway миграция для обновления существующих данных в БД:
  ```sql
  UPDATE orders SET status = 'PENDING_CONFIRMATION' WHERE status = 'CREATED';
  UPDATE orders SET status = 'PREPARING' WHERE status = 'COOKING';
  UPDATE order_items SET status = 'PENDING' WHERE status = 'CREATED';
  UPDATE order_items SET status = 'PREPARING' WHERE status = 'COOKING';
  ```

#### 3. OrderItem.java — ИЗМЕНИТЬ тип статуса
- Изменить тип поля `status` с `OrderStatus` на `OrderItemStatus`
- Маппинг: `@Enumerated(EnumType.STRING) private OrderItemStatus status;`

#### 4. OrderService.java — РЕФАКТОРИНГ (701 → ~400 строк + NotificationService)

**Метод `createOrder()` — изменить:**
- Статус заказа при создании: `PENDING_CONFIRMATION` (вместо `CREATED`)
- Статус items при создании: `OrderItemStatus.PENDING`
- Генерировать 4-значный confirmation code:
  ```java
  private String generateConfirmationCode() {
      SecureRandom random = new SecureRandom();
      return String.format("%04d", 1000 + random.nextInt(9000));
  }
  ```
- Сохранить code в `order.setConfirmationCode(code)`
- Отправить notification через `notificationService.notifyStaff()` с типом `CONFIRMATION_REQUIRED`
- В ответе `CreateOrderResponse` вернуть `orderId` и `status = PENDING_CONFIRMATION` (НЕ код!)
- Код отправляется ТОЛЬКО на табло официанта (не гостю!)

**Добавить метод `confirmOrder(Long orderId, ConfirmOrderRequest request)`:**
```java
@Transactional
public OrderDetailsResponse confirmOrder(Long orderId, ConfirmOrderRequest request) {
    OrderEntity order = orderRepository.findById(orderId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    
    if (order.getStatus() != OrderStatus.PENDING_CONFIRMATION) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order is not pending confirmation");
    }
    
    // Constant-time comparison (timing attack prevention)
    if (!MessageDigest.isEqual(
            order.getConfirmationCode().getBytes(StandardCharsets.UTF_8),
            request.code().getBytes(StandardCharsets.UTF_8))) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid confirmation code");
    }
    
    order.setStatus(OrderStatus.CONFIRMED);
    order.setConfirmedAt(LocalDateTime.now());
    order = orderRepository.save(order);
    
    // Уведомить кухню о новом подтверждённом заказе
    notificationService.notifyKitchen(order.getRestaurantId(), 
        new OrderNotification("ORDER_CONFIRMED", order.getId(), ...));
    
    // Уведомить гостя что заказ подтверждён
    notificationService.notifyGuest(order.getSessionId(),
        new OrderNotification("ORDER_STATUS_CHANGED", order.getId(), ...));
    
    return mapToDetailsResponse(order);
}
```

**Изменить метод `updateOrderStatus()`:**
- Убрать массовое обновление ВСЕХ items — статус заказа теперь вычисляется из статусов items
- Разрешённые ручные переходы ТОЛЬКО: `CONFIRMED → PREPARING`, `SERVED → PAID`, `* → CANCELLED`
- Остальные переходы (`PREPARING → READY → SERVED`) вычисляются автоматически из item статусов

**Добавить метод `updateItemStatus(Long orderId, Long itemId, UpdateItemStatusRequest request)`:**
```java
@Transactional
public OrderDetailsResponse updateItemStatus(Long orderId, Long itemId, UpdateItemStatusRequest request) {
    OrderEntity order = orderRepository.findById(orderId)...;
    OrderItem item = order.getItems().stream()
        .filter(i -> i.getId().equals(itemId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
    
    // Validate transition
    validateItemStatusTransition(item.getStatus(), request.status());
    
    item.setStatus(request.status());
    item.setStatusUpdatedAt(LocalDateTime.now());  // ← нужно добавить это поле
    
    // Auto-calculate order status from items
    recalculateOrderStatus(order);
    
    orderRepository.save(order);
    
    // Notify all subscribers
    notificationService.notifyOrderSubscribers(orderId, ...);
    notificationService.notifyStaff(order.getRestaurantId(), ...);
    if (request.status() == OrderItemStatus.READY) {
        notificationService.notifyGuest(order.getSessionId(), ...);
    }
    
    return mapToDetailsResponse(order);
}
```

**Добавить метод `recalculateOrderStatus(OrderEntity order)`:**
```java
private void recalculateOrderStatus(OrderEntity order) {
    List<OrderItemStatus> itemStatuses = order.getItems().stream()
        .filter(i -> i.getStatus() != OrderItemStatus.CANCELLED)
        .map(OrderItem::getStatus)
        .toList();
    
    if (itemStatuses.isEmpty()) {
        order.setStatus(OrderStatus.CANCELLED);
    } else if (itemStatuses.stream().allMatch(s -> s == OrderItemStatus.SERVED)) {
        order.setStatus(OrderStatus.SERVED);
    } else if (itemStatuses.stream().allMatch(s -> s == OrderItemStatus.READY || s == OrderItemStatus.SERVED)) {
        order.setStatus(OrderStatus.READY);
    } else if (itemStatuses.stream().anyMatch(s -> s == OrderItemStatus.PREPARING)) {
        order.setStatus(OrderStatus.PREPARING);
    }
    // Если все PENDING — статус остаётся CONFIRMED
}
```

**Вынести все WebSocket/Telegram вызовы в NotificationService:**
- Удалить прямые вызовы `messagingTemplate.convertAndSend(...)` из OrderService
- Удалить прямые вызовы `telegramBotService.sendMessage(...)` из OrderService
- Заменить на `notificationService.notifyStaff/Kitchen/Guest/OrderSubscribers()`

#### 5. OrderController.java — ДОБАВИТЬ endpoint
- Добавить:
  ```java
  @PostMapping("/order/{orderId}/confirm")
  public ResponseEntity<OrderDetailsResponse> confirmOrder(
      @PathVariable Long orderId,
      @Valid @RequestBody ConfirmOrderRequest request) {
      return ResponseEntity.ok(orderService.confirmOrder(orderId, request));
  }
  ```

#### 6. OrderDetailsResponse.java — ДОБАВИТЬ поля
- Добавить: `String confirmationCode` (только для staff endpoint'ов, null для guest!)
- Добавить: `LocalDateTime confirmedAt`

#### 7. OrderItemDetailsResponse.java — ИЗМЕНИТЬ тип статуса
- Изменить тип `status` с `OrderStatus` на `OrderItemStatus`
- Добавить `LocalDateTime statusUpdatedAt`

#### 8. CreateOrderResponse.java — ДОБАВИТЬ
- Статус уже есть. Подтвердить что возвращается `PENDING_CONFIRMATION` (не код!)

#### 9. SecurityConfig.java — ДОБАВИТЬ маршруты
- Добавить `/api/v1/kitchen/**` к разрешённым маршрутам для ролей `KITCHEN`, `ADMIN`, `MANAGER`
- Endpoint `/api/v1/order/{orderId}/confirm` оставить `permitAll` (гостевой)

#### 10. getActiveOrders() — ОБНОВИТЬ список статусов
- Было: `CREATED, COOKING, READY, SERVED`
- Стало: `PENDING_CONFIRMATION, CONFIRMED, PREPARING, READY, SERVED`

---

## Точная реализация (Technical Design)

### Backend

#### Flyway V15
```sql
-- V15__add_confirmation_code_and_item_status.sql

-- 1. Add confirmation code and confirmed_at to orders
ALTER TABLE orders ADD COLUMN confirmation_code VARCHAR(4);
ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMP;

-- 2. Add status_updated_at to order_items
ALTER TABLE order_items ADD COLUMN status_updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- 3. Migrate existing statuses
UPDATE orders SET status = 'PENDING_CONFIRMATION' WHERE status = 'CREATED';
UPDATE orders SET status = 'PREPARING' WHERE status = 'COOKING';
UPDATE order_items SET status = 'PENDING' WHERE status = 'CREATED';
UPDATE order_items SET status = 'PREPARING' WHERE status = 'COOKING';

-- 4. Create index for fast lookup by confirmation code
CREATE INDEX idx_orders_confirmation_code ON orders(confirmation_code) WHERE confirmation_code IS NOT NULL;
```

#### OrderItemStatus.java (НОВЫЙ enum)
```java
package com.qtab.api.order;

public enum OrderItemStatus {
    PENDING,      // Ожидает начала приготовления
    PREPARING,    // Готовится
    READY,        // Готово к выдаче
    SERVED,       // Подано гостю
    CANCELLED     // Отменено
}
```

#### NotificationService.java
```java
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final TelegramBotService telegramBotService;
    
    public void notifyStaff(Long restaurantId, OrderNotification notification) {
        messagingTemplate.convertAndSend(
            "/topic/restaurant/" + restaurantId + "/orders", notification);
        // Telegram — только для важных событий
        if ("CONFIRMATION_REQUIRED".equals(notification.type()) || 
            "ORDER_CONFIRMED".equals(notification.type())) {
            sendTelegramNotification(restaurantId, notification);
        }
    }
    
    public void notifyKitchen(Long restaurantId, OrderNotification notification) {
        messagingTemplate.convertAndSend(
            "/topic/restaurant/" + restaurantId + "/kitchen", notification);
    }
    
    public void notifyGuest(String sessionId, OrderNotification notification) {
        messagingTemplate.convertAndSend(
            "/queue/guest/" + sessionId, notification);
    }
    
    public void notifyOrderSubscribers(Long orderId, OrderNotification notification) {
        messagingTemplate.convertAndSend(
            "/topic/order/" + orderId, notification);
    }
    
    private void sendTelegramNotification(Long restaurantId, OrderNotification notification) {
        // ... telegram formatting and sending
    }
}
```

#### Item status transitions validation
```java
private void validateItemStatusTransition(OrderItemStatus current, OrderItemStatus target) {
    boolean valid = switch (target) {
        case PREPARING -> current == OrderItemStatus.PENDING;
        case READY -> current == OrderItemStatus.PREPARING;
        case SERVED -> current == OrderItemStatus.READY;
        case CANCELLED -> current != OrderItemStatus.SERVED; // can cancel anything except served
        case PENDING -> false; // can't go back to pending
    };
    if (!valid) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
            "Invalid status transition: " + current + " → " + target);
    }
}
```

---

## Риски и подводные камни (Edge Cases)

- **Обратная совместимость БД:** Flyway V15 мигрирует `CREATED` → `PENDING_CONFIRMATION` и `COOKING` → `PREPARING`. Все существующие заказы будут обновлены. Если есть active orders с `CREATED` status на проде — они станут `PENDING_CONFIRMATION` и "зависнут" (нет кода). **Решение**: добавить в миграцию `UPDATE orders SET status = 'CONFIRMED' WHERE status = 'CREATED' AND id IN (SELECT id FROM orders WHERE status = 'CREATED')` — чтобы существующие заказы считались уже подтверждёнными. Или лучше: `UPDATE orders SET status = 'PREPARING'` для всех `CREATED` что уже в работе.
- **OrderItem.status тип**: Меняем с `OrderStatus` на `OrderItemStatus` — это breaking change для существующего кода. Все места где читается `item.getStatus()` нужно обновить.
- **Confirmation code uniqueness**: 4-значный код (1000-9999) не уникален глобально. Уникален только в контексте одного ресторана + активного заказа. При 9000 возможных кодов и ~50 активных заказов — вероятность коллизии <1%.
- **Race condition**: Два одновременных запроса на confirm с одним кодом — нужен `@Transactional` с `REPEATABLE_READ` или `findByIdForUpdate()`.
- **Staff should see the code**: `confirmationCode` должен быть виден в staff endpoint response, но НЕ в guest endpoint response. Нужно 2 разных маппера или nullify в guest response.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Flyway миграция `V15__add_confirmation_code_and_item_status.sql`.
- [x] 2. Создать `OrderItemStatus.java` enum.
- [x] 3. Создать `OrderNotification.java` DTO.
- [x] 4. Создать `ConfirmOrderRequest.java` DTO.
- [x] 5. Создать `UpdateItemStatusRequest.java` DTO.
- [x] 6. Создать `NotificationService.java` — вынести WebSocket + Telegram логику.
- [x] 7. Обновить `OrderStatus.java` enum — заменить `CREATED→PENDING_CONFIRMATION`, `COOKING→PREPARING`, добавить `CONFIRMED`.
- [x] 8. Обновить `OrderEntity.java` — добавить `confirmationCode`, `confirmedAt`.
- [x] 9. Обновить `OrderItem.java` — изменить тип `status` на `OrderItemStatus`, добавить `statusUpdatedAt`.
- [x] 10. Обновить `OrderService.java`:
  - [x] 10a. Inject `NotificationService`, удалить прямые вызовы `messagingTemplate` и `telegramBotService`.
  - [x] 10b. Изменить `createOrder()` — status `PENDING_CONFIRMATION`, generate confirmation code.
  - [x] 10c. Добавить `confirmOrder()` с constant-time code verification.
  - [x] 10d. Добавить `updateItemStatus()` с per-item status changes.
  - [x] 10e. Добавить `recalculateOrderStatus()` — auto-calculate order status from items.
  - [x] 10f. Обновить `updateOrderStatus()` — ограничить ручные переходы.
  - [x] 10g. Обновить `getActiveOrders()` — новые статусы.
- [x] 11. Обновить `OrderController.java` — добавить `POST /order/{orderId}/confirm`.
- [x] 12. Создать `KitchenController.java` — `GET/POST/PATCH /api/v1/kitchen/orders/**`.
- [x] 13. Обновить `SecurityConfig.java` — добавить `/api/v1/kitchen/**` маршруты.
- [x] 14. Обновить `OrderDetailsResponse.java` и `OrderItemDetailsResponse.java` — новые поля.
- [x] 15. `.\mvnw.cmd clean compile -q -DskipTests` — финальная проверка компиляции.
- [x] 16. `.\mvnw.cmd test` — запуск тестов (исправить если падают).

### Frontend
— Не трогаем в этой задаче

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**. CP1251 ЗАПРЕЩЕНО.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-08: TASK_29 Order Confirmation & Per-Item Statuses Backend`.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md`.
5. [x] Перемести файл из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Протестируй руками (гайд ниже).

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`
2. **Создание заказа (guest):**
   ```bash
   curl -X POST http://localhost:8080/api/v1/order \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test-session","restaurantId":1,"tableId":1,"items":[{"menuItemId":1,"quantity":1}]}'
   ```
   - Ожидание: `status: "PENDING_CONFIRMATION"`, заказ появляется на WebSocket `/topic/restaurant/1/orders`
3. **Подтверждение заказа (guest с кодом от официанта):**
   ```bash
   curl -X POST http://localhost:8080/api/v1/order/{orderId}/confirm \
     -H "Content-Type: application/json" \
     -d '{"code":"XXXX"}'
   ```
   - Ожидание: `status: "CONFIRMED"`, заказ появляется на WebSocket кухни
4. **Кухня берёт в работу:**
   ```bash
   curl -X POST http://localhost:8080/api/v1/kitchen/orders/{orderId}/take \
     -H "Authorization: Bearer {jwt}" \
     -H "X-Restaurant-Id: 1"
   ```
   - Ожидание: все items → `PREPARING`, order → `PREPARING`
5. **Кухня завершает позицию:**
   ```bash
   curl -X PATCH http://localhost:8080/api/v1/kitchen/orders/{orderId}/items/{itemId}/status \
     -H "Authorization: Bearer {jwt}" \
     -H "X-Restaurant-Id: 1" \
     -H "Content-Type: application/json" \
     -d '{"status":"READY"}'
   ```
   - Ожидание: item → `READY`. Если все items `READY` — order → `READY`.
