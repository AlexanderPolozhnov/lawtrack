# TASK: TASK_04_FRONTEND_CORE (Фронтенд: API-клиент, сетка дашборда, фильтры и счётчики)

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 3  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Создана базовая сетка фронтенда Next.js 16 (светлая тема LegalTech с акцентом индиго), подключен API-клиент и TanStack React Query, разработаны компоненты счетчиков статусов (`StatsCards`) и панель поиска/фильтрации (`SearchFilterBar`).

---

## Контекст

- **Зависит от:** TASK_01_INITIAL_SETUP, TASK_02_CLIENTS_BACKEND
- **Затрагивает:** Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md #Модуль 1 и Модуль 2

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — дизайн-система Tailwind v4, использование React Query, шрифты, микро-анимации.
- `TZ_LawTrack_CRM.md` — раздел 2 (Дизайн и UX-концепция) и раздел 4 (Frontend: детальная структура).

---

## Затронутые файлы

### Создать новые
- `frontend/src/lib/types.ts` — TS типы для клиентов и статистики.
- `frontend/src/lib/api.ts` — fetch-клиент для бэкенда.
- `frontend/src/lib/query-client-provider.tsx` — провайдер TanStack Query.
- `frontend/src/components/stats-cards.tsx` — карточки-счетчики по статусам.
- `frontend/src/components/search-filter-bar.tsx` — поиск по имени и фильтрация.

### Изменить существующие
- `frontend/src/app/layout.tsx` — обернуть в React Query провайдер, задать шрифт Inter.
- `frontend/src/app/page.tsx` — подключить хуки, разместить Layout, счетчики и панель фильтрации.
- `frontend/src/app/globals.css` — прописать дизайн-токены (цвета, переменные) для Tailwind v4.

---

## Точная реализация (Technical Design)

### Стили и дизайн-система (`globals.css`)
Использовать палитру LegalTech:
- Основной фон: `#FAFAFA`
- Карточки/Таблица: `#FFFFFF`
- Акцент (indigo): `#4F46E5`
- Успех (зеленый): `#10B981` (emerald-500)
- В работе (amber): `#F59E0B` (amber-500)
- Новый (blue): `#3B82F6` (blue-500)

### API клиент (`api.ts` & `types.ts`)
1. Объявить типы:
   ```typescript
   export type ClientStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
   
   export interface Client {
     id: number;
     name: string;
     phone: string;
     status: ClientStatus;
     statusDisplayName: string;
     caseDescription?: string;
     deadline?: string;
     createdAt: string;
   }
   
   export interface StatusCounts {
     newCount: number;
     inProgressCount: number;
     closedCount: number;
     total: number;
   }
   ```
2. Реализовать функции fetch: `fetchClients(params?: { status?: string; search?: string })`, `fetchStatusCounts()`. URL бэкенда брать из `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'`.

### Компоненты
1. `StatsCards`: Принимает данные счетчиков. Показывает 3 карточки:
   - "Новые" (счетчик + синий акцент)
   - "В работе" (счетчик + янтарный акцент)
   - "Закрыто" (счетчик + зеленый акцент)
   - При клике на карточку активируется фильтрация таблицы по этому статусу.
2. `SearchFilterBar`: Текстовый инпут (поиск по имени/телефону) и выпадающий список (выбор статуса). Состояние передается родителю для фильтрации API запросов.

---

## Риски и подводные камни (Edge Cases)

- **CORS:** Настроить CORS на бэкенде, чтобы разрешить запросы с `http://localhost:3000`. На фронтенде правильно указать `NEXT_PUBLIC_API_URL` в `.env.local`.
- **SSR vs Hydration:** Использовать `"use client"` директиву для компонентов, взаимодействующих с хуками React Query.

---

## Порядок реализации для агента

### Frontend
- [x] 1. Создать `.env.local` в корне `frontend/` и прописать `NEXT_PUBLIC_API_URL=http://localhost:8080`.
- [x] 2. Создать `frontend/src/lib/types.ts`.
- [x] 3. Создать `frontend/src/lib/api.ts` с fetch функциями.
- [x] 4. Создать `frontend/src/lib/query-client-provider.tsx`.
- [x] 5. Настроить `globals.css` для Tailwind CSS v4 с базовыми цветами и стилями.
- [x] 6. Обновить `layout.tsx`: подключить шрифт Inter, обернуть в `QueryClientProvider`.
- [x] 7. Создать `frontend/src/components/stats-cards.tsx` с анимацией при наведении.
- [x] 8. Создать `frontend/src/components/search-filter-bar.tsx` с debounce-эффектом для поиска (200-300мс).
- [x] 9. Собрать временный макет в `page.tsx` с фейковыми или тестовыми данными React Query.
- [x] 10. Проверить сборку фронтенда: `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]` для Фазы 3 (базовая разметка и сетка).
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить бэкенд и фронтенд.
2. Открыть `http://localhost:3000`. Убедиться, что загружаются карточки-счетчики (могут быть по нулям, если бэкенд пустой) и панель поиска/фильтрации.
3. Убедиться, что в консоли браузера нет ошибок CORS при запросах к `/api/stats/status-counts` и `/api/clients`.
