# TASK: Кастомные уведомления персонала, пост-доставка фидбек, умное управление статусами

**Дата создания:** 2026-07-08  
**Приоритет:** High  
**Фаза:** Phase 4 (Integration & Polish)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

> [!TIP]
> Эта задача — Full-Stack. Зависит от TASK_29 и TASK_30.
> Включает: (1) красивую кастомную систему уведомлений для персонала, (2) пост-доставка фидбек от гостя через 5 минут, (3) автоматические таймеры предупреждений о задержках, (4) умное уведомление официанта о готовых к выдаче позициях.

---

## Цель

Реализовать premium-уровень UX для персонала и гостей: (1) кастомные in-app уведомления для staff/kitchen привязанные к конкретному заказу/столику, (2) неназойливый пост-доставка фидбек "Вам подали блюдо?" через 5 минут, (3) таймеры задержек с визуальными индикаторами, (4) звуковые сигналы по типу событий.

---

## Контекст

- **Зависит от:** TASK_29 + TASK_30 (confirmation code + per-item statuses)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — WebSocket

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — Tailwind CSS v4, Framer Motion, shadcn/ui.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- **Выжимка из текущего кода:**
  - `lib/sounds.ts` — уже есть Web Audio API синтезированные звуки (playNewOrderSound, playCallWaiterSound, playRequestBillSound, playAlertSound). Нужно расширить набор звуков.
  - Staff dashboard использует `toast()` от Sonner для уведомлений — это чужеродно, нужны кастомные.
  - Нет механизма "пост-доставка фидбек" — нужно добавить backend scheduled task + frontend prompt.
  - Нет таймеров задержек — нужно добавить elapsed time tracking с визуальными предупреждениями.

---

## Затронутые файлы

### Создать новые

#### Backend

##### 1. DeliveryFeedbackScheduler.java — Scheduled задача для пост-доставка фидбек
- `backend/src/main/java/com/qtab/api/order/DeliveryFeedbackScheduler.java`
  - `@Scheduled(fixedRate = 60000)` — каждую минуту проверяет items со статусом `SERVED` у которых `statusUpdatedAt` > 5 минут назад
  - Отправляет WebSocket event гостю: `DELIVERY_FEEDBACK_REQUEST` с данными позиции
  - Помечает item как `feedbackRequested = true` в Redis (чтобы не спрашивать повторно)
  - TTL в Redis: 30 минут (после этого запрос сгорает)

##### 2. DeliveryFeedbackController.java — Endpoint для фидбека от гостя
- `backend/src/main/java/com/qtab/api/order/DeliveryFeedbackController.java`
  - `POST /api/v1/order/{orderId}/items/{itemId}/delivery-feedback`
  - Body: `{ "delivered": boolean, "comment": string? }`
  - Если `delivered = false` — уведомить staff через WebSocket + Telegram, создать запись в `delivery_issues`
  - Если `delivered = true` — просто пометить как получено

##### 3. Flyway V16 — delivery_issues таблица
- `backend/src/main/resources/db/migration/V16__create_delivery_issues_table.sql`
  ```sql
  CREATE TABLE delivery_issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id),
      order_item_id UUID NOT NULL,
      restaurant_id UUID NOT NULL REFERENCES restaurants(id),
      table_id UUID NOT NULL,
      issue_type VARCHAR(50) NOT NULL DEFAULT 'NOT_DELIVERED',
      guest_comment TEXT,
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP
  );
  CREATE INDEX idx_delivery_issues_restaurant ON delivery_issues(restaurant_id);
  ```

#### Frontend

##### 4. StaffNotificationCenter.tsx — Кастомный компонент уведомлений
- `frontend/src/components/staff/StaffNotificationCenter.tsx`
  - Плавающая панель уведомлений в правом верхнем углу
  - Каждое уведомление — кастомная карточка (НЕ toast от Sonner):
    - Иконка типа события
    - Номер столика (крупно)
    - Краткое описание
    - Время
    - Кнопки действий (если применимо)
  - Типы уведомлений с разными цветами:
    - 🔵 `CONFIRMATION_REQUIRED` — новый заказ требует код (синий пульс)
    - 🟢 `ITEM_READY` — позиция готова к выдаче (зелёный)
    - 🟡 `ORDER_READY` — весь заказ готов (золотой)
    - 🔴 `DELIVERY_ISSUE` — гость не получил блюдо (красный, не исчезает)
    - 🔔 `CALL_WAITER` — вызов официанта (красный пульс)
    - 💰 `BILL_REQUESTED` — запрос счёта (жёлтый)
  - Анимации: slide-in справа, auto-dismiss через 15 сек (кроме критических)
  - Badge-счётчик непрочитанных на кнопке колокольчика
  - История уведомлений (последние 50) с пометкой прочитано/непрочитано

##### 5. DeliveryFeedbackPrompt.tsx — Неназойливый промпт для гостя
- `frontend/src/components/guest/DeliveryFeedbackPrompt.tsx`
  - Небольшой bottom-sheet/toast, появляется через 5 минут после `SERVED`
  - Текст: "Вам уже подали [название блюда]?"
  - 2 кнопки: "Да ✅" и "Нет, ещё жду 🕐"
  - Если "Нет" — показать текст "Извините за задержку! Мы уведомили вашего официанта."
  - Если "Да" — скрыть с мини-анимацией благодарности
  - Неназойливый: маленький, в нижней части экрана, легко dismissible

##### 6. Расширить sounds.ts — Новые звуки для разных событий
- `frontend/src/lib/sounds.ts` — добавить:
  - `playItemReadySound()` — короткий приятный звон (готовая позиция)
  - `playDeliveryIssueSound()` — тревожный звук (проблема с доставкой)
  - `playConfirmationSound()` — мягкий "дин-дон" (новый заказ требует код)

### Изменить существующие

#### Backend
- `backend/src/main/java/com/qtab/api/notification/NotificationService.java` (создан в TASK_29):
  - Добавить метод `requestDeliveryFeedback(String sessionId, OrderItem item, String itemName)`
  - Добавить метод `notifyDeliveryIssue(Long restaurantId, DeliveryIssue issue)`
  
- `backend/src/main/java/com/qtab/api/order/OrderService.java`:
  - В методе `updateItemStatus()` — при переходе в `SERVED`:
    - Записать `statusUpdatedAt = now()`
    - Запланировать feedback request через Redis key с TTL

#### Frontend
- `frontend/src/app/(staff)/dashboard/page.tsx`:
  - Заменить `toast()` вызовы Sonner на `StaffNotificationCenter` 
  - Добавить `StaffNotificationCenter` в layout
  - Добавить badge-счётчик уведомлений в header

- `frontend/src/app/(staff)/kitchen/page.tsx`:
  - Добавить `StaffNotificationCenter` (упрощённый, только ITEM_READY)
  
- `frontend/src/app/(guest)/order/[orderId]/page.tsx`:
  - Добавить обработку WebSocket event `DELIVERY_FEEDBACK_REQUEST`
  - Показывать `DeliveryFeedbackPrompt` при получении event
  - Добавить API call для отправки фидбека

- `frontend/src/components/staff/OrderQueueCard.tsx`:
  - Добавить индикатор времени ожидания с color-coding:
    - < 10 мин: зелёный
    - 10-15 мин: жёлтый
    - > 15 мин: красный пульсирующий
  - При hover — показать elapsed time для каждой позиции

- `frontend/src/locales/ru.json` — новые ключи:
  ```json
  {
    "notifications": {
      "newOrderCode": "Новый заказ! Столик №{table} — код: {code}",
      "itemReady": "Готово к выдаче: {item} (Столик №{table})",
      "orderReady": "Весь заказ готов! Столик №{table}",
      "deliveryIssue": "⚠️ Гость не получил: {item} (Столик №{table})",
      "callWaiter": "Вызов официанта! Столик №{table}",
      "billRequested": "Запрос счёта! Столик №{table}",
      "markRead": "Отметить прочитанным",
      "clearAll": "Очистить все"
    },
    "feedback": {
      "wasDelivered": "Вам уже подали {item}?",
      "yes": "Да, спасибо!",
      "no": "Нет, ещё жду",
      "sorryDelay": "Извините за задержку! Мы уведомили вашего официанта.",
      "thankYou": "Спасибо за подтверждение!"
    }
  }
  ```

- `frontend/src/locales/en.json` — аналогичные ключи
- `frontend/src/locales/by.json` — аналогичные ключи

---

## Точная реализация (Technical Design)

### Backend

#### DeliveryFeedbackScheduler.java
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DeliveryFeedbackScheduler {
    
    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final NotificationService notificationService;
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final int FEEDBACK_DELAY_MINUTES = 5;
    private static final String FEEDBACK_KEY_PREFIX = "delivery_feedback:";
    
    @Scheduled(fixedRate = 60000) // every minute
    @Transactional(readOnly = true)
    public void checkServedItemsForFeedback() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(FEEDBACK_DELAY_MINUTES);
        
        // Find all orders with SERVED items older than threshold
        List<OrderEntity> activeOrders = orderRepository.findByStatusIn(
            List.of(OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED));
        
        for (OrderEntity order : activeOrders) {
            for (OrderItem item : order.getItems()) {
                if (item.getStatus() == OrderItemStatus.SERVED 
                    && item.getStatusUpdatedAt() != null
                    && item.getStatusUpdatedAt().isBefore(threshold)) {
                    
                    String redisKey = FEEDBACK_KEY_PREFIX + order.getId() + ":" + item.getId();
                    
                    // Check if feedback already requested
                    if (Boolean.TRUE.equals(redisTemplate.hasKey(redisKey))) {
                        continue;
                    }
                    
                    // Mark as requested (TTL 30 min)
                    redisTemplate.opsForValue().set(redisKey, "requested", 
                        Duration.ofMinutes(30));
                    
                    // Get item name
                    String itemName = menuItemRepository.findById(item.getMenuItemId())
                        .map(MenuItem::getNameRu)
                        .orElse("Блюдо");
                    
                    // Send feedback request to guest
                    notificationService.notifyGuest(order.getSessionId(),
                        new OrderNotification(
                            "DELIVERY_FEEDBACK_REQUEST",
                            order.getId(), order.getTableId(), null,
                            null, item.getId(), itemName, null,
                            "Вам уже подали " + itemName + "?",
                            LocalDateTime.now()
                        ));
                }
            }
        }
    }
}
```

#### DeliveryFeedbackController.java
```java
@RestController
@RequestMapping("/api/v1/order")
@RequiredArgsConstructor
public class DeliveryFeedbackController {
    
    private final DeliveryFeedbackService deliveryFeedbackService;
    
    @PostMapping("/{orderId}/items/{itemId}/delivery-feedback")
    public ResponseEntity<ApiResponse<Void>> submitFeedback(
            @PathVariable UUID orderId,
            @PathVariable UUID itemId,
            @Valid @RequestBody DeliveryFeedbackRequest request) {
        deliveryFeedbackService.processFeedback(orderId, itemId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Спасибо за обратную связь!"));
    }
}
```

#### DeliveryFeedbackRequest.java
```java
public record DeliveryFeedbackRequest(
    @NotNull Boolean delivered,
    String comment  // optional
) {}
```

### Frontend

#### StaffNotificationCenter.tsx — Архитектура
```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Clock, AlertTriangle, CreditCard, Flame } from 'lucide-react';

interface StaffNotification {
  id: string;
  type: 'CONFIRMATION_REQUIRED' | 'ITEM_READY' | 'ORDER_READY' | 
        'DELIVERY_ISSUE' | 'CALL_WAITER' | 'BILL_REQUESTED';
  title: string;
  message: string;
  tableNumber: number;
  orderId?: string;
  confirmationCode?: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean; // true for DELIVERY_ISSUE, CALL_WAITER
}

const NOTIFICATION_STYLES: Record<string, { bg: string; border: string; icon: any; pulse: boolean }> = {
  CONFIRMATION_REQUIRED: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Bell, pulse: true },
  ITEM_READY: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Check, pulse: false },
  ORDER_READY: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Check, pulse: true },
  DELIVERY_ISSUE: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle, pulse: true },
  CALL_WAITER: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: Bell, pulse: true },
  BILL_REQUESTED: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: CreditCard, pulse: false },
};

interface StaffNotificationCenterProps {
  onNotification?: (notification: StaffNotification) => void;
}

export function StaffNotificationCenter({ onNotification }: StaffNotificationCenterProps) {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const addNotification = useCallback((notification: StaffNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // max 50
    onNotification?.(notification);
    
    // Auto-dismiss non-persistent after 15 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      }, 15000);
    }
  }, [onNotification]);
  
  // Expose addNotification to parent via ref or context
  // ...
  
  return (
    <>
      {/* Bell button with badge */}
      <button onClick={() => setIsOpen(!isOpen)} className="relative ...">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>
      
      {/* Notification panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-16 right-4 w-96 max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Notification cards */}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating notifications (newest, unread, persistent) */}
      <div className="fixed top-20 right-4 space-y-3 z-50 pointer-events-none">
        <AnimatePresence>
          {notifications
            .filter(n => !n.read)
            .slice(0, 3)
            .map(notification => {
              const style = NOTIFICATION_STYLES[notification.type];
              const Icon = style.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 100, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 100, scale: 0.9 }}
                  className={`pointer-events-auto w-80 p-4 rounded-xl ${style.bg} border ${style.border} backdrop-blur-md shadow-lg cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${style.bg} ${style.pulse ? 'animate-pulse' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">
                          Столик №{notification.tableNumber}
                        </span>
                        {notification.confirmationCode && (
                          <span className="text-lg font-mono font-bold text-primary">
                            {notification.confirmationCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">{notification.message}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </>
  );
}
```

---

## Риски и подводные камни (Edge Cases)

- **Scheduled task в multi-instance:** `DeliveryFeedbackScheduler` не должен запускаться в нескольких instances. Использовать `@SchedulerLock` (ShedLock) или Redis-based лок.
- **Feedback на уже закрытые заказы:** Если заказ уже `PAID` — не запрашивать feedback.
- **Звуки на мобильных:** Web Audio API может не воспроизводить звуки без user interaction. Нужен первоначальный "tap to enable sounds" или use existing user interaction context.
- **Notification overflow:** Если 20 заказов приходят одновременно — нужна группировка или batch notification.
- **Redis persistence:** Feedback keys в Redis имеют TTL — при restart Redis данные потеряются. Это OK для данного use case.
- **Timezone:** `statusUpdatedAt` и `LocalDateTime.now()` — убедиться что timezone одинаков.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Flyway V16 — `delivery_issues` таблица.
- [x] 2. Создать `DeliveryIssue.java` entity + `DeliveryIssueRepository.java`.
- [x] 3. Создать `DeliveryFeedbackRequest.java` DTO.
- [x] 4. Создать `DeliveryFeedbackService.java` — логика обработки фидбека.
- [x] 5. Создать `DeliveryFeedbackController.java` — endpoint.
- [x] 6. Создать `DeliveryFeedbackScheduler.java` — scheduled проверка.
- [x] 7. Обновить `NotificationService.java` — новые методы для feedback и delivery issues.
- [x] 8. `.\mvnw.cmd clean compile -q -DskipTests`

### Frontend
- [x] 9. Расширить `frontend/src/lib/sounds.ts` — новые звуки.
- [x] 10. Создать `frontend/src/components/staff/StaffNotificationCenter.tsx`.
- [x] 11. Создать `frontend/src/components/guest/DeliveryFeedbackPrompt.tsx`.
- [x] 12. Обновить `frontend/src/app/(staff)/dashboard/page.tsx`:
  - [x] 12a. Заменить toast() на StaffNotificationCenter.
  - [x] 12b. Интегрировать notification center в layout.
  - [x] 12c. Добавить elapsed time indicators.
- [x] 13. Обновить `frontend/src/app/(guest)/order/[orderId]/page.tsx`:
  - [x] 13a. Обработка event `DELIVERY_FEEDBACK_REQUEST`.
  - [x] 13b. Показ `DeliveryFeedbackPrompt`.
  - [x] 13c. API call для отправки фидбека.
- [x] 14. Обновить `frontend/src/components/staff/OrderQueueCard.tsx`:
  - [x] 14a. Color-coded elapsed time (green/yellow/red).
- [x] 15. Добавить i18n ключи в `ru.json`, `en.json`, `by.json`.
- [x] 16. `cd frontend && pnpm run build`

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**. CP1251 ЗАПРЕЩЕНО.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь `## Update 2026-07-08: TASK_31 Staff Notifications & Delivery Feedback`.
3. [ ] Запусти `.\rotate-backup.ps1`.
4. [ ] Синхронизируй `ROADMAP.md`.
5. [ ] Перемести файл из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй руками (гайд ниже).

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`, `cd frontend && pnpm run dev`
2. **Staff Notifications:**
   - Залогиниться как официант → открыть Dashboard
   - Из гостевого интерфейса создать заказ → на Dashboard должна появиться кастомная notification-карточка (НЕ Sonner toast):
     - Синий пульс, "Новый заказ! Столик №X — код: XXXX"
     - Код крупным шрифтом
   - Подтвердить заказ → уведомление уходит
   - На кухне завершить позицию → на Dashboard появляется зелёная notification "Готово к выдаче: [блюдо]"
3. **Delivery Feedback (гостевой):**
   - Подать заказ (SERVED)
   - Подождать 5+ минут (или уменьшить FEEDBACK_DELAY_MINUTES до 1 для теста)
   - На гостевой странице заказа должен появиться bottom-sheet "Вам уже подали [блюдо]?"
   - Нажать "Нет" → на Dashboard официанта красная notification "Гость не получил: [блюдо]"
4. **Elapsed Time Indicators:**
   - Создать заказ → в OrderQueueCard видно зелёный таймер
   - Через 10 минут → жёлтый
   - Через 15 минут → красный пульсирующий
5. **Звуки:**
   - Новый заказ → мягкий дин-дон
   - Позиция готова → короткий звон
   - Проблема доставки → тревожный звук
