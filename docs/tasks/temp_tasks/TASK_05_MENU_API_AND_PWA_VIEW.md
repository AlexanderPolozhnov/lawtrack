# TASK: REST API меню и отображение карточек блюд с модификаторами в PWA гостя

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Реализовать эндпоинт получения меню ресторана `GET /api/v1/menu/{restaurantId}` с кэшированием в Redis, а также сверстать интерактивный гостевой интерфейс просмотра категорий, поиска блюд и модального окна добавления блюда с модификаторами и комментариями.

---

## Контекст

- **Зависит от:** [TASK_04_FRONTEND_FOUNDATION_AND_SESSION](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_04_FRONTEND_FOUNDATION_AND_SESSION.md)
- **Затрагивает:** Both
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) #[секция-2]

## Документация для обязательного ознакомления перед началом:
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 5.2, 5.3 и 14.
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Ключевые архитектурные правила.

> [!NOTE]
> **Сверка с эталонным проектом:** Для построения качественного адаптивного UI, анимаций карточек и модальных окон с помощью Framer Motion обратите внимание на компоненты эталонного проекта `C:\.development\Projects\polozhnov-dev\frontend\src\components\`:
> - Интерактивные списки и фильтры: `PortfolioGrid.tsx` или аналогичные компоненты с фильтрацией на клиенте.
> - Всплывающие диалоги/окна: `ProposalGeneratorModal.tsx` или `FeedbackWidget.tsx` для модальных форм.

---

## Затронутые файлы

### Создать новые
- `backend/src/main/java/com/qtab/api/menu/MenuCategory.java` — JPA Entity для категорий.
- `backend/src/main/java/com/qtab/api/menu/MenuItem.java` — JPA Entity для блюд.
- `backend/src/main/java/com/qtab/api/menu/MenuCategoryRepository.java` — Репозиторий категорий.
- `backend/src/main/java/com/qtab/api/menu/MenuItemRepository.java` — Репозиторий блюд.
- `backend/src/main/java/com/qtab/api/menu/MenuController.java` — REST контроллер меню.
- `backend/src/main/java/com/qtab/api/menu/MenuService.java` — Сервис с кэшированием в Redis.
- `frontend/src/components/guest/MenuCategories.tsx` — Горизонтальный список категорий с авто-скроллом.
- `frontend/src/components/guest/MenuItemCard.tsx` — Карточка блюда в меню.
- `frontend/src/components/guest/MenuItemModal.tsx` — Модальное детальное окно блюда (размер, модификаторы, коммент).

### Изменить существующие
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Добавить рендер меню после инициализации сессии.

---

## Точная реализация (Technical Design)

### 1. Схема сущностей и DTO
`MenuCategory` содержит `List<MenuItem> items` с аннотацией `@OrderBy("sortOrder ASC")`.
Эндпоинт `GET /api/v1/menu/{restaurantId}` возвращает:
```json
{
  "categories": [
    {
      "id": "UUID",
      "nameRu": "Пицца",
      "nameEn": "Pizza",
      "iconEmoji": "🍕",
      "items": [
        {
          "id": "UUID",
          "nameRu": "Маргарита",
          "basePrice": 18.50,
          "cookingTimeMinutes": 15,
          "badges": ["HIT"],
          "imageUrl": "...",
          "sizeVariants": {"S": 15.00, "M": 18.50, "L": 22.00},
          "modifiers": [{"id": "m1", "name": "Сыр", "price": 2.0}]
        }
      ]
    }
  ]
}
```
Кэш Redis по ключу `menu:{restaurantId}:cache` (строка JSON, TTL = 15 минут).

### 2. Верстка PWA меню гостя
- **Sticky Header:** Название ресторана, Номер столика, кнопка Корзины с числовым индикатором.
- **Горизонтальные Табы Категорий:** Sticky-панель под хедером, плавная прокрутка к категории при клике.
- **Поиск и Фильтрация:** Поле ввода (fuzzy search по названию/описанию блюда) + кнопки-чипы (🌶️ Острое, 🥬 Вегетарианское).

### 3. Модалка выбора блюда (`MenuItemModal.tsx`)
- Клик по карточке блюда → открывается полноэкранный Bottom Sheet (или Dialog в shadcn/ui).
- Конструктор блюда:
  - Выбор размера (разные цены, radio buttons).
  - Чекбоксы дополнительных ингредиентов (модификаторы).
  - **Текстовое поле ввода:** "Комментарий к блюду" (например, "Без лука").
  - Липкая кнопка снизу: `Добавить в корзину — {Итоговая сумма} BYN`.

---

## Риски и подводные камни (Edge Cases)

- **Redis Cache Invalidation:** При изменении меню администратором кэш `menu:{restaurantId}:cache` должен принудительно удаляться (`redisTemplate.delete(...)`).
- **Спецификация `@theme` в Tailwind v4:** Стилизация модального окна должна идеально подстраиваться под мобильный размер экрана (max-w-md, rounded-t-3xl для bottom-sheet на телефонах).

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать JPA Entities `MenuCategory` и `MenuItem`.
- [x] 2. Создать репозитории, возвращающие только `is_active = true` записи.
- [x] 3. Реализовать `MenuService` с логикой кэширования в Redis.
- [x] 4. Написать `MenuController` с эндпоинтом `GET /api/v1/menu/{restaurantId}`.
- [x] 5. Написать интеграционный тест на кэширование меню.

### Frontend
- [x] 6. Создать типы данных для категорий, блюд, модификаторов.
- [x] 7. Сверстать `MenuCategories.tsx` и `MenuItemCard.tsx` с использованием Framer Motion.
- [x] 8. Реализовать `MenuItemModal.tsx` с расчетом цены на клиенте и вводом комментария.
- [x] 9. Интегрировать компоненты на страницу меню по QR.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручной проверки.

---

## Ручная проверка

1. Заполнить тестовое меню в БД (категории и блюда).
2. Запустить бэкенд и фронтенд.
3. Открыть страницу меню в PWA.
4. Убедиться, что категории переключаются, а поиск находит блюдо по первым буквам.
5. Открыть модальное окно блюда, выбрать модификаторы и проверить правильный пересчет суммы.
