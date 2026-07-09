# TASK: Регистрация гостей и программа лояльности (Guest Profile & Loyalty)

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 5  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать профили гостей с возможностью регистрации и авторизации по номеру телефона, личный кабинет гостя с историей заказов и повтором заказа в 1 клик, а также программу лояльности: начисление баллов (5% от оплаты) и списание баллов (до 50% стоимости заказа).

---

## Контекст

- **Зависит от:** TASK_02 (Auth), TASK_10 (Payments), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend + DB
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Guest API: `/guest/auth/**`, `/guest/profile/**`, `/order` (loyalty integration)

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (транзакции, Flyway).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 5, «Регистрация гостей» и «Программа лояльности».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/resources/db/migration/V10__create_guests_table.sql` — Таблица гостей и связи в заказах.
- `backend/src/main/java/com/qtab/api/auth/GuestUser.java` — Сущность зарегистрированного гостя.
- `backend/src/main/java/com/qtab/api/auth/GuestUserRepository.java` — Репозиторий.
- `backend/src/main/java/com/qtab/api/auth/GuestAuthService.java` — Логика регистрации/входа гостей, генерация JWT для гостей.
- `backend/src/main/java/com/qtab/api/auth/GuestAuthController.java` — REST-контроллер авторизации гостей (`POST /api/v1/guest/auth/register`, `POST /api/v1/guest/auth/login`).
- `backend/src/main/java/com/qtab/api/auth/dto/GuestRegisterRequest.java` — DTO для регистрации.
- `backend/src/main/java/com/qtab/api/auth/dto/GuestLoginRequest.java` — DTO для входа.
- `backend/src/main/java/com/qtab/api/auth/dto/GuestProfileResponse.java` — DTO ответа профиля гостя (включая баланс баллов).

**Frontend:**
- `frontend/src/app/(guest)/profile/page.tsx` — Страница профиля гостя: форма логина/регистрации (если не авторизован), баланс баллов лояльности, список прошлых заказов с кнопкой «Повторить заказ».

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Добавить `/api/v1/guest/auth/**` в публичные пути, разрешить доступ к `/api/v1/guest/profile/**` пользователям с ролью `GUEST`.
- `backend/src/main/java/com/qtab/api/order/OrderEntity.java` — Добавить поле `UUID guestId` (nullable, связь с таблицей `guests`).
- `backend/src/main/java/com/qtab/api/order/dto/CreateOrderRequest.java` — Добавить поле `boolean useLoyaltyPoints`.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — 
  - При создании заказа: если гость авторизован (передан `guestId` или JWT `GUEST` в SecurityContext) и указано `useLoyaltyPoints = true`, списать баллы со счета гостя (не более 50% от суммы заказа) и уменьшить итоговую стоимость `total`, записав списание в `discountAmount`. Привязать `guestId` к `OrderEntity`.
- `backend/src/main/java/com/qtab/api/payment/PaymentService.java` — 
  - При подтверждении оплаты заказа (`createPayment`/`confirmPayment`): если у заказа есть `guestId`, рассчитать 5% от фактически оплаченной суммы (`amount`) и зачислить на счет гостя в виде баллов лояльности (добавив к `loyalty_points`).

**Frontend:**
- `frontend/src/components/guest/CartDrawer.tsx` — Интегрировать галочку/тумблер «Списать баллы лояльности» (с динамическим отображением доступного баланса гостя и пересчетом итоговой цены в корзине).
- `frontend/src/stores/useGuestStore.ts` — Добавить поля `guestToken` и `guestName` для хранения JWT сессии гостя в localStorage.

---

## Точная реализация (Technical Design)

### 1. БД миграция

#### V10__create_guests_table.sql
```sql
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    loyalty_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавить guest_id в orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_id UUID;
CREATE INDEX IF NOT EXISTS idx_orders_guest ON orders(guest_id);
```

### 2. Spring Security роли
Для гостей генерируем JWT токен с Role `GUEST`.
В `SecurityConfig` настроить:
- Публичные: `/api/v1/guest/auth/**`
- Требуют роль GUEST: `/api/v1/guest/profile/**`
- Доступ к созданию заказов `/api/v1/order` сделать публичным, но если в HTTP-заголовке передан Bearer-токен гостя, извлекать `guestId` и привязывать к заказу.

### 3. Бизнес-логика лояльности (OrderService & PaymentService)

#### Списание баллов (OrderService.java):
```java
// При создании заказа
int availablePoints = guestUser.getLoyaltyPoints();
BigDecimal maxDiscount = orderTotal.multiply(new BigDecimal("0.50")); // 50%
int pointsToUse = BigDecimal.valueOf(availablePoints).min(maxDiscount).intValue();

if (pointsToUse > 0) {
    BigDecimal discount = BigDecimal.valueOf(pointsToUse);
    orderEntity.setDiscountAmount(orderEntity.getDiscountAmount().add(discount));
    orderEntity.setTotal(orderTotal.subtract(discount));
    
    // Списать баллы у гостя
    guestUser.setLoyaltyPoints(availablePoints - pointsToUse);
    guestUserRepository.save(guestUser);
}
```

#### Начисление баллов (PaymentService.java):
```java
// При подтверждении платежа
if (order.getGuestId() != null) {
    GuestUser guest = guestUserRepository.findById(order.getGuestId()).orElse(null);
    if (guest != null) {
        // Начисляем 5% от фактически оплаченной суммы (сумма платежа)
        BigDecimal cashback = paymentAmount.multiply(new BigDecimal("0.05"));
        int earnedPoints = cashback.setScale(0, RoundingMode.HALF_UP).intValue();
        if (earnedPoints > 0) {
            guest.setLoyaltyPoints(guest.getLoyaltyPoints() + earnedPoints);
            guestUserRepository.save(guest);
        }
    }
}
```

### 4. Повтор заказа в 1 клик
На фронтенде в истории заказов профиля гостя кнопка «Повторить заказ» берет массив элементов из прошлого заказа, очищает текущую корзину (`clearCart`), добавляет все позиции с их размерами и модификаторами в корзину гостя (`addItem`) и автоматически открывает `CartDrawer` для быстрого оформления!

---

## Риски и подводные камни (Edge Cases)

- **Конкурентное списание баллов:** Если гость быстро нажимает кнопку отправки заказа, баллы могут списаться дважды. Обернуть создание заказа в `@Transactional` с уровнем изоляции.
- **Уникальность телефона:** Валидировать формат телефона при регистрации на бэкенде (регулярным выражением) и проверять уникальность в БД. При совпадении логина выдавать ошибку 400.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать Flyway миграцию `V10__create_guests_table.sql`.
- [x] 2. Создать сущность `GuestUser.java` и репозиторий `GuestUserRepository.java`.
- [x] 3. Реализовать методы регистрации/авторизации в `GuestAuthService.java`.
- [x] 4. Создать `GuestAuthController.java` для входа и профиля.
- [x] 5. Обновить `OrderService.java` и `PaymentService.java` для поддержки списания и начисления баллов.
- [x] 6. Обновить `SecurityConfig.java` для настройки путей гостей.
- [x] 7. Написать Unit-тест начисления и списания баллов.
- [x] 8. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 9. Обновить Zustand `useGuestStore.ts` для хранения данных гостя (токен, имя, баланс баллов).
- [x] 10. Создать страницу профиля гостя `profile/page.tsx` с формами входа/регистрации и списком прошлых заказов.
- [x] 11. Обновить корзину `CartDrawer.tsx` для применения баллов при оформлении заказа и кнопку «Повторить заказ».
- [x] 12. Выполнить `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md`.
5. [x] Перемести файл этой задачи в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Зайти в PWA гостя, открыть страницу профиля `/profile`.
2. Зарегистрироваться: ввести имя «Алексей Гость», телефон `+375291112233`, пароль `password`.
3. После регистрации должна открыться карточка профиля гостя с балансом `0 баллов` и пустой историей заказов.
4. Перейти в меню, положить в корзину блюдо ценой 40 BYN. Оформить заказ, привязав его к текущей сессии гостя.
5. Зайти в панель официанта `/dashboard`, подтвердить оплату заказа (нажать «Оплата наличными»).
6. Снова зайти в профиль гостя `/profile`. Баланс баллов должен обновиться и стать `2 балла` (5% от 40 BYN), а в истории заказов должен появиться наш заказ.
7. Снова положить в корзину блюдо ценой 20 BYN. В корзине поставить галочку «Списать баллы лояльности (доступно: 2)». Итоговая сумма заказа должна стать 18 BYN.
8. Оформить заказ и убедиться, что списано 2 балла.
9. В истории заказов нажать «Повторить заказ» — корзина должна предзаполниться теми же блюдами.
