# TASK: Мультиязычность интерфейса и меню гостя (Multi-Language Support)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 6  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (Medium)

---

## Цель

Реализовать мультиязычность интерфейса и меню ресторана (поддержка языков RU, EN, BY) на фронтенде с использованием JSON-словарей локализации, сохранением выбора в LocalStorage и адаптацией вывода текстовых полей блюд (`nameRu`/`nameEn`, `descriptionRu`/`descriptionEn`).

---

## Контекст

- **Зависит от:** TASK_04 (Frontend Foundation), TASK_05 (Menu PWA), TASK_12 (Admin Layout)
- **Затрагивает:** Frontend only
- **Связанный контракт:** —

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 6, «Мультиязычность меню и интерфейса (next-intl: RU/EN/BY)».

---

## Затронутые файлы

### Создать новые

**Frontend:**
- `frontend/src/locales/ru.json` — Словарь переводов на русский язык (кнопки, корзина, статусы, админка).
- `frontend/src/locales/en.json` — Словарь переводов на английский язык.
- `frontend/src/locales/by.json` — Словарь переводов на белорусский язык.
- `frontend/src/hooks/useTranslation.ts` — Простой и быстрый React-хук для интернационализации, который загружает активный словарь из стейта и возвращает функцию `t(key)`. (Используем нативный хук во избежание проблем сборки сложных библиотек next-intl в среде React 19).

### Изменить существующие

**Frontend:**
- `frontend/src/stores/useGuestStore.ts` — Добавить поле `locale` (default: "ru") в стор с сохранением в localStorage.
- `frontend/src/components/providers.tsx` — Инициализировать провайдер локали (или просто загружать хук).
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` & `frontend/src/components/guest/CartDrawer.tsx` & `frontend/src/components/guest/MenuItemCard.tsx` — 
  - Заменить статические строки на функцию перевода `t()`.
  - Отображать поля блюд и категорий динамически: `item.nameEn` при локали `en`, иначе `item.nameRu`.
- `frontend/src/app/(admin)/layout.tsx` — Добавить переключатель локали в шапку админки.
- `frontend/src/components/admin/AdminSidebar.tsx` — Локализовать пункты меню сайдбара.

---

## Точная реализация (Technical Design)

### 1. Структура JSON словаря (ru.json / en.json / by.json)

Пример `ru.json`:
```json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Произошла ошибка",
    "save": "Сохранить",
    "delete": "Удалить",
    "cancel": "Отмена"
  },
  "menu": {
    "search": "Поиск блюд...",
    "empty": "Ничего не найдено",
    "callWaiter": "Вызвать официанта",
    "requestBill": "Запросить счет"
  },
  "cart": {
    "title": "Корзина",
    "checkout": "Оформить заказ",
    "empty": "Ваша корзина пуста",
    "total": "Итого"
  }
}
```

### 2. Реализация хука useTranslation.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import ru from '../locales/ru.json';
import en from '../locales/en.json';
import by from '../locales/by.json';

type Locale = 'ru' | 'en' | 'by';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ru',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'qtab-locale-storage' }
  )
);

const dictionaries = { ru, en, by };

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = dictionaries[locale];

    for (const key of keys) {
      if (current[key] === undefined) {
        return path; // Возвращаем ключ как fallback
      }
      current = current[key];
    }
    return current;
  };

  return { t, locale, setLocale };
}
```

### 3. Динамическая локализация MenuItemCard.tsx
```typescript
const { locale } = useTranslation();
const name = locale === 'en' ? item.nameEn : item.nameRu;
const description = locale === 'en' ? item.descriptionEn : item.descriptionRu;
```

---

## Риски и подводные камни (Edge Cases)

- **Отсутствие перевода в BY-локали для блюд бэкенда:** На бэкенде у сущностей `MenuItem` и `MenuCategory` есть поля только для `Ru` и `En`. При выборе локали `by` фронтенд должен делать фоллбек на `Ru` текст блюд (`nameRu`/`descriptionRu`), но весь интерфейс приложения (кнопки, корзина, уведомления) переводить на белорусский язык из файла `by.json`.

---

## Порядок реализации для агента

### Frontend
- [ ] 1. Создать JSON словари `ru.json`, `en.json`, `by.json` в папке `frontend/src/locales/`.
- [ ] 2. Создать хук `useTranslation.ts` для управления локалью и перевода строк.
- [ ] 3. Локализовать страницы гостя: меню, корзину, трекинг заказа, чек и профиль.
- [ ] 4. Реализовать красивую кнопку-переключатель локали (селект с флагами 🇷🇺/🇬🇧/🇧🇾) в шапке гостевого экрана.
- [ ] 5. Локализовать макет админ-панели, сайдбар и страницу редактора меню.
- [ ] 6. Добавить переключатель языков в шапку админ-панели.
- [ ] 7. Убедиться, что выбранная локаль сохраняется после обновления страницы.
- [ ] 8. Выполнить `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1`.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [ ] Запусти `.\rotate-backup.ps1`.
4. [ ] Синхронизируй `ROADMAP.md`.
5. [ ] Перемести файл этой задачи в `docs/tasks/temp_tasks/`.
6. [ ] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть гостевое меню в браузере. По умолчанию интерфейс должен быть на русском языке.
2. В верхнем углу нажать на селект языка и выбрать `English`.
3. Убедиться, что:
   - Кнопки («Вызвать официанта», «Корзина», «Поиск») перевелись на английский язык.
   - Названия блюд и их описания отображаются на английском языке (из полей `nameEn`/`descriptionEn` бэкенда).
4. Переключить язык на `Беларуская`.
5. Убедиться, что:
   - Кнопки и тексты интерфейса перевелись на белорусский язык (например, «Кошык», «Выклікаць афіцыянта»).
   - Названия блюд отображаются на русском языке (так как в БД нет полей для BY-языка, сработал корректный фоллбек).
6. Обновить страницу — язык должен остаться белорусским (проверка сохранения в localStorage).
7. Зайти в админку, проверить, что сайдбар и шапка перевелись при выборе английского языка в шапке админки.
