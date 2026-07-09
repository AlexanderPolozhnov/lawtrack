# TASK: Критические баги продакшена — AdminSidebar, i18n ключи, мобильная вёрстка

**Дата создания:** 2026-07-08  
**Приоритет:** High  
**Фаза:** Phase 4 (Integration & Polish)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

> [!TIP]
> Эта задача — чисто фронтенд. Бэкенд не затрагивается. Исправляем 3 критических бага, видимых на проде (qtab.space).

---

## Цель

Исправить 3 production-бага: (1) `AdminSidebar is not defined` при входе в админку, (2) i18n ключи отображаются как сырые строки (`order.pendingDesc`), (3) текст наезжает на иконки на мобильной странице отслеживания заказа.

---

## Контекст

- **Зависит от:** TASK_27_DEMO_BUGFIXES (завершена)
- **Затрагивает:** Frontend only
- **Связанный контракт:** не применимо (UI-only баги)

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — Tailwind CSS v4, shadcn/ui, Inter/Playfair Display шрифты.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- **Выжимка из KNOWN_ISSUES:** Шрифты Inter/Playfair объявлены как пустые строки в root layout (`const inter = { variable: "" }`). `useTranslation` хук использует dot-path resolver с fallback на русский.

---

## Затронутые файлы

### Создать новые
— нет

### Изменить существующие

#### Баг 1: `AdminSidebar is not defined`
- `frontend/src/app/(admin)/layout.tsx` — Проверить и исправить импорт `AdminSidebar`. Убедиться что `'use client'` директива присутствует. Проверить что компонент корректно экспортируется как named export.
- `frontend/src/components/admin/AdminSidebar.tsx` — Проверить что компонент имеет `'use client'` директиву и корректный named export `export function AdminSidebar()`. Если используется default export — поменять на named.

#### Баг 2: i18n ключи показываются как сырые строки
- `frontend/src/locales/ru.json` — Добавить недостающие ключи в секцию `"order"`:
  ```json
  "pendingDesc": "Заказ зарегистрирован и ожидает подтверждения",
  "cookingDesc": "Шеф-повар готовит ваши блюда",
  "readyDesc": "Ваш заказ готов к подаче",
  "servedDesc": "Заказ подан. Приятного аппетита!",
  "updated": "Статус заказа обновлён",
  "tracking": "Отслеживание заказа",
  "status": "Статус"
  ```
- `frontend/src/locales/en.json` — Добавить аналогичные ключи на английском:
  ```json
  "pendingDesc": "Your order has been registered and is awaiting confirmation",
  "cookingDesc": "The chef is preparing your dishes",
  "readyDesc": "Your order is ready to be served",
  "servedDesc": "Your order has been served. Enjoy!",
  "updated": "Order status updated",
  "tracking": "Order tracking",
  "status": "Status"
  ```
- `frontend/src/locales/by.json` — Добавить аналогичные ключи на белорусском:
  ```json
  "pendingDesc": "Замова зарэгістравана і чакае пацвярджэння",
  "cookingDesc": "Шэф-повар рыхтуе вашы стравы",
  "readyDesc": "Ваша замова гатова да падачы",
  "servedDesc": "Замова падана. Смачнага!",
  "updated": "Статус замовы абноўлены",
  "tracking": "Адсочванне замовы",
  "status": "Статус"
  ```

#### Баг 3: Текст налезает на иконки на мобильной странице заказа
- `frontend/src/app/(guest)/order/[orderId]/page.tsx` — В секции статус-таймлайна (примерно строки 270-300) исправить layout:
  1. Добавить `gap-3` между иконкой и текстом в flex-контейнерах статусов.
  2. Добавить `min-w-0` на текстовый блок для корректного `text-overflow`.
  3. Добавить `flex-shrink-0` на иконки чтобы они не сжимались.
  4. Добавить `pl-4` (padding-left) на текстовые описания для отступа от иконок.
  5. Обернуть длинные описания в `<span className="line-clamp-2">` для ограничения высоты.
  6. Проверить что на ширине 320px (iPhone SE) всё корректно отображается.

---

## Точная реализация (Technical Design)

### Баг 1: AdminSidebar

**Диагностика:** Ошибка `AdminSidebar is not defined` в production bundle означает одно из:
1. Компонент не экспортируется как named export (должен быть `export function AdminSidebar()`, НЕ `export default`)
2. В `layout.tsx` импорт `import { AdminSidebar } from '@/components/admin/AdminSidebar'` — проверить точное соответствие имени
3. Возможно отсутствует `'use client'` в самом компоненте (он использует `usePathname()` из next/navigation)

**Исправление:**

В `AdminSidebar.tsx` убедиться:
```tsx
'use client';

// ... imports ...

export function AdminSidebar() {
  // ... component body ...
}
```

В `layout.tsx` убедиться:
```tsx
'use client';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
```

**Если named export корректен** — возможна проблема с Next.js 16 tree-shaking. В этом случае попробовать:
1. Переименовать экспорт в `export const AdminSidebar = () => { ... }` (arrow function)
2. Или добавить re-export через barrel file

### Баг 2: i18n ключи

**Корневая причина:** Ключи `order.pendingDesc`, `order.cookingDesc`, `order.readyDesc`, `order.servedDesc` используются в `order/[orderId]/page.tsx` (строки ~281-284) через `t('order.pendingDesc')`, но отсутствуют во всех 3 locale файлах. Fallback через `||` работает только если `t()` возвращает `undefined`/`null`/`""`, но хук `useTranslation` может возвращать сам ключ при отсутствии.

**Исправление:** Добавить все недостающие ключи во все 3 locale файла (ru/en/by).

Также проверить `useTranslation.ts` — если хук при отсутствии ключа возвращает сам ключ (не `undefined`), то fallback через `||` не сработает. В этом случае изменить хук:

```typescript
// В useTranslation.ts: если ключ не найден, вернуть undefined вместо самого ключа
const value = keys.reduce((obj: Record<string, unknown> | undefined, key: string) => {
  if (obj && typeof obj === 'object' && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;  // ← вернуть undefined, НЕ оригинальный ключ
}, translations as Record<string, unknown>);

return (value as string) ?? undefined;  // ← undefined, не key
```

### Баг 3: Мобильная вёрстка

**Корневая причина:** В order tracking page статус-карточки используют `flex` без `gap` и `shrink-0` на иконках, из-за чего на узких экранах (320-375px) текст перекрывает иконки.

**Исправление:** Найти JSX с status timeline (обычно это `div` с `flex items-center` или `flex items-start`) и добавить:

```tsx
{/* БЫЛО: */}
<div className="flex items-center">
  <StatusIcon className="w-5 h-5 text-amber-400" />
  <div>
    <p className="font-medium">{label}</p>
    <p className="text-sm text-zinc-400">{desc}</p>
  </div>
</div>

{/* СТАЛО: */}
<div className="flex items-start gap-3">
  <StatusIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
  <div className="min-w-0 flex-1">
    <p className="font-medium text-sm sm:text-base truncate">{label}</p>
    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2">{desc}</p>
  </div>
</div>
```

---

## Риски и подводные камни (Edge Cases)

- **Next.js 16 + React 19:** Server Components по умолчанию. `AdminSidebar` использует хуки (`usePathname`, `useTranslation`) — ОБЯЗАТЕЛЬНО `'use client'`.
- **Tailwind CSS v4:** Убедиться что используемые классы (`gap-3`, `flex-shrink-0`, `min-w-0`, `line-clamp-2`, `truncate`) поддерживаются в v4.
- **i18n fallback chain:** Проверить что хук `useTranslation` корректно fallback'ит на русский при отсутствии ключа в en/by.
- **Кэш:** After deploy — проверить что Service Worker не кеширует старый bundle (может понадобиться bumped version).

---

## Порядок реализации для агента

> ⚠️ После каждого пункта — отметить [x]
> ⚠️ Бэкенд НЕ трогаем в этой задаче

### Frontend
- [x] 1. Прочитать `frontend/src/components/admin/AdminSidebar.tsx` и `frontend/src/app/(admin)/layout.tsx`. Проверить exports/imports.
- [x] 2. Исправить AdminSidebar — убедиться в `'use client'`, named export, корректном импорте.
- [x] 3. Прочитать `frontend/src/hooks/useTranslation.ts`. Проверить поведение при отсутствии ключа.
- [x] 4. Если хук возвращает ключ вместо undefined — исправить, чтобы возвращал `undefined`.
- [x] 5. Добавить недостающие i18n ключи в `ru.json`, `en.json`, `by.json` (все 7 ключей в секцию `order`).
- [x] 6. Прочитать `frontend/src/app/(guest)/order/[orderId]/page.tsx`. Найти status timeline JSX.
- [x] 7. Исправить мобильную вёрстку: `gap-3`, `flex-shrink-0` на иконках, `min-w-0` на тексте, responsive font sizes.
- [x] 8. `cd frontend && pnpm run build` — убедиться что сборка проходит без ошибок.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта (включая бэкапы `docs/CONTEXT_BACKUP.md`, ROADMAP, файлы задач, исходный код и комментарии) должно производиться **СТРОГО в кодировке UTF-8**. Использование системной кодировки Windows CP1251 (Windows-1251) или создание смешанных кодировок (mixed encoding/mojibake) КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО. Всегда принудительно сохраняйте файлы в UTF-8.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-08: TASK_28 Production Bugfixes` в самый конец.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `cd frontend && pnpm run dev`
2. Открыть `http://localhost:3000/menu-editor` — должна отобразиться страница с боковой панелью AdminSidebar без ошибок в консоли.
3. Открыть `http://localhost:3000/order/1` (или любой существующий orderId) — проверить:
   - Статусы отображают текст на русском ("Заказ зарегистрирован и ожидает подтверждения"), а не ключи (`order.pendingDesc`)
   - На мобильном разрешении (320px, 375px) текст не наезжает на иконки, есть отступ
4. Переключить язык на EN — проверить что статусы переведены на английский.
5. На проде (qtab.space): после деплоя проверить что AdminSidebar ошибка пропала.
