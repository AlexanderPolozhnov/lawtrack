# TASK: Финансовая отчётность и AI-аналитический дашборд (Finance & Analytics)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 3  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать систему финансовой аналитики: бэкенд эндпоинты для расчета выручки, среднего чека, популярных блюд и экспорта в CSV, а также интерактивный дашборд с графиками Recharts на фронтенде панели администратора.

---

## Context

- **Зависит от:** TASK_10 (Payments), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/finance/**`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 3, «Финансовые отчеты и экспорт в CSV/PDF».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/analytics/dto/FinanceSummaryResponse.java` — DTO для агрегированных финансовых показателей.
- `backend/src/main/java/com/qtab/api/analytics/dto/SalesChartPoint.java` — Точка на графике продаж (дата + выручка + кол-во заказов).
- `backend/src/main/java/com/qtab/api/analytics/dto/PopularItemResponse.java` — Топ блюд (название, кол-во порций, общая сумма).
- `backend/src/main/java/com/qtab/api/analytics/dto/CategoryShareResponse.java` — Доля категории в общей выручке.
- `backend/src/main/java/com/qtab/api/analytics/FinanceService.java` — Сервис агрегации финансовых данных из БД (заказы, платежи).
- `backend/src/main/java/com/qtab/api/analytics/AdminFinanceController.java` — REST-контроллер финансовой аналитики и экспорта.

**Frontend:**
- `frontend/src/app/(admin)/analytics/page.tsx` — Страница аналитики: дашборд с графиками динамики выручки, популярными блюдами и экспортом CSV.

### Изменить существующие

**Frontend:**
- `frontend/package.json` — Добавить зависимости `recharts` для рендеринга графиков.

---

## Точная реализация (Technical Design)

### 1. Backend SQL запросы и логика

Нам нужно собирать данные о подтвержденных транзакциях (`payments` со статусом CONFIRMED/PAID).

#### SQL для FinanceSummary (выручка, средний чек, кол-во заказов):
```sql
SELECT 
    COALESCE(SUM(amount), 0) as totalRevenue,
    COUNT(id) as totalOrders,
    CASE WHEN COUNT(id) > 0 THEN SUM(amount) / COUNT(id) ELSE 0 END as averageBill
FROM payments 
WHERE created_at BETWEEN :startDate AND :endDate AND order_id IN (
    SELECT id FROM orders WHERE restaurant_id = :restaurantId
);
```

#### SQL для динамики продаж посуточно:
```sql
SELECT 
    DATE(created_at) as date,
    SUM(amount) as revenue,
    COUNT(id) as ordersCount
FROM payments
WHERE created_at BETWEEN :startDate AND :endDate 
  AND order_id IN (SELECT id FROM orders WHERE restaurant_id = :restaurantId)
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

#### SQL для популярных блюд:
```sql
SELECT 
    mi.name_ru as itemName,
    SUM(oi.quantity) as totalQuantity,
    SUM(oi.quantity * oi.unit_price) as totalRevenue
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'PAID' AND o.restaurant_id = :restaurantId AND o.created_at BETWEEN :startDate AND :endDate
GROUP BY mi.name_ru
ORDER BY totalQuantity DESC
LIMIT 10;
```

#### SQL для категорий:
```sql
SELECT 
    mc.name_ru as categoryName,
    SUM(oi.quantity * oi.unit_price) as revenue
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN menu_categories mc ON mi.category_id = mc.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'PAID' AND o.restaurant_id = :restaurantId AND o.created_at BETWEEN :startDate AND :endDate
GROUP BY mc.name_ru;
```

#### Экспорт в CSV:
Контроллер возвращает текстовый файл с заголовком `text/csv`.
Заголовки: `Номер заказа,Столик,Способ оплаты,Сумма,Дата и время`.
Сформировать строку CSV в цикле и записать в Response.

### 2. Frontend Analytics Dashboard
- Установить библиотеку `recharts`.
- Дашборд содержит:
  - Выбор периода (Сегодня, Вчера, Последние 7 дней, Последние 30 дней, Месяц).
  - Сетка карточек: Выручка (BYN), Количество оплаченных заказов, Средний чек (BYN).
  - **Динамический график продаж (AreaChart / LineChart)**: по оси X — даты, по оси Y — выручка (красивый градиентный золотой цвет `#D4A853`).
  - **Круговая диаграмма (PieChart)**: выручка по категориям.
  - **Таблица популярных блюд**: топ-10 с количеством проданных порций.
  - Кнопка «Экспорт CSV» -> инициирует скачивание файла.

---

## Риски и подводные камни (Edge Cases)

- **Диапазоны дат:** Обрабатывать часовые пояса. Передавать параметры `startDate` и `endDate` в формате ISO-8601 (LocalDateTime на бэкенде).
- **Пустые данные:** Если за выбранный период не было продаж, графики и карточки не должны ломаться (возвращать дефолтные нули).
- **Recharts Hydration Mismatch:** Recharts часто вызывает hydration warning в Next.js App Router из-за использования динамических ID для градиентов и SVG. Обернуть графики в `<ResponsiveContainer>` внутри компонента, загружаемого через `dynamic(() => ..., { ssr: false })` от Next.js.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать DTO классы для финансовой статистики.
- [x] 2. Создать `FinanceService.java` с native/JPQL запросами.
- [x] 3. Реализовать `AdminFinanceController.java` с эндпоинтами для графиков, популярных блюд и CSV-экспорта.
- [x] 4. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 5. Добавить `recharts` в `frontend/package.json` и выполнить `pnpm install` (или `npm install` через pnpm).
- [x] 6. Создать динамический оберточный компонент для графиков, чтобы избежать hydration mismatch.
- [x] 7. Создать страницу `/analytics/page.tsx` с карточками метрик, графиком выручки и таблицей популярных блюд.
- [x] 8. Добавить кнопку выгрузки CSV с корректной обработкой заголовков UTF-8 (добавить BOM маркер `\uFEFF`, чтобы Excel понимал кириллицу).
- [x] 9. Выполнить `cd frontend && pnpm run build`.

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

1. Войти под администратором и перейти в раздел «Аналитика».
2. Проверить отображение карточек «Выручка», «Заказы» и «Средний чек». Значения должны соответствовать оплаченным заказам в демо-данных.
3. Проверить наличие линейного графика продаж и круговой диаграммы долей категорий.
4. Убедиться, что в таблице топ-блюд отображаются позиции с количеством и суммой.
5. Нажать «Экспорт в CSV» -> Должен скачаться файл `sales_report.csv`. Открыть его, проверить корректность отображения кириллицы (названия блюд и категории) в Excel.
