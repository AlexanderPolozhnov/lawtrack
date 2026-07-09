# TASK: JWT-Аутентификация и REST API авторизации для персонала

**Дата создания:** 2026-07-06  
**Приоритет:** High  
**Фаза:** Phase 0  
**Автор плана:** Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)  

---

## Цель

Реализовать систему JWT-аутентификации с ролевой моделью (RBAC) для персонала (Waiter, Kitchen, Manager, Admin) и эндпоинт `POST /api/v1/auth/login`.

---

## Контекст

- **Зависит от:** [TASK_01_INFRA_AND_DB](file:///c:/.development/Projects/qtab/docs/tasks/new_tasks/TASK_01_INFRA_AND_DB.md)
- **Затрагивает:** Backend
- **Связанный контракт:** [docs/FRONTEND_BACKEND_CONTRACT.md](file:///c:/.development/Projects/qtab/docs/FRONTEND_BACKEND_CONTRACT.md)

## Документация для обязательного ознакомления перед началом:
- [GEMINI.md](file:///c:/.development/Projects/qtab/GEMINI.md) — Безопасность и Валидация.
- [ideas/QR_MENU_SYSTEM_FULL_SPEC.md](file:///c:/.development/Projects/qtab/ideas/QR_MENU_SYSTEM_FULL_SPEC.md) — Разделы 6, 7 и 12.

> [!NOTE]
> **Сверка с эталонным проектом:** Вы можете подсматривать структуру настройки Spring Security и CORS в проекте `C:\.development\Projects\polozhnov-dev\`:
> - Настройка CORS: `C:\.development\Projects\polozhnov-dev\backend\src\main\java\com\alexanderpolozhnov\alexdev_app\common\config\CorsConfig.java`
> - Защита путей и заголовки CSP: `C:\.development\Projects\polozhnov-dev\backend\src\main\java\com\alexanderpolozhnov\alexdev_app\common\security\SecurityConfig.java`

---

## Затронутые файлы

### Создать новые
- `backend/src/main/java/com/qtab/api/staff/Staff.java` — JPA Entity для сотрудника.
- `backend/src/main/java/com/qtab/api/staff/StaffRepository.java` — Репозиторий сотрудников.
- `backend/src/main/java/com/qtab/api/auth/dto/LoginRequest.java` — DTO для запроса входа.
- `backend/src/main/java/com/qtab/api/auth/dto/LoginResponse.java` — DTO для ответа с токеном.
- `backend/src/main/java/com/qtab/api/auth/AuthController.java` — Контроллер логина персонала.
- `backend/src/main/java/com/qtab/api/auth/JwtTokenProvider.java` — Генерация, парсинг и валидация JWT токенов.
- `backend/src/main/java/com/qtab/api/auth/JwtAuthenticationFilter.java` — Spring Security фильтр авторизации запросов по токену.
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Spring Security 6 конфигурация, CORS и BCrypt.

---

## Точная реализация (Technical Design)

### 1. JPA Сущность `Staff`
```java
package com.qtab.api.staff;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "staff")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "restaurant_id", nullable = false)
    private UUID restaurantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String login;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role; // Enum: WAITER, KITCHEN, MANAGER, ADMIN

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
```

### 2. Защита Spring Security (`SecurityConfig.java`)
- Разрешить без аутентификации:
  - `/api/v1/auth/**`
  - `/api/v1/guest/**`
  - `/ws/**` (WebSocket соединение)
  - `/swagger-ui/**`, `/v3/api-docs/**`
- Защитить все остальные пути `/api/v1/**` (требует JWT).
- Сессии: `SessionCreationPolicy.STATELESS`.
- Внедрить `JwtAuthenticationFilter` перед `UsernamePasswordAuthenticationFilter`.

### 3. JWT Token Provider (`JwtTokenProvider.java`)
- Секретный ключ подтягивать из `${JWT_SECRET}`.
- Время жизни токена: 24 часа.
- Помещать в токен: `sub` (login), `role`, `restaurantId`, `staffId`.

### 4. Контроллер логина (`AuthController.java`)
- Эндпоинт `POST /api/v1/auth/login`.
- Найти `Staff` по `login` → проверить хэш пароля через `PasswordEncoder.matches`.
- Сгенерировать JWT токен и вернуть `LoginResponse`.

---

## Риски и подводные камни (Edge Cases)

- **Timing-атаки:** Использовать хэширование BCrypt для паролей. Если пользователь не найден, выполнять "фиктивную" проверку хэша, чтобы время ответа на неверный логин не отличалось от верного.
- **CORS:** Настроить конфигурацию CORS для обслуживания локального фронтенда (`http://localhost:3000`).

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать сущность `Staff.java` и репозиторий `StaffRepository.java`.
- [x] 2. Создать DTO: `LoginRequest.java`, `LoginResponse.java`.
- [x] 3. Написать класс `JwtTokenProvider.java`.
- [x] 4. Написать фильтр `JwtAuthenticationFilter.java` для извлечения JWT из заголовка `Authorization` и установки контекста авторизации.
- [x] 5. Создать `SecurityConfig.java` с фильтрами, CORS, BCrypt bean.
- [x] 6. Реализовать `AuthController.java`.
- [x] 7. Написать Unit-тест для входа персонала и валидации токенов.
- [x] 8. Скомпилировать бэкенд: `.\mvnw.cmd clean compile`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручной проверки.

---

## Ручная проверка

1. Заполнить в БД тестового администратора (например, через миграцию `V2__test_staff.sql` или напрямую):
   `login: admin`, `password: admin123` (хэш BCrypt).
2. Выполнить запрос `POST /api/v1/auth/login` с телом:
   `{"login":"admin","password":"admin123"}`.
3. Убедиться, что возвращается HTTP 200 c JWT-токеном в ответе.
