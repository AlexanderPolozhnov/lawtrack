# TASK: Акции, спецпредложения и промокоды (Promos & Banners)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 3  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать систему управления промо-акциями, баннерами и промокодами: создание миграции БД, CRUD API для админа, кэшируемый публичный API акций для гостя, баннер-слайдер в Guest PWA, и применение промокодов при оформлении заказа на бэкенде.

---

## Контекст

- **Зависит от:** TASK_03 (Guest Session), TASK_05 (Menu PWA), TASK_12 (Menu Editor & Storage)
- **Затрагивает:** Backend + Frontend + DB
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/promos`, Guest API: `/promos/{restaurantId}`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (транзакции, Flyway).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 3, «Управление акциями, баннерами и промокодами».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/resources/db/migration/V8__create_promos_table.sql` — Таблица акций и промокодов.
- `backend/src/main/java/com/qtab/api/promo/PromoEntity.java` — Сущность акции/промокода.
- `backend/src/main/java/com/qtab/api/promo/PromoRepository.java` — Репозиторий.
- `backend/src/main/java/com/qtab/api/promo/PromoService.java` — Бизнес-логика валидации и применения промокодов, кэширование баннеров в Redis (`promo:{restaurantId}:active`).
- `backend/src/main/java/com/qtab/api/promo/AdminPromoController.java` — REST-контроллер для CRUD.
- `backend/src/main/java/com/qtab/api/promo/dto/CreatePromoRequest.java` — DTO для создания акции.
- `backend/src/main/java/com/qtab/api/promo/dto/PromoResponse.java` — DTO ответа.
- `backend/src/main/java/com/qtab/api/promo/GuestPromoController.java` — Публичный контроллер для гостей (`GET /api/v1/promos/{restaurantId}`).

**Frontend:**
- `frontend/src/app/(admin)/promos/page.tsx` — Страница акций в админке.
- `frontend/src/components/admin/PromoModal.tsx` — Модалка создания/редактирования промокода/акции.
- `frontend/src/components/guest/PromoBanners.tsx` — Слайдер/карусель баннеров на мобильном экране меню гостя.

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — Применить скидку по промокоду в методе `createOrder()`. Вычесть из `total` сумму скидки, заполнить `promoCode` и `discountAmount` в `OrderEntity`.
- `backend/src/main/java/com/qtab/api/order/dto/CreateOrderRequest.java` — Добавить поле `String promoCode`.
- `backend/src/main/java/com/qtab/api/order/OrderEntity.java` — Добавить поля `promoCode` (String) и `discountAmount` (BigDecimal) с соответствующими колонками в БД (в миграции V8).

**Frontend:**
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Внедрить слайдер баннеров `PromoBanners` над категориями.
- `frontend/src/components/guest/CartDrawer.tsx` — Добавить поле для ввода промокода, кнопку «Применить» и пересчёт корзины с отображением скидки.
- `frontend/src/stores/useCartStore.ts` — Добавить хранение примененного промокода и величины скидки в стейт.

---

## Точная реализация (Technical Design)

### 1. Схема БД и Entity

#### V8__create_promos_table.sql
```sql
CREATE TABLE IF NOT EXISTS promos (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- PERCENT, FIXED
    discount_value DECIMAL(10, 2) NOT NULL,
    promo_code VARCHAR(100), -- nullable, если это просто баннер акции
    banner_image_url VARCHAR(555), -- nullable, если это промокод без баннера
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promos_restaurant ON promos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promos_code ON promos(promo_code);

-- Добавить поля в orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00;
```

#### PromoEntity.java
```java
@Entity
@Table(name = "promos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoEntity {
    @Id
    private UUID id;
    private UUID restaurantId;
    private String title;
    private String description;
    private String type; // PERCENT, FIXED
    private BigDecimal discountValue;
    private String promoCode;
    private String bannerImageUrl;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private boolean isActive;
}
```

### 2. Применение промокода (OrderService.createOrder)
В `OrderService.createOrder` добавить проверку:
1. Если `request.getPromoCode()` не пустой:
   - Ищем активный промокод в БД: `restaurantId`, `promoCode`, `isActive = true`, `now() между startDate и endDate`.
   - Если не найден — кидаем ошибку `IllegalArgumentException("Недействительный промокод")`.
   - Если найден — считаем скидку:
     - Если `PERCENT`: `discountAmount = total * (discountValue / 100)`.
     - Если `FIXED`: `discountAmount = discountValue`.
     - Ограничить `discountAmount` так, чтобы он не превышал сумму заказа.
   - Записать `promoCode` и `discountAmount` в `OrderEntity`.
   - Уменьшить `total` на величину `discountAmount`.

### 3. Кэширование акций для гостя
Создать Redis кэш `promo:{restaurantId}:active` для `GuestPromoController.getActivePromos`.
Сбрасывать кэш при любом CRUD изменении в `AdminPromoController` через `RedisTemplate` или `@CacheEvict`.

---

## Риски и подводные камни (Edge Cases)

- **Сроки действия промокодов:** Сверять дату со временем ресторана (или UTC). Использовать LocalDateTime.
- **Отрицательная сумма заказа:** Fixed скидка не должна делать сумму заказа меньше нуля. Установить минимальный порог общей суммы заказа в 0.01 BYN.
- **Инвалидация кэша:** При обновлении или выключении акции админом — сбрасывать Redis кэш акций.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать Flyway миграцию `V8__create_promos_table.sql`.
- [x] 2. Создать сущность `PromoEntity.java` и `PromoRepository.java`.
- [x] 3. Создать `PromoService.java` с логикой валидации промокода и расчёта скидки.
- [x] 4. Обновить `OrderEntity.java` и `OrderService.java` для применения промокода при создании заказа.
- [x] 5. Создать `AdminPromoController.java` (под JWT) и `GuestPromoController.java` (публичный).
- [x] 6. Написать Unit-тест применения промокодов к заказу.
- [x] 7. Выполнить `.\mvnw.cmd clean compile -q -DskipTests` (убедиться в успехе миграций).

### Frontend
- [x] 8. Создать компонент `PromoBanners.tsx` (горизонтальная прокрутка или слайдер Framer Motion).
- [x] 9. Обновить корзину `CartDrawer.tsx` для ввода промокода и отображения скидки.
- [x] 10. Создать `PromoModal.tsx` и админ-страницу `promos/page.tsx` с таблицей и формой создания акций.
- [x] 11. Выполнить `cd frontend && pnpm run build`.

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

1. Зайти в админку, перейти в «Акции» -> «Создать акцию».
   - Название: «Скидка открытия 10%».
   - Тип: Процентная, Значение: 10.
   - Промокод: `WELCOME10`.
   - Загрузить любую картинку для баннера.
   - Выставить срок действия: с сегодняшнего дня на месяц вперёд.
2. Сохранить акцию.
3. Открыть гостевое меню `/menu/qtab-cafe/table-1` -> Убедиться, что сверху отображается красивый баннер нашей акции.
4. Добавить в корзину блюдо ценой 20.00 BYN.
5. Открыть корзину, ввести промокод `WELCOME10` и нажать «Применить».
6. Убедиться, что в корзине появилась строка «Скидка: -2.00 BYN» и итоговая сумма стала 18.00 BYN.
7. Оформить заказ. Убедиться, что на экране трекинга заказа и в live-чеке отображается итоговая сумма 18.00 BYN и примененный промокод.
