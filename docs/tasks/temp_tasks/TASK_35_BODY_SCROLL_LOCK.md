# TASK: Body Scroll Lock для модальных окон гостевого интерфейса

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 6 (Полировка)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  
**Порядок выполнения:** 2 из 5

---

## Цель

После выполнения: при открытии модалки блюда (MenuItemModal), корзины (CartDrawer) или диалога подтверждения (OrderConfirmationDialog) скролл фоновой страницы блокируется. Скролл работает только внутри открытого модального окна (в области контента ниже фото/заголовка). При закрытии модалки скролл фона восстанавливается.

---

## Контекст

- **Зависит от:** Ничего (изолированная UI-задача)
- **Затрагивает:** Frontend only
- **Связанный контракт:** Не требуется

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (Framer Motion, shadcn/ui не используется для этих модалок).
- `docs/CONTEXT_BACKUP.md` — текущий статус.

### Суть проблемы

Все 3 модальных окна гостевого интерфейса реализованы как custom Framer Motion компоненты и **не блокируют скролл фона**:

| Компонент | Файл | Scroll Lock | ESC Key |
|---|---|---|---|
| `MenuItemModal` | `frontend/src/components/guest/MenuItemModal.tsx` (314 строк) | ❌ Нет | ✅ Есть |
| `CartDrawer` | `frontend/src/components/guest/CartDrawer.tsx` (495 строк) | ❌ Нет | ❌ Нет |
| `OrderConfirmationDialog` | `frontend/src/components/guest/OrderConfirmationDialog.tsx` (231 строка) | ❌ Нет | ❌ Нет |

Единственный scroll lock в проекте — `Navbar.tsx` (лендинг), использующий `document.body.style.overflow = 'hidden'`.

В проекте **нет** `@radix-ui/*`, `vaul`, `body-scroll-lock` или shadcn/ui Sheet/Dialog. Все модалки — custom `framer-motion`.

---

## Затронутые файлы

### Создать новые
- `frontend/src/hooks/useBodyScrollLock.ts` — React-хук для блокировки скролла `<body>` при открытии модальных окон

### Изменить существующие
- `frontend/src/components/guest/MenuItemModal.tsx` — добавить вызов `useBodyScrollLock(isOpen)`, а также добавить обработчик ESC если его нет (уже есть по данным исследования)
- `frontend/src/components/guest/CartDrawer.tsx` — добавить вызов `useBodyScrollLock(isOpen)` и обработчик ESC
- `frontend/src/components/guest/OrderConfirmationDialog.tsx` — добавить вызов `useBodyScrollLock(isOpen)` и обработчик ESC

---

## Точная реализация (Technical Design)

### Frontend

#### Хук `useBodyScrollLock.ts`

```typescript
'use client';

import { useEffect } from 'react';

/**
 * Блокирует скролл <body> и <html> при `isLocked === true`.
 * Восстанавливает исходное значение при размонтировании или `isLocked === false`.
 * Учитывает ширину скроллбара для предотвращения "прыжка" контента.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}
```

#### Применение в компонентах

Во всех 3 компонентах добавить в начало функционального компонента:

```typescript
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

// Внутри компонента:
useBodyScrollLock(isOpen);
```

#### Обработчик ESC для CartDrawer и OrderConfirmationDialog

Добавить `useEffect` для обработки Escape:

```typescript
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  if (isOpen) {
    document.addEventListener('keydown', handleEsc);
  }
  return () => document.removeEventListener('keydown', handleEsc);
}, [isOpen, onClose]);
```

> **Примечание:** `MenuItemModal` уже имеет обработчик ESC (строки 57-63). Для CartDrawer и OrderConfirmationDialog его нужно добавить.

---

## Риски и подводные камни

- **iOS Safari:** `overflow: hidden` на `<body>` не всегда блокирует скролл на iOS. Если потребуется, добавить `position: fixed; width: 100%` на body, но это вызовет скачок к верху страницы. Текущее решение достаточно для MVP.
- **Вложенные модалки:** Если одна модалка открыта поверх другой (например, OrderConfirmationDialog поверх CartDrawer), `overflow: hidden` будет установлен дважды, но cleanup восстановит исходное значение. Это корректно работает.
- **Ширина скроллбара:** Компенсация `paddingRight` предотвращает визуальный сдвиг контента при скрытии скроллбара.

---

## Порядок реализации для агента

> ⚠️ После каждого пункта — отметить [x]

### Frontend
- [x] 1. Создать хук `frontend/src/hooks/useBodyScrollLock.ts`.
- [x] 2. В `MenuItemModal.tsx` — добавить `useBodyScrollLock(isOpen)`.
- [x] 3. В `CartDrawer.tsx` — добавить `useBodyScrollLock(isOpen)` и обработчик ESC.
- [x] 4. В `OrderConfirmationDialog.tsx` — добавить `useBodyScrollLock(isOpen)` и обработчик ESC.
- [x] 5. `cd frontend && pnpm run build` — проверить сборку.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-09: Body Scroll Lock для модальных окон`.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — если требуется.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть https://www.qtab.space/menu/qtab-demo/{tableId} на мобильном устройстве или в мобильном режиме Chrome DevTools.
2. Прокрутить страницу меню вниз.
3. Нажать на любое блюдо — модалка должна открыться. **Попробовать прокрутить фон** — он НЕ должен скроллиться.
4. Прокрутить контент модалки (описание, модификаторы) — скролл должен работать внутри модалки.
5. Нажать ESC или тапнуть фон — модалка закрывается, скролл фона восстанавливается.
6. Повторить для корзины (CartDrawer) — открыть, проверить блокировку скролла, ESC.
7. Создать заказ — при появлении OrderConfirmationDialog фон не должен скроллиться.
