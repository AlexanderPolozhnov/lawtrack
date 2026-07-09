# TASK: Настройка фронтенда, Tailwind v4, Zustand и инициализации сессии гостя

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 0 / Phase 1  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  

---

## Цель

Инициализировать дизайн-систему (Tailwind CSS v4 + shadcn/ui) на фронтенде, настроить клиент API и Zustand-хранилище сессии гостя, а также реализовать страницу сканирования QR-кода с авто-инициализацией сессии по URL.

---

## Контекст

- **Зависит от:** [TASK_03_GUEST_SESSION_API](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_03_GUEST_SESSION_API.md)
- **Затрагивает:** Frontend
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) #[секция-1]

## Документация для обязательного ознакомления перед началом:
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Фронтенд и UI/UX.
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 5.1 и 13.

> [!NOTE]
> **Сверка с эталонным проектом:** Для верстки макета, настройки глобальных провайдеров (React Query, Toaster) и Zustand-хранилищ подсматривайте в эталоне `C:\.development\Projects\polozhnov-dev\frontend\src\`:
> - Структура `layout.tsx` и провайдеров: `frontend/src/app/layout.tsx` и компоненты в `frontend/src/components/` (например, `providers` или `layout`).
> - Zustand хранилища: `frontend/src/stores/` (например, корзина или фильтры).
> - API-клиент: `frontend/src/lib/api.ts` или аналогичные вызовы fetch/query.

---

## Затронутые файлы

### Создать новые
- `frontend/src/lib/api.ts` — HTTP клиент на базе fetch для работы с REST API.
- `frontend/src/stores/useGuestStore.ts` — Zustand хранилище сессии гостя (с персистентностью в localStorage).
- `frontend/src/components/providers.tsx` — Провайдеры React Query, Zustand и Sonner toast.
- `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx` — Страница инициализации/меню по QR.

### Изменить существующие
- `frontend/src/app/globals.css` — импорт Tailwind v4 и переменных темы.
- `frontend/src/app/layout.tsx` — интеграция `providers.tsx` и настройка шрифта `Inter`.

---

## Точная реализация (Technical Design)

### 1. Стили и Темы (`globals.css`)
- Подключить Tailwind v4 `@theme` с базовыми цветами:
  - `--background`: `#0F0F0F` (для темной темы)
  - `--foreground`: `#FAFAF8`
  - `--primary`: `#D4A853` (золотой акцент)
  - `--card`: `#1A1A2E`

### 2. Zustand Хранилище (`useGuestStore.ts`)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuestSessionState {
  sessionId: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  tableId: string | null;
  tableNumber: number | null;
  activeOrderId: string | null;
  setSession: (session: Partial<GuestSessionState>) => void;
  clearSession: () => void;
}

export const useGuestStore = create<GuestSessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      restaurantId: null,
      restaurantName: null,
      tableId: null,
      tableNumber: null,
      activeOrderId: null,
      setSession: (session) => set((state) => ({ ...state, ...session })),
      clearSession: () => set({ sessionId: null, restaurantId: null, restaurantName: null, tableId: null, tableNumber: null, activeOrderId: null }),
    }),
    { name: 'qtab-guest-session' }
  )
);
```

### 3. API Клиент (`frontend/src/lib/api.ts`)
- Обертка над `fetch` с префиксом `/api/v1` (или полным URL бэкенда из `process.env.NEXT_PUBLIC_API_URL`).
- Автоматически обрабатывать JSON и ошибки, возвращая типизированные ответы.

### 4. Страница Инициализации (`page.tsx`)
Путь: `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx`
- Получить `restaurantSlug` и `tableId` из параметров маршрута.
- При монтировании (`useEffect`):
  1. Сверить `tableId` в URL и в Zustand-хранилище.
  2. Если сессия существует, вызвать `GET /guest/session/{sessionId}` для проверки её активности.
  3. Если сессии нет, или ID стола изменился, или сессия невалидна (ошибка 404):
     - Вызвать `POST /guest/session/init` с передачей `restaurantSlug` и `tableId`.
     - Записать ответ в Zustand-хранилище.
  4. Во время инициализации показывать анимированный Splash Screen с золотым логотипом `QTab`.
  5. После успешного завершения — редирект или отображение меню (пока заглушка "Добро пожаловать в ресторан X, столик Y").

---

## Риски и подводные камни (Edge Cases)

- **SSR Hydration в Zustand:** При использовании Zustand `persist` на стороне сервера значения будут пустыми, а на клиенте наполнятся. Во избежание hydration error использовать флаг `mounted` в компонентах или проверку `typeof window !== 'undefined'`.
- **Изменение столика гостем:** Если гость пересел за другой столик и сканировал новый QR, старая сессия должна корректно затереться новой. Сверка `tableId` из URL и хранилища решает этот кейс.

---

## Порядок реализации для агента

### Frontend
- [x] 1. Настроить Tailwind v4 и шрифты в `globals.css` и `layout.tsx`.
- [x] 2. Создать `providers.tsx` с React Query (`QueryClientProvider`) и `Sonner` (toaster).
- [x] 3. Написать API клиент в `lib/api.ts`.
- [x] 4. Создать Zustand хранилище `useGuestStore.ts` с поддержкой `persist`.
- [x] 5. Создать страницу `menu/[restaurantSlug]/[tableId]/page.tsx`.
- [x] 6. Реализовать анимированный Splash-скрин инициализации сессии.
- [x] 7. Убедиться в успешном билде проекта: `pnpm run build` из папки `frontend`.

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

1. Запустить бэкенд и фронтенд.
2. Открыть в браузере: `http://localhost:3000/menu/chaihona-minsk/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d`.
3. Убедиться, что показывается Splash-screen загрузки, а затем текст "Добро пожаловать в Чайхона Минск, Столик 12".
4. Проверить в Application -> Local Storage браузера запись `qtab-guest-session` с валидными UUID.
