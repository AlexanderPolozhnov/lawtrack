# TASK_08: Покрытие API контроллеров WebMvc-тестами

## Краткое описание задачи
Необходимо написать Unit/Integration тесты с использованием `MockMvc` для всех REST-контроллеров бэкенда (кроме `AuthController`, который уже покрыт). Это гарантирует стабильность API-контрактов, правильность сериализации JSON, валидацию входных данных и корректное применение правил безопасности Spring Security.

- **Стек:** JUnit 5, Mockito, Spring Boot Test (`MockMvc`), WebMvcTest.
- **Целевые контроллеры для тестирования:**
  1. `GuestSessionController` (анонимный доступ)
  2. `MenuController` (анонимный доступ)
  3. `OrderController` (смешанный доступ: создание заказа гостем — анонимный, смене статуса — авторизованный сотрудник)
  4. `TableController` (авторизованный персонал)

---

## Документация для обязательного ознакомления перед началом:
- [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md) — DTO форматы и эндпоинты.
- [backend/src/test/java/com/qtab/api/auth/AuthControllerTest.java](file:///c:/.development/Projects/qtab/backend/src/test/java/com/qtab/api/auth/AuthControllerTest.java) — пример настройки `MockMvc` и Mock-зависимостей.

> [!NOTE]
> **Сверка с эталонным проектом:** Для организации MockMvc тестов и настройки контекста безопасности со Spring Security 6 изучите тесты контроллеров в `C:\.development\Projects\polozhnov-dev\backend\src\test\java\com\alexanderpolozhnov\alexdev_app\`. Обратите внимание на использование `@WebMvcTest`, `@MockitoBean` и импорт `SecurityConfig.class` в тестовый контекст.

---

## Затронутые файлы

### Создать новые
- `backend/src/test/java/com/qtab/api/auth/GuestSessionControllerTest.java` — тесты инициализации и получения сессии гостя.
- `backend/src/test/java/com/qtab/api/menu/MenuControllerTest.java` — тесты загрузки меню ресторана.
- `backend/src/test/java/com/qtab/api/order/OrderControllerTest.java` — тесты создания заказа, вызова официанта, запроса счета и изменения статусов.
- `backend/src/test/java/com/qtab/api/table/TableControllerTest.java` — тесты управления столами и сброса вызова.

---

## Точная реализация (Technical Design)

### 1. Подход к тестированию
Использовать `@WebMvcTest` для изоляции уровня представления. Это исключает запуск СУБД/Redis и гарантирует высокую скорость тестов.
Пример настройки класса:
```java
@WebMvcTest(controllers = {GuestSessionController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class}) // Импорт конфигурации безопасности
public class GuestSessionControllerTest {
    @Autowired
    private MockMvc mockMvc;
    
    @MockitoBean
    private GuestSessionService guestSessionService;
    
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
}
```

### 2. Сценарии тестирования

#### А. `GuestSessionControllerTest`
- **Тест 1 (Инициализация):** `POST /api/v1/guest/session/init` с корректным JSON -> возвращает `200 OK`, JSON совпадает с `ApiResponse<SessionResponse>`.
- **Тест 2 (Валидация):** `POST /api/v1/guest/session/init` с пустым `restaurantSlug` или `tableId` -> возвращает `400 Bad Request`.
- **Тест 3 (Получение):** `GET /api/v1/guest/session/{sessionId}` -> возвращает `200 OK` и данные сессии.
- **Тест 4 (Ошибка):** `GET /api/v1/guest/session/{nonExistentId}` -> имитирует `ResourceNotFoundException` и возвращает `404 Not Found` в формате `GlobalExceptionHandler`.

#### Б. `MenuControllerTest`
- **Тест 1 (Загрузка):** `GET /api/v1/menu/{restaurantId}` -> возвращает `200 OK` со структурой меню ресторана.

#### В. `OrderControllerTest`
- **Тест 1 (Создание заказа):** `POST /api/v1/order` -> возвращает `200 OK` с идентификатором созданного заказа.
- **Тест 2 (Валидация заказа):** `POST /api/v1/order` с пустым списком позиций -> возвращает `400 Bad Request`.
- **Тест 3 (Вызов официанта):** `POST /api/v1/order/{orderId}/call-waiter` -> возвращает `200 OK`.
- **Тест 4 (Запрос счета):** `POST /api/v1/order/{orderId}/request-bill` -> возвращает `200 OK`.
- **Тест 5 (Обновление статуса - Без токена):** `PATCH /api/v1/staff/orders/{orderId}/status` без JWT -> возвращает `401 Unauthorized` или `403 Forbidden`.
- **Тест 6 (Обновление статуса - С токеном):** `PATCH /api/v1/staff/orders/{orderId}/status` с валидным JWT персонала -> возвращает `200 OK`.

#### Г. `TableControllerTest`
- **Тест 1 (Подтверждение вызова - Без токена):** `POST /api/v1/staff/tables/{tableId}/acknowledge-call` без JWT -> возвращает `401 Unauthorized` или `403 Forbidden`.
- **Тест 2 (Подтверждение вызова - С токеном):** `POST /api/v1/staff/tables/{tableId}/acknowledge-call` с валидным JWT персонала -> возвращает `200 OK`.

---

## Порядок реализации для агента

### Реализация тестов
- [x] 1. Создать класс `GuestSessionControllerTest` и реализовать 4 сценария.
- [x] 2. Создать класс `MenuControllerTest` и реализовать тест загрузки меню.
- [x] 3. Создать класс `OrderControllerTest` и реализовать тесты создания заказа, вызовов персонала и безопасности обновления статусов.
- [x] 4. Создать класс `TableControllerTest` и протестировать подтверждение вызова официанта с проверкой авторизации.
- [x] 5. Запустить выполнение тестов: `.\mvnw.cmd test` и убедиться, что все 20 + новые тесты успешно проходят.

---

## ⚠️ Обязательный финальный чек-лист
ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручной проверки.
