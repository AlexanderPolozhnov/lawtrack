# TASK: TASK_02_CLIENTS_BACKEND (Реализация бэкенд API для клиентов и статистики)

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 2  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализованы REST API эндпоинты для управления клиентами (CRUD) и получения статистики счетчиков по статусам дел, настроена схема БД через Flyway миграции, и добавлены интеграционные/модульные тесты.

---

## Контекст

- **Зависит от:** TASK_01_INITIAL_SETUP
- **Затрагивает:** Backend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md #Модуль 1 и Модуль 2

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — правила валидации DTO, использования MapStruct, работы с БД.
- `TZ_LawTrack_CRM.md` — раздел 3 (Backend: детальная структура).
- `docs/FRONTEND_BACKEND_CONTRACT.md` — спецификации REST эндпоинтов для клиентов и статистики.

---

## Затронутые файлы

### Создать новые
- `backend/src/main/resources/db/migration/V1__init_schema.sql` — схема базы данных.
- `backend/src/main/java/com/lawtrack/entity/Client.java` — JPA Entity.
- `backend/src/main/java/com/lawtrack/entity/ClientStatus.java` — Enum статусов (`NEW`, `IN_PROGRESS`, `CLOSED`).
- `backend/src/main/java/com/lawtrack/dto/request/CreateClientRequest.java` — DTO создания клиента.
- `backend/src/main/java/com/lawtrack/dto/request/UpdateStatusRequest.java` — DTO обновления статуса.
- `backend/src/main/java/com/lawtrack/dto/response/ClientResponse.java` — DTO ответа клиента.
- `backend/src/main/java/com/lawtrack/dto/response/StatusCountResponse.java` — DTO ответа статистики.
- `backend/src/main/java/com/lawtrack/repository/ClientRepository.java` — Spring Data JPA репозиторий.
- `backend/src/main/java/com/lawtrack/service/ClientService.java` — сервис бизнес-логики.
- `backend/src/main/java/com/lawtrack/mapper/ClientMapper.java` — MapStruct маппер.
- `backend/src/main/java/com/lawtrack/exception/ClientNotFoundException.java` — исключение при отсутствии сущности.
- `backend/src/main/java/com/lawtrack/exception/GlobalExceptionHandler.java` — обработчик ошибок API.
- `backend/src/main/java/com/lawtrack/controller/ClientController.java` — REST контроллер клиентов.
- `backend/src/main/java/com/lawtrack/controller/StatsController.java` — REST контроллер статистики.
- `backend/src/test/java/com/lawtrack/controller/ClientControllerTest.java` — тесты контроллера.

---

## Точная реализация (Technical Design)

### Схема БД (Flyway `V1__init_schema.sql`)
```sql
CREATE TABLE clients (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'NEW',
    case_description TEXT,
    deadline        DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);
```

### MapStruct маппер (`ClientMapper.java`)
```java
@Mapper(componentModel = "spring")
public interface ClientMapper {
    @Mapping(target = "statusDisplayName", expression = "java(client.getStatus().getDisplayName())")
    ClientResponse toResponse(Client client);
    
    Client toEntity(CreateClientRequest request);
    
    List<ClientResponse> toResponseList(List<Client> clients);
}
```

### Валидация полей DTO
В `CreateClientRequest`:
- `@NotBlank(message = "Имя обязательно")`
- `@NotBlank(message = "Телефон обязателен")`
- `@Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Некорректный формат телефона")`

### Stats Calculation
В `ClientRepository` добавить метод группировки или использовать агрегирующие SQL-запросы для `StatusCountResponse`:
```java
@Query("SELECT new com.lawtrack.dto.response.StatusCountResponse(" +
       "SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.NEW THEN 1 ELSE 0 END), " +
       "SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.IN_PROGRESS THEN 1 ELSE 0 END), " +
       "SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.CLOSED THEN 1 ELSE 0 END), " +
       "COUNT(c)) " +
       "FROM Client c")
StatusCountResponse getStatusCounts();
```
*(Либо сделать расчет через обычные countByStatus в сервисе)*.

---

## Риски и подводные камни (Edge Cases)

- **Кодировка UTF-8:** Убедиться, что русские строки дисплей-имен статусов ("Новый", "В работе", "Закрыт") скомпилированы и отображаются правильно без искажений кодировки.
- **Маппинг MapStruct:** Настроить maven-compiler-plugin так, чтобы MapStruct процессоры отрабатывали корректно вместе с Lombok.

---

## Порядок реализации для агента

### Backend
- [ ] 1. Создать Flyway скрипт миграции `V1__init_schema.sql`.
- [ ] 2. Создать Enum `ClientStatus` и Entity `Client`.
- [ ] 3. Создать DTO классы (`CreateClientRequest`, `UpdateStatusRequest`, `ClientResponse`, `StatusCountResponse`).
- [ ] 4. Создать `ClientNotFoundException` и `GlobalExceptionHandler`.
- [ ] 5. Создать `ClientRepository` и прописать запросы.
- [ ] 6. Создать `ClientMapper` (MapStruct).
- [ ] 7. Создать `ClientService` с `@Transactional` методами для CRUD-операций и подсчета статистики.
- [ ] 8. Создать `ClientController` (эндпоинты CRUD: GET `/api/clients`, POST `/api/clients`, PATCH `/api/clients/{id}/status`, GET `/api/clients/{id}`, DELETE `/api/clients/{id}`).
- [ ] 9. Создать `StatsController` (GET `/api/stats/status-counts`).
- [ ] 10. Написать интеграционный тест `ClientControllerTest` с использованием H2 или MockMvc.
- [ ] 11. Запустить проверку компиляции и тестов: `.\mvnw.cmd clean test` (в папке `backend`).

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [ ] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [ ] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]` для Фазы 2 (частично или полностью).
5. [ ] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [ ] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить приложение: `cd backend && .\mvnw.cmd spring-boot:run`.
2. Выполнить HTTP-запросы через cURL или Postman:
   - `POST http://localhost:8080/api/clients` с телом `{"name":"Тест","phone":"+79991234567"}` -> ожидать 201 Created и JSON ответ.
   - `GET http://localhost:8080/api/clients` -> проверить список клиентов.
   - `GET http://localhost:8080/api/stats/status-counts` -> проверить распределение счетчиков.
