# LawTrack — AI Context & CRM для юриста

<div align="center">

**Мини-CRM для юриста: управление списком клиентов, статусами дел, реактивные счетчики, хронология событий и Telegram-уведомления.**

[![Production](https://img.shields.io/badge/Production-Render%20%2B%20Vercel-brightgreen?style=for-the-badge&logo=render)](https://lawtrack-frontend.vercel.app)
[![Java](https://img.shields.io/badge/Java-21-red?style=for-the-badge&logo=openjdk)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4-green?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--v4-blue?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-orange?style=for-the-badge&logo=playwright)](https://playwright.dev/)

> **Статус:** Разработка завершена · Проект готов к демонстрации · Portfolio project

</div>

⚠️ **Лицензия:** Данный исходный код открыт исключительно для демонстрации архитектурных решений, подходов к разработке и портфолио. Коммерческое использование и копирование запрещены. Подробности в файле [LICENSE](LICENSE).

---

## 🌟 Ключевые особенности проекта

* 📋 **Интерактивный дашборд клиентов**: Быстрый просмотр всей базы клиентов юриста в виде таблицы с inline-сменой статуса («Новый» → «В работе» → «Закрыт»). Поддержка мгновенного обновления статистики в счетчиках (Optimistic Updates через **React Query**).
* 🤖 **Telegram-уведомления**: Асинхронная отправка структурированных уведомлений через Telegram Bot API при добавлении новых клиентов или изменении их статусов (с защитой от сбоев доставки во избежание блокировки основного бизнес-процесса).
* 📝 **Детальная карточка дела (Timeline)**: Выдвижная боковая панель (Drawer/Sheet) с полной хронологией событий (создание клиента, автологирование смены статусов и ручное добавление текстовых заметок юристом).
* ⚠️ **Контроль дедлайнов**: Визуальное выделение просроченных дедлайнов красным цветом с анимированными иконками предупреждения `AlertCircle` для незакрытых дел.
* 🔒 **Enterprise-Grade Безопасность**:
  - **IP Rate Limiting**: Защита от DoS и парсинга (ограничение до 120 запросов в минуту на IP).
  - **Html Sanitizer**: Защита от Stored XSS путем фильтрации ФИО, описания дела и заметок на бэкенде перед сохранением в БД.
  - **Admin token auth**: Опциональная защита API по заголовку `X-Admin-Token` с constant-time сравнением секретов для предотвращения timing-атак.
  - **Безопасная обработка исключений**: Исключение утечки структуры БД или стектрейсов наружу (все сырые ошибки перехватываются `GlobalExceptionHandler` и отдаются клиенту в виде нейтральных сообщений).
  - **Минимизация Actuator**: Ограничение эндпоинтов мониторинга Spring Actuator (открыт только `/health`).
* ⚡ **Современный LegalTech UI**: Темная и светлая темы с плавным переключателем, адаптивный дизайн (индиго/slate/emerald палитра) без использования дефолтных шрифтов (подключен премиальный шрифт Inter).
* 🧪 **100% Покрытие автотестами**:
  - **Backend**: JUnit 5 модульные тесты для бизнес-логики сервисов и валидации (MockMvc + Mockito).
  - **Frontend**: Playwright E2E-тесты для полной эмуляции действий пользователя в браузере (добавление клиента, смена статуса, фильтрация, проверка темы и дедлайнов) в изолированной среде.

---

## 🔧 Стек технологий

### Бэкенд
`Java 21` · `Spring Boot 4` · `Spring Data JPA` · `PostgreSQL` · `H2 (in-memory)` · `Flyway` · `MapStruct` · `Jakarta Validation` · `OpenAPI / Swagger` · `JUnit 5` · `Mockito`

### Фронтенд
`React 19` · `TypeScript` · `Next.js 16` · `Tailwind CSS v4` · `TanStack Query v5` · `React Hook Form` · `Zod` · `lucide-react` · `date-fns`

### Инфраструктура
`Docker` · `Docker Compose` · `PostgreSQL 16` · `Vercel` · `Render.com` · `Neon.tech`

---

## 🗂️ Структура репозитория

```text
lawtrack/
├── backend/          Spring Boot 4 Java backend
├── frontend/         Next.js 16 + React 19 frontend
├── docs/             Техническая документация
│   ├── tasks/        Планы выполненных задач
│   └── FRONTEND_BACKEND_CONTRACT.md   API-контракт (Source of Truth)
├── guides/           Инструкции по развертыванию
├── docker-compose.yml
├── verify-all.ps1    Скрипт сквозной локальной валидации
├── README.md
└── LICENSE
```

---

## 🖥️ Локальный запуск

### 1. Поднятие базы данных (Docker)
```bash
docker compose up -d
```
*Поднимет PostgreSQL на порту 5432 с пользователем `lawtrack_user`.*

### 2. Запуск Бэкенда
```bash
cd backend
./mvnw.cmd spring-boot:run
```
*Бэкенд запустится на `http://localhost:8080`. Документация API (Swagger UI): `http://localhost:8080/swagger-ui.html`*

### 3. Запуск Фронтенда
```bash
cd frontend
pnpm install
pnpm run dev
```
*Фронтенд запустится на `http://localhost:3000`.*

---

## 🧪 Запуск автоматических тестов

```bash
# Запуск Unit-тестов бэкенда
cd backend && ./mvnw test

# Запуск E2E-тестов Playwright
cd frontend && pnpm run test:e2e
```

Или запустите единый скрипт локальной валидации всего проекта:
```bash
./verify-all.ps1
```
