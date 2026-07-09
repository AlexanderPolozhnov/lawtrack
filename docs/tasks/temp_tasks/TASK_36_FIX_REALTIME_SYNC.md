# TASK: Исправление Real-Time синхронизации — WebSocket, eventType, polling fallback

**Дата создания:** 2026-07-09  
**Приоритет:** Critical  
**Фаза:** Phase 6 (Полировка)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  
**Порядок выполнения:** 3 из 5

---

## Цель

После выполнения: все данные (заказы, статусы, позиции) обновляются в реальном времени без необходимости Ctrl+F5. Кухня мгновенно видит новые заказы после подтверждения, гость видит актуальный статус заказа, персонал видит изменения статусов позиций.

---

## Контекст

- **Зависит от:** TASK_34 (исправление цен — для чистой базы)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** `docs/FRONTEND_BACKEND_CONTRACT.md` — Секция WebSocket/STOMP Events

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `docs/FRONTEND_BACKEND_CONTRACT.md` — Секция WebSocket/STOMP Events.

### Суть проблемы — 3 бага:

#### Баг 1: `type` vs `eventType` рассинхронизация полей
**Backend** `OrderNotification` (Java record) имеет поле `type` → сериализуется в JSON как `{"type": "ORDER_CONFIRMED", ...}`.
**Но** `PaymentService` использует `Map.of("eventType", ...)` → сериализуется как `{"eventType": "..."}`.
**Frontend** проверяет `data.eventType` (kitchen/page.tsx строки 101, 113-117) — **никогда не совпадает** с `data.type` от OrderNotification.

Результат: кухня получает WS-сообщения, но не распознаёт их тип. Специфические обработчики (тост "Новый заказ", звук) не срабатывают. Данные обновляются только благодаря `else` ветке с `fetchOrders()`.

#### Баг 2: Гостевая страница не получает ORDER_STATUS_CHANGED при auto-recalculation
Когда кухня меняет статус позиции (PENDING → PREPARING), метод `recalculateOrderStatus()` обновляет статус заказа (CONFIRMED → PREPARING), но событие `ORDER_STATUS_CHANGED` отправляется только в staff topic (`/topic/restaurant/{id}/orders`), а **не** в guest topic (`/topic/order/{orderId}`).

Результат: у гостя статус заказа «застревает» на «Подтверждён», хотя кухня уже готовит.

#### Баг 3: Нет polling fallback при разрыве WebSocket
При потере WS-соединения (мобильный интернет, переключение вкладок, спящий режим) данные не обновляются до переподключения. Нет периодического HTTP-опроса как страховки.

---

## Затронутые файлы

### Создать новые
- Нет

### Изменить существующие

#### Backend:
- `backend/src/main/java/com/qtab/api/notification/dto/OrderNotification.java` — переименовать поле `type` → `eventType` для консистентности с фронтендом. **Внимание:** это Java record, нужно переименовать parameter в записи.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — в методе, который вызывается после `recalculateOrderStatus()` при auto-recalculation, добавить отправку `ORDER_STATUS_CHANGED` в guest topic `/topic/order/{orderId}` через `notificationService.notifyOrderSubscribers()`
- `backend/src/main/java/com/qtab/api/notification/NotificationService.java` — проверить что все методы используют `OrderNotification` с полем `eventType` (а не ручной `Map.of`)

#### Frontend:
- `frontend/src/app/(staff)/kitchen/page.tsx` — добавить polling fallback `refetchInterval: 30000` к fetch-логике как страховочный механизм
- `frontend/src/app/(staff)/dashboard/page.tsx` — добавить polling fallback аналогично
- `frontend/src/hooks/useStompClient.ts` — при reconnect очищать старые подписки (`subscriptionsRef.current.clear()`) перед повторной подпиской

---

## Точная реализация (Technical Design)

### Backend

#### 1. OrderNotification — переименование `type` → `eventType`

**Файл:** `backend/src/main/java/com/qtab/api/notification/dto/OrderNotification.java`

Найти текущее определение record (скорее всего):
```java
public record OrderNotification(
    String type,  // ← ПЕРЕИМЕНОВАТЬ
    // ... остальные поля
) {}
```

**Заменить на:**
```java
public record OrderNotification(
    String eventType,  // ← ПЕРЕИМЕНОВАНО для консистентности с фронтендом
    // ... остальные поля
) {}
```

> ⚠️ После переименования — grep по всему backend на `OrderNotification(` и `.type()` чтобы обновить все вызовы:
> - `OrderService.java` — все места где создаётся `new OrderNotification("ORDER_CONFIRMED", ...)` → обновить порядок аргументов если record
> - `NotificationService.java` — все вызовы `.type()` → `.eventType()`
> - `DeliveryFeedbackService.java` — если использует OrderNotification

#### 2. OrderService — отправка ORDER_STATUS_CHANGED в guest topic при auto-recalculation

В методе `updateItemStatus()` (строки ~738-805) после `recalculateOrderStatus()`:

**Найти** секцию после `recalculateOrderStatus(order)` и убедиться что вызывается метод, отправляющий событие в guest topic.

Если `sendOrderStatusChangedNotification()` уже отправляет в `/topic/order/{orderId}` — проверить что он вызывается.
Если нет — добавить вызов:

```java
// После recalculateOrderStatus(order):
OrderStatus newStatus = order.getStatus();
if (previousStatus != newStatus) {
    // Уведомить ГОСТЯ об изменении статуса заказа
    OrderNotification guestNotification = new OrderNotification(
        "ORDER_STATUS_CHANGED",
        order.getId().toString(),
        /* ... */
        newStatus.name(),
        /* itemId */ null,
        /* itemName */ null,
        /* itemStatus */ null,
        getStatusMessage(newStatus),
        Instant.now().toString()
    );
    notificationService.notifyOrderSubscribers(order.getId(), guestNotification);
}
```

> ⚠️ Точную сигнатуру конструктора OrderNotification нужно посмотреть в файле. Передай все required поля.

#### 3. NotificationService — проверка консистентности

Убедиться что `PaymentService` тоже использует `OrderNotification` record вместо ручного `Map.of("eventType", ...)`. Если PaymentService использует `Map.of`, заменить на `OrderNotification`.

### Frontend

#### 4. Kitchen page — polling fallback

В `kitchen/page.tsx` добавить `setInterval` для периодического refetch как fallback:

```typescript
// Polling fallback — каждые 30 секунд обновляем данные на случай разрыва WebSocket
useEffect(() => {
  const interval = setInterval(() => {
    fetchOrders();
  }, 30000);
  return () => clearInterval(interval);
}, [fetchOrders]);
```

Или, если используется state-based fetch, добавить аналогичный механизм.

#### 5. Dashboard page — polling fallback

Аналогично kitchen, добавить `setInterval` на 30 секунд для `fetchData()`.

#### 6. useStompClient — исправление reconnect

В хуке `useStompClient.ts`, в `onConnect` callback, **очистить** старые подписки перед созданием новых:

```typescript
onConnect: () => {
  console.log('[STOMP] Connected');
  
  // Очистить старые подписки при реконнекте
  subscriptionsRef.current.forEach(sub => {
    try { sub.unsubscribe(); } catch (e) { /* ignore */ }
  });
  subscriptionsRef.current.clear();
  
  // Подписаться на все топики заново
  topics.forEach(topic => {
    const sub = client.subscribe(topic, (message: IMessage) => {
      onMessageRef.current({
        body: message.body,
        headers: message.headers as Record<string, string>,
      });
    });
    subscriptionsRef.current.set(topic, sub);
  });
},
```

---

## Риски и подводные камни

- **Breaking change на переименовании `type` → `eventType`:** Все потребители OrderNotification (frontend и backend) должны быть обновлены одновременно. Фронтенд уже ожидает `eventType`, так что это фактически fix. Проверить StaffNotificationCenter — он проверяет ОБА поля (`data.type` и `data.eventType`), после переименования будет работать через `data.eventType`.
- **Polling + WebSocket:** 30-секундный polling НЕ заменяет WebSocket, а является fallback. При активном WS-соединении polling-данные будут дублировать уже имеющиеся — это безвредно (setState с тем же значением не вызовет ререндер).
- **Record immutability:** Java record не позволяет менять поля после создания. Переименование поля в record автоматически переименует accessor method.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. В `OrderNotification.java` — переименовать поле `type` → `eventType`.
- [x] 2. Grep по backend на `.type()` и обновить все вызовы OrderNotification: `OrderService`, `NotificationService`, `DeliveryFeedbackService`, `PaymentService`, `DeliveryFeedbackScheduler` и другие.
- [x] 3. `.\mvnw.cmd clean compile -q -DskipTests` — проверить компиляцию.
- [x] 4. В `OrderService.updateItemStatus()` — после `recalculateOrderStatus()`, если статус заказа изменился, отправить `ORDER_STATUS_CHANGED` в guest topic через `notificationService.notifyOrderSubscribers()`.
- [x] 5. Проверить `PaymentService` — заменить `Map.of("eventType", ...)` на `OrderNotification` record если используется.
- [x] 6. `.\mvnw.cmd clean compile -q -DskipTests` — проверить компиляцию.
- [x] 7. `.\mvnw.cmd test` — прогнать тесты.

### Frontend
- [x] 8. В `useStompClient.ts` — исправить reconnect: очищать `subscriptionsRef` в `onConnect` перед подпиской.
- [x] 9. В `kitchen/page.tsx` — добавить polling fallback (setInterval 30сек).
- [x] 10. В `dashboard/page.tsx` — добавить polling fallback (setInterval 30сек).
- [x] 11. В `StaffNotificationCenter.tsx` — убрать проверку `data.type`, оставить только `data.eventType` (теперь backend всегда шлёт `eventType`).
- [x] 12. `cd frontend && pnpm run build` — проверить сборку.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-09: Исправление Real-Time синхронизации WebSocket`.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — если требуется.
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. **Кухня получает заказы мгновенно:**
   - Открыть https://www.qtab.space/kitchen в одной вкладке
   - В другой — создать заказ через гостевой интерфейс, подтвердить код
   - Заказ должен появиться на кухне **мгновенно** (без Ctrl+F5), со звуком и тостом

2. **Гость видит актуальный статус:**
   - Открыть страницу трекинга заказа как гость
   - На кухне нажать «Взять в работу» → у гостя статус должен измениться с «Подтверждён» на «Готовится» в течение 1-2 секунд

3. **Polling fallback:**
   - Открыть DevTools → Network, отключить WebSocket
   - Подождать 30 секунд — данные должны обновиться через HTTP-запрос

4. **Reconnect:**
   - Открыть кухню, подождать WS-соединение (индикатор "WS Активен")
   - Временно убить WS-соединение (переключить WiFi) → индикатор покажет "WS Отключен"
   - Восстановить сеть → WS должен переподключиться, подписки восстановиться
