# TASK: TASK_07_DEPLOY_DOCS (Настройка деплоя, написание README и финальная валидация)

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 5  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Сконфигурирован Dockerfile бэкенда для облачного деплоя, подготовлен подробный README.md проекта, описаны шаги для деплоя на Render/Vercel, и выполнена финальная верификация кодовой базы скриптом `verify-all.ps1`.

---

## Контекст

- **Зависит от:** TASK_06_BONUS_FEATURES
- **Затрагивает:** Infrastructure, Documentation, Verification
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md

## Документация для обязательного ознакомления перед началом:
- `TZ_LawTrack_CRM.md` — разделы 1, 6 и 7.
- `ROADMAP.md` — Фаза 5.

---

## Затронутые файлы

### Создать новые
- `backend/Dockerfile` — докерфайл для запуска Spring Boot.
- `README.md` — основная документация проекта (описание, запуск, стек, деплой).

### Изменить существующие
- `ROADMAP.md` — отметить выполненные задачи.
- `docs/CONTEXT_BACKUP.md` — внести финальный отчет.

---

## Точная реализация (Technical Design)

### Dockerfile бэкенда (`backend/Dockerfile`)
```dockerfile
# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### README.md Структура
1. Описание: LawTrack — мини-CRM для юриста (MVP).
2. Стек: Java 21, Spring Boot 4, PostgreSQL, Next.js 16, React 19, Tailwind CSS v4, TanStack Query, Telegram Bot API. Описание "Почему именно такой стек".
3. Быстрый запуск локально:
   - `docker compose up -d`
   - Запуск бэкенда (`.\mvnw.cmd spring-boot:run`)
   - Запуск фронтенда (`pnpm install && pnpm run dev`)
4. Ссылки на Демо:
   - Frontend (Vercel): `https://lawtrack.vercel.app` (заглушка/пример)
   - Backend Swagger (Render): `https://lawtrack-backend.onrender.com/swagger-ui.html`
5. Telegram Бот: Как настроить бота (переменные окружения).
6. Лог работы AI:
   - Время старта и окончания.
   - Что сделано AI-агентом, что разработчиком-человеком.

---

## Риски и подводные камни (Edge Cases)

- **Размер Docker-образа:** Использовать alpine-образы eclipse-temurin для уменьшения веса контейнера на Render.com (лимит бесплатного тарифа по памяти — 512MB).
- **Слип-мод Render:** Описать в README, что бесплатный хостинг Render "засыпает" при отсутствии активности, поэтому первый запрос к Swagger или API может занять 30-50 секунд.

---

## Порядок реализации для агента

- [ ] 1. Создать `backend/Dockerfile`. Проверить сборку докер-образа локально: `docker build -t lawtrack-backend ./backend`.
- [ ] 2. Создать файл `README.md` в корне репозитория, заполнив его по структуре из ТЗ (раздел 7).
- [ ] 3. Написать пошаговую инструкцию по деплою бэкенда на Render и фронтенда на Vercel.
- [ ] 4. Запустить финальную локальную проверку: `.\verify-all.ps1` из корня проекта. Все проверки (бэкенд тесты и фронтенд сборка) должны пройти успешно.
- [ ] 5. Обновить `ROADMAP.md` (выставить все галочки [x] по фазам 1-5).
- [ ] 6. Обновить `docs/CONTEXT_BACKUP.md`, подведя итог всей разработки.
- [ ] 7. Запустить ротацию логов: `.\rotate-backup.ps1`.
- [ ] 8. Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Проверить, что `.\verify-all.ps1` завершается со статусом `exit 0` и выводит "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ. Готово к пушу!".
2. Проверить, что README.md отображается красиво на GitHub и содержит все обязательные разделы и ссылки.
