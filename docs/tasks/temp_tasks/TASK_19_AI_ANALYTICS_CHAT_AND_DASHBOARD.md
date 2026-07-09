# TASK: ИИ-чат-ассистент владельца ресторана (AI Analytics Chat)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 4  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать интеллектуального ИИ-ассистента для владельца ресторана в панели управления: бэкенд-эндпоинт для обработки вопросов пользователя с автоматическим сбором финансового контекста и отзывов за последние 30 дней и передачей их в Gemini API, а также интерактивный чат-интерфейс в Admin Panel.

---

## Контекст

- **Зависит от:** TASK_12 (Admin Layout), TASK_16 (Financial Reports), TASK_18 (AI Sentiment)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `POST /admin/analytics/ai-query`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 4, «AI-ассистент владельца (чат-бот в Admin Panel с ответами на естественном языке)».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/analytics/dto/AiQueryRequest.java` — DTO для запроса к ИИ-ассистенту (текстовое сообщение).
- `backend/src/main/java/com/qtab/api/analytics/dto/AiQueryResponse.java` — DTO для ответа ИИ-ассистента (текст в формате Markdown).

**Frontend:**
- `frontend/src/app/(admin)/analytics/ai-assistant/page.tsx` — Страница чат-ассистента: красивое окно сообщений, индикатор набора текста ИИ, список предустановленных вопросов (быстрые кнопки).

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/analytics/AdminFinanceController.java` — Добавить защищенный эндпоинт `POST /api/v1/admin/analytics/ai-query`.
- `backend/src/main/java/com/qtab/api/analytics/FinanceService.java` — Реализовать метод `processAiQuery(UUID restaurantId, String userQuery)`:
  - Собрать выручку, количество заказов, средний чек за 30 дней.
  - Собрать список топ-5 популярных блюд.
  - Собрать последние 5 негативных отзывов гостей (оценка < 3).
  - Сформировать текстовый системный контекст для Gemini.
  - Вызвать `GeminiClient` и вернуть ответ.

**Frontend:**
- `frontend/src/components/admin/AdminSidebar.tsx` — Добавить ссылку на страницу «ИИ Ассистент» (`/analytics/ai-assistant`).

---

## Точная реализация (Technical Design)

### 1. Сбор контекста и системный промпт (FinanceService.java)

Метод `processAiQuery(UUID restaurantId, String userQuery)` делает следующее:
- Собирает агрегаты за 30 дней (выручка, средний чек, количество оплат).
- Запрашивает топ-5 популярных блюд.
- Запрашивает последние отзывы.
- Строит системный контекст:
```text
SYSTEM INSTRUCTION:
You are an expert restaurant consultant and AI business analyst for QTab.
Analyze the provided restaurant performance metrics for the last 30 days and answer the owner's question.
Provide actionable, concise business recommendations in Russian language. Use Markdown formatting (bold, lists, tables).
Never invent metrics that are not in the context. If data is empty, mention that there are no sales records yet.

RESTAURANT METRICS (LAST 30 DAYS):
- Total Revenue: [выручка] BYN
- Total Paid Orders: [кол-во заказов]
- Average Bill: [средний чек] BYN
- Top 5 Selling Items: [список блюд с кол-вом продаж]
- Recent Critical Customer Reviews: [список плохих комментариев из отзывов]
```
- Отправляет в `GeminiClient.generateContent(systemInstruction, userQuery)`.
- Возвращает полученный текст.

### 2. Чат-интерфейс фронтенда (ai-assistant/page.tsx)
- Чат с прокруткой до низа при новых сообщениях (использовать `useRef` + `scrollIntoView`).
- Стили сообщений:
  - Сообщение пользователя (выравнивание по правому краю, золотой фон, черный текст).
  - Сообщение ИИ (выравнивание по левому краю, темный фон карточки, белый текст, рендеринг Markdown).
- Эффект печати (typing indicator) — пульсирующие точки во время ожидания ответа API.
- Быстрые шаблоны вопросов (кнопки-чипсы сверху чата):
  - *«Какой наш средний чек?»*
  - *«Дай советы по увеличению продаж»*
  - *«Что гости пишут о кухне?»*
  - *«Какое блюдо самое популярное?»*
При клике на чипс — отправлять текст в инпут и автоматически отправлять сообщение.

---

## Риски и подводные камни (Edge Cases)

- **Markdown Injection:** Убедиться, что фронтенд безопасно рендерит Markdown без HTML инъекций. Использовать простую регулярку для очистки/рендеринга тегов или стандартную безопасную библиотеку (типа `react-markdown` или кастомный простой парсер списков и жирного текста).
- **Размер контекста:** Не передавать все заказы за 30 дней, чтобы не превысить лимиты токенов контекста Gemini API. Передавать только агрегированные показатели (суммы) и короткие списки (топ-5).

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать DTO классы `AiQueryRequest` и `AiQueryResponse`.
- [x] 2. Добавить логику сбора аналитического контекста и метод `processAiQuery` в `FinanceService.java`.
- [x] 3. Добавить эндпоинт `POST /api/v1/admin/analytics/ai-query` в `AdminFinanceController.java`.
- [x] 4. Выполнить `.\mvnw.cmd clean compile -q -DskipTests` (проверить отсутствие ошибок компиляции).

### Frontend
- [x] 5. Создать страницу чата `ai-assistant/page.tsx` с окном диалога, быстрым выбором вопросов и скроллом.
- [x] 6. Добавить безопасный рендеринг Markdown разметки для ответов ИИ.
- [x] 7. Интегрировать чат с Sidebar в `AdminSidebar.tsx`.
- [x] 8. Проверить E2E флоу: задать вопрос ИИ в админке -> получить развернутый бизнес-совет на основе реальных данных БД ресторана.
- [x] 9. Выполнить `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md`.
5. [x] Перемести файл этой задачи в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Убедиться, что бэкенд запущен с валидным `GEMINI_API_KEY` (или проверить заглушку).
2. Зайти под администратором в админку, открыть в боковом меню раздел **«ИИ Ассистент»**.
3. Кликнуть на быстрый вопрос **«Дай советы по увеличению продаж»**.
4. Убедиться, что в окне чата появилось сообщение от пользователя, отобразился индикатор загрузки ИИ.
5. ИИ должен вернуть осмысленный текстовый ответ на русском языке с форматированием (списки, жирный шрифт), содержащий рекомендации по улучшению работы (например, упомянуть блюда из топа продаж или отзывы).
6. Ввести свой вопрос в инпут, нажать отправить и дождаться ответа.
