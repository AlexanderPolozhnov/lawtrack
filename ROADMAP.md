# ROADMAP — LawTrack CRM

Дорожная карта разработки MVP мини-CRM для юриста на стеке Spring Boot 4 + Next.js 16 + Tailwind CSS v4.

---

## Легенда

- ✅ **DONE** — Фича полностью работает
- 🏗 **IN PROGRESS** — В активной разработке
- 🗓 **PLANNED** — Запланировано

---

## Фазы разработки

### ✅ Фаза 1 — Окружение и инфраструктура (Skeleton)
*Статус: Выполнено.*
- [x] Инициализация Maven-проекта бэкенда на Spring Boot 4, Java 21.
- [x] Инициализация Next.js 16 фронтенда с React 19, TypeScript и Tailwind CSS v4.
- [x] Настройка Docker Compose для PostgreSQL 16 локально.
- [x] Настройка конфигурации CORS, H2 (для легкого запуска) и Telegram Bot API.

### ✅ Фаза 2 — Backend API (Клиенты и Статистика)
*Статус: Выполнено.*
- [x] Схема базы данных Flyway: таблица `clients` и индексы.
- [x] JPA Entity `Client` и Enum `ClientStatus` (`NEW`, `IN_PROGRESS`, `CLOSED`).
- [x] Валидация Jakarta Bean Validation в DTO запросов.
- [x] REST API CRUD для клиентов (ClientController): список, создание, смена статуса, получение одного, удаление.
- [x] REST API счетчиков (StatsController): группировка по статусам.
- [x] Telegram Notification Service: асинхронные уведомления при добавлении клиентов и смене статусов.

### 🏗  Фаза 3 — Frontend Дашборд (Интерфейс)
*Статус: В активной разработке.*
- [x] Базовая сетка приложения (Layout, Header с логотипом "LawTrack" и кнопкой добавления).
- [x] API-клиент (`lib/api.ts`, `lib/types.ts`) и React Query провайдер.
- [x] Компонент `StatsCards`: 3 карточки счетчиков по статусам с реактивным обновлением.
- [x] Компонент `SearchFilterBar`: текстовый поиск и фильтр по статусу (влияет на счетчики по клику).
- [ ] Компонент `ClientTable` + `ClientRow` с инлайн dropdown смены статуса (optimistic update через React Query).
- [ ] Компонент `AddClientDialog`: модальное окно добавления клиента на `react-hook-form` + `zod` с валидацией.

### 🗓 Фаза 4 — Бонусные фичи (P2 Nice-to-have)
*Статус: Запланировано.*
- [ ] Карточка клиента (`ClientDetailsDrawer`): side panel с заметками и таймлайном событий по делу (из БД `client_events`).
- [ ] Индикация дедлайнов (красный индикатор, если дедлайн прошел, а дело не закрыто).
- [ ] Тёмная тема с переключателем в Header.
- [ ] Donut Chart (Recharts) для визуализации распределения статусов клиентов.

### 🗓 Фаза 5 — Документация и Деплой
*Статус: Запланировано.*
- [ ] Детальный README.md (запуск, стек, ссылки на деплой, лог работы).
- [ ] Деплой Backend (Render.com Docker Web Service + Postgres).
- [ ] Деплой Frontend (Vercel).
- [ ] Финальная проверка работоспособности сценариев и валидация через `.\verify-all.ps1`.
