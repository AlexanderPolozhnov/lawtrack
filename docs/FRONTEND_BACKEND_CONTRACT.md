# LawTrack — Frontend / Backend API Contract

> **Версия:** 1.0  
> **Обновлено:** 2026-07-09  
> **Статус:** Актуальный (Source of Truth)  
> **Проект:** LawTrack CRM (мини-CRM для юриста)

Этот документ фиксирует строгий технический контракт между клиентской частью (Next.js 16) и бэкендом (Spring Boot 4) для проекта LawTrack. Все endpoint'ы, DTO и события задокументированы на основе технического задания.

---

## 🛠️ Общие соглашения (Conventions)

- **Base URL:** `/api`
- **Формат данных:** JSON (Request/Response)
- **Кодировка:** UTF-8
- **Формат дат:** ISO-8601 UTC string (например: `2026-07-09T14:00:00Z`) или `LocalDate` в формате `YYYY-MM-DD` для дедлайнов.
- **ID формат:** `Long` (автоинкрементный ID в БД) для простоты MVP.

---

## 🛑 Стандартные структуры ответов

### Формат Ошибки — HTTP 4xx/5xx
```json
{
  "message": "Некорректный формат телефона"
}
```
Или словарь ошибок валидации полей (HTTP 400 Bad Request):
```json
{
  "name": "Имя обязательно",
  "phone": "Некорректный формат телефона"
}
```

### Формат Успеха — HTTP 200 OK / 201 Created
Возвращается непосредственно DTO или список DTO (без глобальной обёртки `ApiResponse`, чтобы соответствовать стандартному REST-стилю из ТЗ).

---

## 📦 Модуль 1: Клиенты (Clients CRUD)

### `GET /api/clients`
*Получение списка клиентов с опциональным поиском и фильтрацией по статусу.*

**Query Parameters:**
- `status` (опционально): `NEW`, `IN_PROGRESS`, `CLOSED`
- `search` (опционально): Поиск по имени или телефону

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Иван Иванов",
    "phone": "+79991112233",
    "status": "NEW",
    "statusDisplayName": "Новый",
    "caseDescription": "Развод и раздел имущества",
    "deadline": "2026-08-15",
    "createdAt": "2026-07-09T14:15:00"
  }
]
```

### `POST /api/clients`
*Добавление нового клиента.*

**Request Body (`CreateClientRequest`):**
```json
{
  "name": "Иван Иванов",
  "phone": "+79991112233",
  "caseDescription": "Развод и раздел имущества",
  "deadline": "2026-08-15"
}
```
*Валидация:*
- `name`: `@NotBlank(message = "Имя обязательно")`
- `phone`: `@NotBlank(message = "Телефон обязателен")`, `@Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Некорректный формат телефона")`

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Иван Иванов",
  "phone": "+79991112233",
  "status": "NEW",
  "statusDisplayName": "Новый",
  "caseDescription": "Развод и раздел имущества",
  "deadline": "2026-08-15",
  "createdAt": "2026-07-09T14:15:00"
}
```

### `PATCH /api/clients/{id}/status`
*Изменение статуса клиента (inline в таблице).*

**Request Body (`UpdateStatusRequest`):**
```json
{
  "status": "IN_PROGRESS"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Иван Иванов",
  "phone": "+79991112233",
  "status": "IN_PROGRESS",
  "statusDisplayName": "В работе",
  "caseDescription": "Развод и раздел имущества",
  "deadline": "2026-08-15",
  "createdAt": "2026-07-09T14:15:00"
}
```

### `GET /api/clients/{id}`
*Получение детальной информации о клиенте (для карточки-drawer).*

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Иван Иванов",
  "phone": "+79991112233",
  "status": "IN_PROGRESS",
  "statusDisplayName": "В работе",
  "caseDescription": "Развод и раздел имущества",
  "deadline": "2026-08-15",
  "createdAt": "2026-07-09T14:15:00"
}
```

### `DELETE /api/clients/{id}`
*Удаление клиента из CRM.*

**Response (204 No Content):** (Пустое тело)

---

## 📦 Модуль 2: Статистика (Stats)

### `GET /api/stats/status-counts`
*Получение количества клиентов в разрезе каждого статуса для карточек-счётчиков.*

**Response (200 OK):**
```json
{
  "newCount": 5,
  "inProgressCount": 12,
  "closedCount": 8,
  "total": 25
}
```

---

## 📦 Модуль 3: Таймлайн событий (Nice-to-have, опционально)

### `GET /api/clients/{id}/events`
*Получение хронологии действий по клиенту.*

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "clientId": 1,
    "eventType": "CREATED",
    "description": "Клиент добавлен в систему",
    "createdAt": "2026-07-09T14:15:00"
  },
  {
    "id": 2,
    "clientId": 1,
    "eventType": "STATUS_CHANGED",
    "description": "Статус изменен с Новый на В работе",
    "createdAt": "2026-07-09T14:30:00"
  }
]
```
