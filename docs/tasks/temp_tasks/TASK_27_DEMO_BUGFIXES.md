# TASK: TASK_27_DEMO_BUGFIXES

**Дата создания:** 2026-07-08  
**Приоритет:** High  
**Фаза:** Phase 6  
**Автор плана:** Antigravity  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Устранить критические ошибки демонстрационного режима (демо-зоны) на фронтенде и бэкенде, чтобы обеспечить корректную авто-авторизацию ролей, отображение цен с учетом размеров, стабильность PWA Service Worker без ошибок расширений, корректное отображение и оплату поданных заказов на панели официанта, и избавить гостя от бесконечного цикла тостов-уведомлений.

---

## Контекст

- **Зависит от:** TASK_22_PWA_OFFLINE_AND_PUSH, TASK_23_SAAS_MULTI_TENANCY, TASK_24_MULTI_LANGUAGE_SUPPORT, TASK_25_TELEGRAM_BOT_INTEGRATION, TASK_26_BILL_SPLITTING
- **Затрагивает:** Both (Backend & Frontend)
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (внимание на Tailwind v4 и React 19).
- `docs/CONTEXT_BACKUP.md` — текущий статус.

---

## Затронутые файлы

### Создать новые
- `backend/src/main/resources/db/migration/V14__fix_size_variants_absolute_prices.sql` — Flyway миграция для исправления цен вариантов в демо-данных.

### Изменить существующие
- `backend/src/main/java/com/qtab/api/auth/GuestSessionService.java` — Добавление извлечения activeOrderId из БД и метода очистки кэша Redis.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — Очистка кэша сессии при создании/изменении заказов, добавление статуса SERVED в список активных заказов официанта.
- `backend/src/main/java/com/qtab/api/payment/PaymentService.java` — Очистка кэша сессии при подтверждении оплаты split-частей.
- `frontend/public/sw.js` — Игнорирование не-http(s) GET запросов (chrome-extension).
- `frontend/src/app/(public)/demo/page.tsx` — Корректировка логина для авто-входа шеф-повара (chef вместо kitchen).
- `frontend/src/app/(admin)/layout.tsx` — Импорт компонента AdminSidebar.
- `frontend/src/hooks/useTranslation.ts` — Стабилизация функции `t` через `useCallback`.
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Удаление `t` из зависимостей useEffect.
- `frontend/src/components/guest/MenuItemModal.tsx` — Выбор дефолтного размера по совпадению с базовой ценой.
- `frontend/src/app/(staff)/dashboard/page.tsx` — Вызов API оплаты при переходе заказа в PAID.
- `frontend/src/components/staff/OrderQueueCard.tsx` — Добавление статуса SERVED с переходом в PAID.

---

## Точная реализация (Technical Design)

### Backend

1. **Миграция (`V14__fix_size_variants_absolute_prices.sql`):**
   Обновить `size_variants` для демо-блюд, сделав цены абсолютными, а не смещениями:
   - Борщ с пампушками (`id = 'f1111111-1111-1111-1111-111111111111'`): `{"Стандартный": 12.50, "Двойной": 17.50}`
   - Картофель фри (`id = 'f3333333-3333-3333-3333-333333333333'`): `{"Маленький": 5.00, "Стандартный": 6.50, "Большой": 8.50}`
   - Крылышки Баффало (`id = 'f4444444-4444-4444-4444-444444444444'`): `{"Стандартная порция": 14.00, "Мега порция": 22.00}`
   - Лимонад Домашний (`id = 'f5555555-5555-5555-5555-555555555555'`): `{"0.3л": 6.00, "0.5л": 7.00, "1л": 11.00}`

2. **GuestSessionService.java:**
   - Внедрить `OrderRepository`.
   - В `evictSessionCache(UUID sessionId)`: удалять ключ `"session:" + sessionId` из Redis.
   - В `getSession(UUID sessionId)`: искать активный заказ (статус не PAID и не CANCELLED) в БД и заполнять `activeOrderId` в `SessionResponse`.

3. **OrderService.java:**
   - Внедрить `GuestSessionService` в конструктор.
   - В `createOrder(...)`: после сохранения заказа вызвать `guestSessionService.evictSessionCache(order.getSessionId())`.
   - В `sendOrderStatusChangedNotification(...)`: после обновления статуса вызвать `guestSessionService.evictSessionCache(order.getSessionId())`.
   - В `getActiveOrders(...)`: изменить список фильтруемых статусов с `List.of(OrderStatus.CREATED, OrderStatus.COOKING, OrderStatus.READY)` на `List.of(OrderStatus.CREATED, OrderStatus.COOKING, OrderStatus.READY, OrderStatus.SERVED)`.

4. **PaymentService.java:**
   - Внедрить `GuestSessionService`.
   - В `confirmSplitPayment(...)`: вызвать `guestSessionService.evictSessionCache(order.getSessionId())` при изменении статуса заказа.

### Frontend

1. **sw.js:**
   В самом начале обработчика `'fetch'`:
   ```javascript
   const url = new URL(event.request.url);
   if (url.protocol !== 'http:' && url.protocol !== 'https:') {
     return;
   }
   ```

2. **demo/page.tsx:**
   В `handleAutoLogin`:
   ```typescript
   const login = role === 'KITCHEN' ? 'chef' : role.toLowerCase();
   ```

3. **layout.tsx (app/(admin)):**
   Добавить:
   ```typescript
   import { AdminSidebar } from '@/components/admin/AdminSidebar';
   ```

4. **useTranslation.ts:**
   Обернуть функцию `t` в `useCallback(..., [locale])`. Импортировать `useCallback` из `'react'`.

5. **page.tsx (app/(guest)/menu/[restaurantSlug]/[tableId]):**
   Удалить `t` из массива зависимостей второго `useEffect` (строка ~190).

6. **MenuItemModal.tsx:**
   При смене `item` выбирать default size по совпадению цены с `item.basePrice`:
   ```typescript
   const keys = Object.keys(item.sizeVariants);
   const basePriceKey = keys.find(k => Number(item.sizeVariants![k]) === item.basePrice);
   if (basePriceKey) {
     setSelectedSize(basePriceKey);
   } else {
     const standardKeywords = ['стандартный', 'стандартная', 'стандартная порция', 'standard', 'm', '0.5л', '0.5l'];
     const foundKeyword = keys.find(k => standardKeywords.includes(k.toLowerCase()));
     setSelectedSize(foundKeyword || keys[0]);
   }
   ```

7. **dashboard/page.tsx:**
   В `handleUpdateOrderStatus`:
   ```typescript
   if (nextStatus === 'PAID') {
     await api.post(`/staff/orders/${orderId}/confirm-payment`, { method: 'CASH' });
     toast.success('Оплата принята, счет закрыт');
   } else {
     await api.patch(`/staff/orders/${orderId}/status`, { status: nextStatus });
     toast.success('Статус заказа успешно обновлен');
   }
   ```

8. **OrderQueueCard.tsx:**
   В `getStatusDetails` добавить кейс для `SERVED`:
   ```typescript
   case 'SERVED':
     return { label: 'Подан', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', nextLabel: 'Оплатить', nextStatus: 'PAID', icon: Check };
   ```

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать миграцию `V14__fix_size_variants_absolute_prices.sql`.
- [x] 2. Обновить `GuestSessionService.java`.
- [x] 3. Обновить `OrderService.java`.
- [x] 4. Обновить `PaymentService.java`.
- [x] 5. Собрать бэкенд: `.\mvnw.cmd clean compile -q -DskipTests` и запустить тесты: `.\mvnw.cmd test`.

### Frontend
- [x] 6. Обновить `frontend/public/sw.js`.
- [x] 7. Исправить `demo/page.tsx`.
- [x] 8. Добавить импорт в `layout.tsx` (app/(admin)).
- [x] 9. Обернуть `t` в `useCallback` в `useTranslation.ts`.
- [x] 10. Исправить `page.tsx` гостевого меню (убрать `t` из зависимостей).
- [x] 11. Обновить логику выбора дефолтного размера в `MenuItemModal.tsx`.
- [x] 12. Обновить вызов оплаты в `dashboard/page.tsx`.
- [x] 13. Добавить статус `SERVED` в `OrderQueueCard.tsx`.
- [x] 14. Собрать фронтенд: `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка

1. Зайти в демо-зону `/demo` и войти как Официант, Шеф-повар (экран кухни) и Администратор (все должно открываться без ошибок 401 и JS-ошибок в консоли).
2. Зайти под гостем за стол №2. Убедиться, что нет бесконечного цикла тостов.
3. Открыть карточку "Борщ с пампушками". Выбран по умолчанию "Стандартный" по цене 12.50 BYN, а "Двойной" стоит 17.50 BYN.
4. Сделать заказ под гостем. Убедиться, что на странице официанта заказ мгновенно отобразился.
5. Перевести заказ в COOKING -> READY -> SERVED. Заказ должен остаться в очереди со статусом "Подан" и кнопкой "Оплатить".
6. Нажать "Оплатить" официантом. Заказ должен пропасть из очереди, а стол освободиться.

**Итог ручной проверки:** Все 6 сценариев успешно работают. Ошибок расширений в консоли нет, авто-вход для шефа ('chef') проходит, размеры отображаются корректно с абсолютными ценами, а статус "Подан" позволяет официанту закрывать счета наличными с автоматической отправкой платежа на бэкенд.
