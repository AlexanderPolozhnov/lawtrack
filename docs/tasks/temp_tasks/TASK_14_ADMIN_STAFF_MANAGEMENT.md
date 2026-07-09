# TASK: Управление персоналом (Staff Management)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 3  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Реализовать REST-эндпоинты для CRUD операций над сотрудниками на бэкенде (с безопасным хэшированием паролей через BCrypt) и панель управления сотрудниками на фронтенде админ-панели.

---

## Контекст

- **Зависит от:** TASK_02 (Auth API), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/staff`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (безопасность, хэширование паролей).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 3, «Управление персоналом и сменами».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/staff/dto/CreateStaffRequest.java` — DTO для создания сотрудника.
- `backend/src/main/java/com/qtab/api/staff/dto/UpdateStaffRequest.java` — DTO для обновления информации о сотруднике.
- `backend/src/main/java/com/qtab/api/staff/dto/StaffResponse.java` — DTO для ответа с данными сотрудника.
- `backend/src/main/java/com/qtab/api/staff/AdminStaffController.java` — REST-контроллер для CRUD сотрудников ресторана.

**Frontend:**
- `frontend/src/app/(admin)/staff/page.tsx` — Страница со списком персонала: таблица сотрудников, фильтрация по ролям, переключатель статуса активности, кнопка добавления.
- `frontend/src/components/admin/StaffModal.tsx` — Модалка создания/редактирования сотрудника.

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/staff/StaffRepository.java` — Добавить метод `findAllByRestaurantId(UUID restaurantId)`.
- `backend/src/main/java/com/qtab/api/staff/StaffService.java` — Реализовать бизнес-логику CRUD, хэширования паролей при изменении и мягкого удаления (деактивации).

---

## Точная реализация (Technical Design)

### 1. Backend DTO & API

Сотрудников нельзя удалять физически из БД, так как их `staffId` привязан к истории оплат (`PaymentEntity.confirmedBy`). Мы используем мягкое удаление (toggle `isActive` в `false`).

#### CreateStaffRequest.java
```java
public record CreateStaffRequest(
    @NotBlank String name,
    @NotBlank String login,
    @NotBlank String password,
    @NotBlank String role // WAITER, KITCHEN, MANAGER, ADMIN
) {}
```

#### UpdateStaffRequest.java
```java
public record UpdateStaffRequest(
    @NotBlank String name,
    @NotBlank String login,
    String password, // опционально для смены пароля
    @NotBlank String role,
    @NotNull Boolean isActive
) {}
```

#### StaffResponse.java
```java
public record StaffResponse(
    UUID id,
    UUID restaurantId,
    String name,
    String login,
    String role,
    boolean isActive
) {}
```

#### AdminStaffController.java
```java
@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
public class AdminStaffController {
    private final StaffService staffService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getStaff(@RequestParam UUID restaurantId) {
        List<StaffResponse> staffList = staffService.getStaffByRestaurant(restaurantId);
        return ResponseEntity.ok(ApiResponse.success(staffList));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(
            @RequestParam UUID restaurantId, @Valid @RequestBody CreateStaffRequest req) {
        StaffResponse created = staffService.createStaff(restaurantId, req);
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    @PutMapping("/{staffId}")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
            @PathVariable UUID staffId, @RequestParam UUID restaurantId, @Valid @RequestBody UpdateStaffRequest req) {
        StaffResponse updated = staffService.updateStaff(restaurantId, staffId, req);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{staffId}")
    public ResponseEntity<ApiResponse<Void>> deactivateStaff(
            @PathVariable UUID staffId, @RequestParam UUID restaurantId) {
        staffService.deactivateStaff(restaurantId, staffId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

### 2. StaffService.java бизнес-логика
- При создании и обновлении проверять уникальность `login`. Если логин уже занят — бросать `IllegalArgumentException` с понятным текстом (например, "Логин уже занят").
- Пароль при сохранении хэшировать с помощью `BCryptPasswordEncoder` (внедрить бин `PasswordEncoder`).
- При обновлении, если поле `password` не пустое, хэшировать и записывать новый пароль, иначе оставлять старый.

### 3. Frontend Staff View
- Таблица с колонками: Имя, Логин, Роль, Статус (Активен / Деактивирован).
- Фильтр по роли (Все / Официант / Кухня / Менеджер / Админ).
- Кнопка «Добавить сотрудника» открывает `StaffModal`.
- Кнопка «Редактировать» открывает ту же модалку с предзаполненными полями (пароль пустой по умолчанию).
- Тумблер или кнопка «Деактивировать» / «Активировать» для быстрой смены статуса `isActive`.

---

## Риски и подводные камни (Edge Cases)

- **Физическое удаление:** Запретить метод физического DELETE для сотрудников, чтобы избежать ошибок внешнего ключа в таблице `payments` и `orders`. Только мягкая деактивация (`isActive = false`).
- **Смена пароля:** При редактировании сотрудника не требовать обязательного ввода пароля. Если поле пустое — сохранять текущий хэш.
- **Уникальность логина:** Сделать проверку `findByLogin` на бэкенде перед добавлением в БД. Если логин совпадает у другого сотрудника (даже деактивированного), выводить ошибку на форму.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать DTO классы для сотрудников.
- [x] 2. Добавить метод `findAllByRestaurantId` в `StaffRepository.java`.
- [x] 3. Написать CRUD методы в `StaffService.java` с хэшированием пароля.
- [x] 4. Создать `AdminStaffController.java` с проверкой ролей ADMIN/MANAGER в SecurityConfig.
- [x] 5. Написать Unit-тест для `AdminStaffController`.
- [x] 6. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 7. Создать `StaffModal.tsx` с селектом ролей (ADMIN, MANAGER, WAITER, KITCHEN).
- [x] 8. Создать страницу `staff/page.tsx` с таблицей персонала и интеграцией с бэкенд API.
- [x] 9. Протестировать создание нового сотрудника, проверку валидации логина и вход под новой учетной записью.
- [x] 10. Выполнить `cd frontend && pnpm run build`.

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

1. Войти в админку и перейти в меню «Персонал».
2. Создать сотрудника: Имя: «Иван Официант», Логин: `ivan_waiter`, Роль: `WAITER`, Пароль: `password123`.
3. Убедиться, что он появился в таблице со статусом «Активен».
4. Выйти из админки (Logout).
5. Зайти на страницу авторизации `/auth/login` и попробовать войти под `ivan_waiter` / `password123`. Вход должен пройти успешно и перенаправить на `/dashboard`.
6. Снова войти под администратором, зайти в «Персонал» и деактивировать сотрудника «Иван Официант».
7. Попробовать войти под `ivan_waiter` / `password123` — система должна отказать во входе с ошибкой «Учетная запись деактивирована».
