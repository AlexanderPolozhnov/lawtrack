# TASK: Исправление Kitchen Item Status 500 + Guest Order Status UI + Progress Line

**Дата создания:** 2026-07-09  
**Приоритет:** Critical  
**Фаза:** Phase 6 (Полировка)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  
**Порядок выполнения:** 4 из 5

---

## Цель

После выполнения: кнопки смены статуса позиций на кухне работают без ошибок (500/404). Гость видит актуальный статус заказа при изменении статусов позиций. Прогресс-линия статусов на странице трекинга гостя визуально корректна — проходит между иконками, а не поверх них.

---

## Контекст

- **Зависит от:** TASK_36 (исправление WebSocket eventType — для корректной доставки событий гостю)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** `docs/FRONTEND_BACKEND_CONTRACT.md` — Модуль 9 (KDS), Модуль 5 (Orders), секция `OrderItemStatus`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (MapStruct маппинг, Flyway миграции).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `docs/FRONTEND_BACKEND_CONTRACT.md` — Секция 9 (KDS), Секция 5 (Orders).

### Суть проблемы — 3 связанных бага:

#### Баг 1: 500 ошибка при смене статуса позиции на кухне (CRITICAL)

**Корневая причина:** DTO `OrderItemDetailsResponse` возвращает только `menuItemId`, но **НЕ возвращает** `id` (UUID самого OrderItem). Фронтенд (`KitchenOrderCard.tsx`) отправляет `item.menuItemId` в URL, а бэкенд ищет по `OrderItem.id` → **404 "Item not found"** → обернуто в 500.

Цепочка ошибки:
```
Frontend: item.menuItemId → URL: /kitchen/orders/{orderId}/items/{menuItemId}/status
Backend:  order.getItems().filter(i -> i.getId().equals(menuItemId)) → НЕ НАЙДЕН → 404
```

**Доказательство из лога:**
```
api.qtab.space/api/v1/kitchen/orders/7301e4d4-.../items/f5555555-5555-5555-5555-555555555555/status
```
`f5555555-...` — это seed-данные menuItemId, а не OrderItem UUID.

#### Баг 2: Статус заказа у гостя не обновляется при смене статуса позиций

Когда кухня меняет статус позиции → auto-recalculation меняет статус заказа → событие `ORDER_STATUS_CHANGED` не отправляется в guest topic. Это частично решается в TASK_36, но здесь нужно убедиться что на фронтенде гостя корректно обрабатывается это событие.

#### Баг 3: Прогресс-линия статусов у гостя визуально некорректна

На странице трекинга заказа вертикальная прогресс-линия проходит **поверх** иконок статусов, вместо того чтобы соединять их. Нужно:
- Линия должна начинаться от центра первой иконки и заканчиваться у центра последней
- Линия НЕ должна перекрывать круглые иконки — должна проходить позади них
- Активная (заполненная) часть линии должна останавливаться **между** иконками, а не залезать на них

---

## Затронутые файлы

### Создать новые
- Нет

### Изменить существующие

#### Backend:
- `backend/src/main/java/com/qtab/api/order/dto/OrderItemDetailsResponse.java` — добавить поле `private UUID id;` для OrderItem UUID
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — в mapper-секции где строится `OrderItemDetailsResponse`, добавить `.id(item.getId())` в builder

#### Frontend:
- `frontend/src/components/staff/KitchenOrderCard.tsx` — строки 149, 190: заменить `item.menuItemId` → `item.id`
- `frontend/src/app/(staff)/kitchen/page.tsx` — обновить TypeScript интерфейс `OrderItem`: добавить поле `id: string`
- `frontend/src/components/staff/OrderQueueCard.tsx` — проверить и обновить интерфейс `OrderItem` если используется `menuItemId` вместо `id` для status-update
- `frontend/src/app/(guest)/order/[orderId]/page.tsx` — исправить CSS прогресс-линии статусов (строки ~359-422)

---

## Точная реализация (Technical Design)

### Backend

#### 1. OrderItemDetailsResponse — добавить поле `id`

**Файл:** `backend/src/main/java/com/qtab/api/order/dto/OrderItemDetailsResponse.java`

Добавить поле:
```java
@Builder
@Data
public class OrderItemDetailsResponse {
    private UUID id;          // ← ДОБАВИТЬ: OrderItem UUID (PK)
    private UUID menuItemId;  // уже есть: FK на menu_items
    private String nameRu;
    private Integer quantity;
    // ... остальные поля без изменений
}
```

#### 2. OrderService — маппинг `id` в builder

**Файл:** `backend/src/main/java/com/qtab/api/order/OrderService.java`

Найти все места где строится `OrderItemDetailsResponse.builder()` и добавить `.id(item.getId())`:

```java
return OrderItemDetailsResponse.builder()
        .id(item.getId())           // ← ДОБАВИТЬ
        .menuItemId(item.getMenuItemId())
        .nameRu(nameRu)
        .quantity(item.getQuantity())
        // ... остальные поля
        .build();
```

> ⚠️ Этот маппинг может быть в нескольких методах: `getOrderDetails()`, `getKitchenOrders()`, `getStaffOrders()` и т.д. Нужно найти ВСЕ места через grep по `OrderItemDetailsResponse.builder()`.

### Frontend

#### 3. KitchenOrderCard — замена `menuItemId` → `id`

**Файл:** `frontend/src/components/staff/KitchenOrderCard.tsx`

**Строка ~149** (PENDING → PREPARING):
```tsx
// БЫЛО:
onClick={() => handleItemStatusChange(item.menuItemId, 'PREPARING')}
// СТАЛО:
onClick={() => handleItemStatusChange(item.id, 'PREPARING')}
```

**Строка ~190** (PREPARING → READY):
```tsx
// БЫЛО:
onClick={() => handleItemStatusChange(item.menuItemId, 'READY')}
// СТАЛО:
onClick={() => handleItemStatusChange(item.id, 'READY')}
```

#### 4. TypeScript интерфейсы — добавить `id`

Во всех файлах где определён интерфейс `OrderItem` для staff/kitchen:

```typescript
interface OrderItem {
  id: string;          // ← ДОБАВИТЬ: OrderItem UUID
  menuItemId: string;  // уже есть
  nameRu: string;
  quantity: number;
  // ...
}
```

Проверить файлы:
- `kitchen/page.tsx`
- `KitchenOrderCard.tsx`
- `OrderQueueCard.tsx`
- `dashboard/page.tsx`
- `order/[orderId]/page.tsx` — guest тоже должен получать `id` для WS обработки `ITEM_STATUS_CHANGED`

#### 5. Прогресс-линия статусов — CSS fix

**Файл:** `frontend/src/app/(guest)/order/[orderId]/page.tsx` (строки ~359-422)

Текущая реализация — вертикальная линия с `scaleY` анимацией. Проблемы:
- Линия позиционирована `left-[19px]` и проходит через центры иконок
- Иконки имеют `z-10`, но линия всё равно визуально перекрывает их на мобильных

**Исправление — линия должна быть ПОЗАДИ иконок и обрезаться между ними:**

```tsx
{/* Timeline container */}
<div className="relative pl-10 space-y-6">
  {/* Background bar (gray track) — z-0, позади иконок */}
  <div className="absolute left-[19px] top-[20px] bottom-[20px] w-[2px] bg-white/5 z-0">
    {/* Animated progress fill */}
    <motion.div
      className="w-full bg-gradient-to-b from-primary to-[#D4A853] origin-top rounded-full"
      initial={{ scaleY: 0 }}
      animate={{
        scaleY: activeStatusIndex >= 0 ? activeStatusIndex / (localizedStatusFlow.length - 1) : 0,
      }}
      transition={{ duration: 0.6 }}
      style={{ height: '100%' }}
    />
  </div>

  {/* Status nodes с z-10 — поверх линии */}
  {localizedStatusFlow.map((status, index) => {
    // ... существующий код, убедиться что иконки имеют z-10
    return (
      <div key={status.key} className="relative flex gap-3 items-start">
        <div className="absolute -left-[30px] z-10 flex-shrink-0">
          {/* Иконка с bg заливкой чтобы линия не просвечивала */}
          <motion.div
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 flex-shrink-0 ${
              isActive
                ? 'bg-gradient-to-r from-primary to-[#D4A853] border-primary text-black shadow-[0_0_15px_rgba(212,168,83,0.45)]'
                : isCompleted
                ? 'bg-white/10 border-primary/40 text-primary'
                : 'bg-background border-white/5 text-white/30'  // bg-background чтобы закрыть линию позади
            }`}
            // ... анимация
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
          </motion.div>
        </div>
        {/* Labels */}
      </div>
    );
  })}
</div>
```

**Ключевые изменения:**
1. `top-[20px] bottom-[20px]` вместо `top-3 bottom-3` — линия начинается/заканчивается от **центра** первой/последней иконки (20px = половина от 40px иконки)
2. `z-0` на контейнере линии, `z-10` на иконках — иконки всегда поверх линии
3. Неактивные иконки должны иметь `bg-background` (не прозрачный), чтобы линия не просвечивала сквозь них

---

## Риски и подводные камни

- **Обратная совместимость DTO:** Добавление поля `id` в `OrderItemDetailsResponse` — non-breaking change. Все существующие клиенты продолжат работать, новое поле просто добавится в JSON.
- **Дублирование интерфейсов:** TypeScript интерфейс `OrderItem` может быть определён в нескольких файлах (kitchen/page.tsx, OrderQueueCard.tsx, order/[orderId]/page.tsx). Нужно обновить ВСЕ определения. Лучше вынести в общий `types.ts` если ещё не вынесен.
- **CSS z-index:** Убедиться что `z-10` на иконках не конфликтует с другими z-index на странице.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. В `OrderItemDetailsResponse.java` — добавить поле `private UUID id;`.
- [x] 2. `.\mvnw.cmd clean compile -q -DskipTests` — проверить компиляцию.
- [x] 3. В `OrderService.java` — найти все вызовы `OrderItemDetailsResponse.builder()` (grep) и добавить `.id(item.getId())`.
- [x] 4. `.\mvnw.cmd clean compile -q -DskipTests` — проверить компиляцию.
- [x] 5. `.\mvnw.cmd test` — прогнать тесты, исправить если ломаются.

### Frontend
- [x] 6. Обновить TypeScript интерфейс `OrderItem` во всех файлах: добавить `id: string`.
- [x] 7. В `KitchenOrderCard.tsx` — заменить `item.menuItemId` → `item.id` в обработчиках статуса (строки ~149, ~190).
- [x] 8. Проверить `OrderQueueCard.tsx` — если там тоже есть кнопки смены статуса позиций, заменить аналогично.
- [x] 9. В `order/[orderId]/page.tsx` — исправить CSS прогресс-линии: top/bottom отступы, z-index, bg-background на неактивных иконках.
- [x] 10. `cd frontend && pnpm run build` — проверить сборку.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-09: Исправление Kitchen Item Status + Guest Progress Line`.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — если требуется.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. **Kitchen Status Buttons:**
   - Открыть https://www.qtab.space/kitchen
   - Создать заказ через гостевой интерфейс, подтвердить код
   - На кухне нажать «Взять в работу» — **НЕ должно быть ошибки 500**
   - Нажать галочку (✓) на конкретной позиции → статус должен измениться без ошибок
   
2. **Guest Status Update:**
   - Открыть страницу трекинга заказа как гость
   - На кухне взять заказ в работу → у гостя статус должен измениться на «Готовится»
   - На кухне отметить позицию как «Готово» → у гостя статус позиции обновится

3. **Progress Line:**
   - На странице трекинга гостя прогресс-линия должна:
     - Проходить между иконками, а не сквозь них
     - Иконки должны быть поверх линии (не просвечивать)
     - Активная часть линии должна заканчиваться между текущим и следующим статусом
