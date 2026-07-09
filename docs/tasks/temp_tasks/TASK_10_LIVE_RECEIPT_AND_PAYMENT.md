# TASK: Live-чек гостя и подтверждение оплаты наличными/картой через официанта

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 2  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Claude Sonnet 4.6 (Thinking)

---

## Цель

Реализовать просмотр live-чека (live receipt) гостем в реальном времени с обновлением при дозаказе, систему подтверждения оплаты наличными/картой через официанта, добавить статус `PAID` в OrderStatus, и реализовать post-payment flow (экран «Спасибо»).

---

## Контекст

- **Зависит от:** TASK_06 (Orders + WebSocket), TASK_09 (Floor Map + Table Management)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Orders API + Staff API

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- **Выжимка из KNOWN_ISSUES:**
  - `'use client'` обязателен для компонентов с хуками.
  - Tailwind v4: переменные в `globals.css`.
  - Все цены — `BigDecimal` на бэкенде, `number` на фронтенде.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `docs/FRONTEND_BACKEND_CONTRACT.md` — Order endpoints.
- `ROADMAP.md` — Фаза 2, «Просмотр live-чека» и «Оплата через официанта».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/order/dto/ReceiptResponse.java` — DTO чека: `orderId`, `tableNumber`, `items[]` (name, qty, unitPrice, totalPrice, modifiers, comment), `subtotal`, `generalComment`, `status`, `createdAt`.
- `backend/src/main/java/com/qtab/api/payment/PaymentEntity.java` — JPA сущность для таблицы `payments`: `id`, `orderId`, `method` (CASH/CARD_TERMINAL), `status` (PENDING/CONFIRMED), `amount`, `confirmedBy` (staffId), `createdAt`.
- `backend/src/main/java/com/qtab/api/payment/PaymentRepository.java` — JPA репозиторий.
- `backend/src/main/java/com/qtab/api/payment/PaymentService.java` — Бизнес-логика подтверждения оплаты.
- `backend/src/main/java/com/qtab/api/payment/dto/ConfirmPaymentRequest.java` — DTO: `@NotBlank String method` (CASH или CARD_TERMINAL).
- `backend/src/main/resources/db/migration/V7__create_payments_table.sql` — Таблица `payments` + добавление статуса `PAID` в orders.

**Frontend:**
- `frontend/src/app/(guest)/receipt/page.tsx` — Страница live-чека гостя.
- `frontend/src/components/guest/ReceiptView.tsx` — Компонент визуализации чека с позициями, модификаторами и итогом.
- `frontend/src/app/(guest)/thankyou/page.tsx` — Страница «Спасибо за визит» после оплаты.

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/order/OrderStatus.java` — Добавить `PAID` в enum.
- `backend/src/main/java/com/qtab/api/order/OrderController.java` — Добавить `GET /api/v1/order/{orderId}/receipt`.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — Добавить метод `getReceipt(UUID orderId)` возвращающий `ReceiptResponse`, добавить метод `confirmPayment(UUID orderId, UUID staffId, String method)` — создаёт запись в payments, меняет статус заказа на PAID, освобождает столик, отправляет WebSocket оповещение гостю.
- `backend/src/main/java/com/qtab/api/table/TableController.java` — Добавить эндпоинт `POST /api/v1/staff/orders/{orderId}/confirm-payment`.
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Разрешить гостевой доступ к `/api/v1/order/*/receipt`.

**Frontend:**
- `frontend/src/app/(guest)/order/[orderId]/page.tsx` — Добавить кнопку «Мой чек» и обработку статуса `PAID` (редирект на /thankyou).
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Добавить floating action кнопку «📋 Мой чек».

---

## Точная реализация (Technical Design)

### Backend

#### Миграция V7__create_payments_table.sql
```sql
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    amount NUMERIC(10, 2) NOT NULL,
    confirmed_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
```

#### ReceiptResponse.java
```java
public record ReceiptResponse(
    UUID orderId,
    Integer tableNumber,
    String status,
    List<ReceiptItemResponse> items,
    BigDecimal subtotal,
    BigDecimal total,
    String generalComment,
    ZonedDateTime createdAt
) {
    public record ReceiptItemResponse(
        String nameRu,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String selectedSize,
        List<String> modifiers,
        String guestComment
    ) {}
}
```

#### PaymentEntity.java
```java
@Entity
@Table(name = "payments")
public class PaymentEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(name = "order_id", nullable = false) UUID orderId;
    @Column(nullable = false, length = 50) String method; // CASH, CARD_TERMINAL
    @Column(nullable = false, length = 50) @Builder.Default String status = "CONFIRMED";
    @Column(nullable = false) BigDecimal amount;
    @Column(name = "confirmed_by") UUID confirmedBy; // staffId
    @Column(name = "created_at") ZonedDateTime createdAt;
}
```

#### OrderService — метод confirmPayment():
```java
@Transactional
public void confirmPayment(UUID orderId, UUID restaurantId, UUID staffId, String method) {
    OrderEntity order = orderRepository.findById(orderId)...;
    // 1. Проверить restaurantId
    // 2. Создать PaymentEntity(orderId, method, CONFIRMED, order.getTotal(), staffId)
    // 3. order.setStatus(OrderStatus.PAID); save;
    // 4. Освободить столик: tableService.freeTable(order.getTableId(), restaurantId)
    // 5. WebSocket /topic/order/{orderId} → eventType: ORDER_STATUS_CHANGED, status: PAID
    // 6. WebSocket /queue/guest/{sessionId} → eventType: PAYMENT_CONFIRMED
}
```

### Frontend

#### ReceiptView.tsx
- Анимированная карточка с логотипом QTab
- Список позиций (имя, кол-во × цена, модификаторы, комментарий)
- Горизонтальная разделительная линия
- Итого: крупным шрифтом, золотой акцент
- Статус заказа (badge вверху)
- Pull-to-refresh для обновления данных

#### thankyou/page.tsx
- Полноэкранный экран «Спасибо за визит! 🎉»
- Анимация (Framer Motion: scale + fade)
- Предложение «Оцените визит» (ссылка на будущую задачу review)
- Кнопка «Вернуться в меню» (новое сканирование QR)

---

## Риски и подводные камни (Edge Cases)

- **Гонка при оплате:** Два официанта могут одновременно подтвердить оплату → проверить уникальность payment по orderId в сервисе (idempotent).
- **Освобождение столика:** При подтверждении оплаты столик автоматически освобождается — убедиться, что если за столиком есть другие активные заказы (дозаказы), столик не освобождается.
- **WebSocket reconnect:** Если гость закрыл и открыл страницу — polling fallback на REST `GET /order/{orderId}`.
- **Кэш:** После подтверждения оплаты — `invalidateQueries(['order', orderId])` в TanStack Query.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Flyway миграция `V7__create_payments_table.sql`.
- [x] 2. Добавить `PAID` в `OrderStatus.java`.
- [x] 3. Создать `PaymentEntity.java` + `PaymentRepository.java`.
- [x] 4. Создать DTO: `ReceiptResponse.java`, `ConfirmPaymentRequest.java`.
- [x] 5. В `OrderService.java`: добавить `getReceipt(UUID orderId)`, `confirmPayment(UUID orderId, UUID restaurantId, UUID staffId, String method)`.
- [x] 6. В `OrderController.java`: добавить `GET /api/v1/order/{orderId}/receipt`.
- [x] 7. В `TableController.java` или новом `PaymentController.java`: добавить `POST /api/v1/staff/orders/{orderId}/confirm-payment`.
- [x] 8. Обновить `SecurityConfig.java` — допуск гостей к receipt endpoint.
- [x] 9. `.\mvnw.cmd clean compile -q -DskipTests`

### Frontend
- [x] 10. Создать `frontend/src/app/(guest)/receipt/page.tsx` и `ReceiptView.tsx`.
- [x] 11. Создать `frontend/src/app/(guest)/thankyou/page.tsx`.
- [x] 12. Обновить `frontend/src/app/(guest)/order/[orderId]/page.tsx` — добавить кнопку чека + обработку PAID.
- [x] 13. Обновить страницу меню — floating action «Мой чек».
- [x] 14. `cd frontend && pnpm run build`

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**. Использование CP1251 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update` в конец файла.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
4. [ ] Запиши новые баги/решения в `docs/KNOWN_ISSUES_AND_PATTERNS.md` (если есть).
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`, `cd frontend && pnpm run dev`.
2. Гостевой флоу: сканировать QR → заказать → на странице трекинга нажать «📋 Мой чек» → должна открыться страница с live-чеком (список позиций, цены, итого).
3. Staff флоу: войти как официант → на карте зала (или в списке заказов) нажать на заказ → нажать «Подтвердить оплату» → выбрать способ (Наличные / Карта через терминал).
4. После подтверждения оплаты: у гостя должен обновиться статус заказа на «Оплачен» → автоматический переход на экран «Спасибо за визит! 🎉».
5. На карте зала: столик должен автоматически стать зелёным (FREE) после подтверждения оплаты.
