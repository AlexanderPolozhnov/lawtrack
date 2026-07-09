# TASK: Исправление цен в демо-данных и защита от некорректных sizeVariants

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 6 (Полировка)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  
**Порядок выполнения:** 1 из 5

---

## Цель

После выполнения: цены блюд в карточке меню и в модалке детали блюда совпадают. Паста Карбонара и все остальные демо-блюда корректно показывают абсолютные цены. Код защищён от повторения бага с нулевыми ценами.

---

## Контекст

- **Зависит от:** Ничего (изолированная задача)
- **Затрагивает:** Backend (миграция) + Frontend (MenuItemModal, MenuItemCard)
- **Связанный контракт:** `docs/FRONTEND_BACKEND_CONTRACT.md` — Модуль 4 (Меню), поле `sizeVariants`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `docs/FRONTEND_BACKEND_CONTRACT.md` — Секция 4 (Menu).

### Суть бага

**Миграция V4** засеяла демо-данные с `size_variants` в формате **офсетов** от `base_price`:
```sql
-- Паста Карбонара: base_price = 18.00, size_variants = '{"Стандартная": 0.00}'
-- Т.е. "0.00" означало "+0.00 к base_price"
```

**Миграция V14** преобразовала офсеты в абсолютные цены для 4-х блюд, но **пропустила Пасту Карбонару**. В результате:
- **MenuItemCard** (список меню) — показывает `item.basePrice` = **18.00 BYN** ✅
- **MenuItemModal** (модалка деталей) — при выборе размера "Стандартная" показывает `sizeVariants["Стандартная"]` = **0.00 BYN** ❌

---

## Затронутые файлы

### Создать новые
- `backend/src/main/resources/db/migration/V17__fix_carbonara_size_variants.sql` — Flyway миграция для исправления цены Пасты Карбонары и проверки всех остальных блюд

### Изменить существующие
- `frontend/src/components/guest/MenuItemModal.tsx` — в функции расчёта цены (строки ~70-74, `let basePrice = item.basePrice; if (selectedSize && item.sizeVariants...)`) добавить проверку: если значение `sizeVariants[selectedSize]` <= 0 или undefined, использовать `item.basePrice` как fallback

---

## Точная реализация (Technical Design)

### Backend

#### Миграция V17__fix_carbonara_size_variants.sql
```sql
-- Fix Паста Карбонара size_variants (still had offset format from V4)
UPDATE menu_items
SET size_variants = '{"Стандартная": 18.00}'::jsonb
WHERE id = 'f2222222-2222-2222-2222-222222222222'
  AND size_variants::jsonb->>'Стандартная' = '0.00';

-- Safety net: fix any other items that have 0-value size variants
-- (set them to base_price)
UPDATE menu_items
SET size_variants = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value::text::numeric <= 0 THEN to_jsonb(base_price)
      ELSE value
    END
  )
  FROM jsonb_each(size_variants::jsonb)
)
WHERE size_variants IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(size_variants::jsonb)
    WHERE value::numeric <= 0
  );
```

> ⚠️ Точный UUID Пасты Карбонары: `f2222222-2222-2222-2222-222222222222`. Проверь его через grep в `V4__seed_demo_data.sql`.

### Frontend

#### MenuItemModal.tsx — защита от нулевых цен

В функции расчёта цены (строки ~70-74):

**БЫЛО:**
```tsx
let basePrice = item.basePrice;
if (selectedSize && item.sizeVariants && item.sizeVariants[selectedSize] !== undefined) {
  basePrice = item.sizeVariants[selectedSize];
}
```

**СТАЛО:**
```tsx
let basePrice = item.basePrice;
if (selectedSize && item.sizeVariants && item.sizeVariants[selectedSize] !== undefined) {
  const variantPrice = item.sizeVariants[selectedSize];
  // Защита: если цена варианта <= 0, используем basePrice как fallback
  basePrice = variantPrice > 0 ? variantPrice : item.basePrice;
}
```

Также добавить аналогичную защиту в рендеринге кнопок выбора размера (строки ~198-199), где отображается цена каждого варианта:

**В JSX кнопок размера**, где отображается `price.toFixed(2)`, добавить:
```tsx
const displayPrice = price > 0 ? price : item.basePrice;
// Использовать displayPrice.toFixed(2) вместо price.toFixed(2)
```

---

## Риски и подводные камни

- **База данных:** Миграция V17 идемпотентна (условие `WHERE ... = '0.00'`), повторный запуск не сломает данные.
- **Кэш:** После миграции меню Redis-кэш обновится автоматически через 15 минут (TTL). На проде можно ускорить, перезапустив бэкенд.
- **Другие блюда:** Safety-net запрос в миграции проверяет ВСЕ блюда с нулевыми ценами, не только Карбонару.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Создать `V17__fix_carbonara_size_variants.sql` с UPDATE для Карбонары и safety-net для всех нулевых цен.
- [x] 2. `.\mvnw.cmd clean compile -q -DskipTests` — проверить что миграция корректная.

### Frontend
- [x] 3. В `MenuItemModal.tsx` — добавить защиту от нулевых/отрицательных цен в расчёте `basePrice` (строки ~70-74).
- [x] 4. В `MenuItemModal.tsx` — добавить защиту от нулевых цен в UI кнопок выбора размера (строки ~198-199).
- [x] 5. `cd frontend && pnpm run build` — проверить сборку.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-09: Исправление цен демо-данных` в самый конец файла.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — если требуется.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть https://www.qtab.space/menu/qtab-demo/{tableId}
2. Найти «Паста Карбонара» в списке — должна показываться цена **18.00 BYN**.
3. Нажать на карточку — в модалке должна быть та же цена **18.00 BYN**, не 0.00.
4. Выбрать размер «Стандартная» — цена должна остаться **18.00 BYN**.
5. Нажать «Добавить» — в корзине цена должна быть **18.00 BYN**.
6. Проверить аналогично все остальные демо-блюда (Борщ, Картофель фри, Крылышки, Лимонад).
