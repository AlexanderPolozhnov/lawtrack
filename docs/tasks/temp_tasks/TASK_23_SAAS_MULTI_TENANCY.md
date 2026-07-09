# TASK: SaaS Мультитенантность и регистрация ресторанов (Multi-Tenancy Setup)

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 6  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать полноценный SaaS-режим (Multi-Tenancy): эндпоинт регистрации нового ресторана с автоматическим созданием структуры данных (дефолтных столиков и аккаунта администратора) и внедрить строгую валидацию изоляции данных `restaurantId` на уровне Spring Security контекста.

---

## Контекст

- **Зависит от:** TASK_02 (Auth API), TASK_12 (Admin Layout), TASK_14 (Staff Management)
- **Затрагивает:** Backend + Frontend + DB
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/settings`, Public API: `/auth/register-restaurant`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (Multi-Tenancy).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 6, «SaaS-режим для многих ресторанов».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/restaurant/dto/RegisterRestaurantRequest.java` — DTO запроса на регистрацию заведения.
- `backend/src/main/java/com/qtab/api/restaurant/dto/RegisterRestaurantResponse.java` — DTO ответа на регистрацию.
- `backend/src/main/java/com/qtab/api/restaurant/PublicRestaurantController.java` — REST-контроллер для публичных действий (регистрация ресторана).

**Frontend:**
- `frontend/src/app/auth/register-restaurant/page.tsx` — Страница регистрации нового ресторана (название, slug, ФИО админа, логин, пароль).

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/restaurant/RestaurantRepository.java` — Добавить проверку `existsBySlug(String slug)`.
- `backend/src/main/java/com/qtab/api/restaurant/RestaurantService.java` — Добавить метод `registerRestaurant(RegisterRestaurantRequest)`, который:
  - Проверяет уникальность slug.
  - Создает и сохраняет `Restaurant`.
  - Создает и сохраняет первого сотрудника с ролью `ADMIN` и логином/паролем из запроса.
  - Создает 3 дефолтных столика (№1, №2, №3) в позициях по умолчанию.
- `backend/src/main/java/com/qtab/api/auth/JwtTokenProvider.java` — Зашивать `restaurantId` и `role` в Claims JWT токена сотрудника.
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Внедрить Security-проверки на соответствие `restaurantId` из токена и запрашиваемого ресурса в контроллерах персонала/админа, чтобы сотрудник одного ресторана не мог получить доступ к данным другого ресторана.
- `backend/src/main/java/com/qtab/api/staff/AdminStaffController.java` & `backend/src/main/java/com/qtab/api/table/AdminTableController.java` & `backend/src/main/java/com/qtab/api/analytics/AdminFinanceController.java` — 
  - Вместо приема `@RequestParam UUID restaurantId` из параметров запроса, извлекать `restaurantId` напрямую из JWT-токена авторизованного пользователя через `SecurityContextHolder.getContext().getAuthentication()`.

---

## Точная реализация (Technical Design)

### 1. Регистрация нового ресторана (RestaurantService.java)
Метод должен быть помечен `@Transactional`.
```java
public RegisterRestaurantResponse registerRestaurant(RegisterRestaurantRequest req) {
    if (restaurantRepository.existsBySlug(req.slug())) {
        throw new IllegalArgumentException("Ресторан с таким коротким адресом (slug) уже существует");
    }
    if (staffRepository.existsByLogin(req.adminLogin())) {
        throw new IllegalArgumentException("Логин администратора уже занят");
    }

    // 1. Создать ресторан
    Restaurant restaurant = Restaurant.builder()
            .id(UUID.randomUUID())
            .name(req.name())
            .slug(req.slug())
            .isActive(true)
            .createdAt(LocalDateTime.now())
            .build();
    restaurantRepository.save(restaurant);

    // 2. Создать дефолтного админа
    Staff admin = Staff.builder()
            .id(UUID.randomUUID())
            .restaurantId(restaurant.getId())
            .name(req.adminName())
            .login(req.adminLogin())
            .passwordHash(passwordEncoder.encode(req.adminPassword()))
            .role("ADMIN")
            .isActive(true)
            .build();
    staffRepository.save(admin);

    // 3. Создать 3 столика
    for (int i = 1; i <= 3; i++) {
        TableEntity table = TableEntity.builder()
                .id(UUID.randomUUID())
                .restaurantId(restaurant.getId())
                .number(i)
                .capacity(4)
                .status("FREE")
                .shape("SQUARE")
                .positionX(100 * i)
                .positionY(100)
                .width(60)
                .height(60)
                .guestsCount(0)
                .createdAt(LocalDateTime.now())
                .build();
        tableRepository.save(table);
    }

    return new RegisterRestaurantResponse(restaurant.getId(), restaurant.getName(), restaurant.getSlug(), admin.getLogin());
}
```

### 2. Извлечение restaurantId из токена
В `JwtTokenProvider.java` при создании токена:
```java
claims.put("restaurantId", staff.getRestaurantId().toString());
```
В контроллерах персонала:
```java
// Пример извлечения
UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
ClaimsPrincipal principal = (ClaimsPrincipal) auth.getPrincipal(); // или кастомный парсинг claims из токена
UUID restaurantId = principal.getRestaurantId();
```
Это полностью исключает уязвимости BOLA/IDOR (когда менеджер менял в URL параметр `?restaurantId=...` и правил чужие меню).

---

## Риски и подводные камни (Edge Cases)

- **Slug валидация:** Разрешать в slug только латинские буквы, цифры и дефис (регулярное выражение `^[a-z0-9-]+$`).
- **Безопасность JWT:** Убедиться, что токен парсится корректно и при отсутствии `restaurantId` (например, у гостя или некорректного токена) бэкенд возвращает 403 Forbidden.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать DTO классы для регистрации ресторана.
- [x] 2. Обновить `JwtTokenProvider.java` для добавления `restaurantId` в Claims.
- [x] 3. Реализовать логику `registerRestaurant` в `RestaurantService.java`.
- [x] 4. Создать `PublicRestaurantController.java` с эндпоинтом `/auth/register-restaurant`.
- [x] 5. Переписать админские контроллеры (`AdminMenuController`, `AdminTableController`, `AdminStaffController`, `AdminFinanceController`, `AdminPromoController`, `AdminBookingController`) на автоматическое извлечение `restaurantId` из токена авторизации.
- [x] 6. Написать тесты изоляции данных (тест, проверяющий что юзер с токеном ресторана А получает 403 при запросе к ресурсам ресторана Б).
- [x] 7. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 8. Создать страницу регистрации ресторана `frontend/src/app/auth/register-restaurant/page.tsx`.
- [x] 9. Обновить API запросы в админке: удалить передачу параметра `restaurantId` из query параметров запросов (так как бэкенд теперь берет его из JWT).
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

1. Открыть страницу регистрации нового ресторана: `/auth/register-restaurant`.
2. Заполнить поля: Название: `Новый Ресторан QTab`, Slug: `new-restaurant`, Администратор: `Новый Админ`, Логин: `new_admin`, Пароль: `password123`.
3. Нажать «Зарегистрировать». Система должна перенаправить на страницу логина.
4. Войти под `new_admin` / `password123`.
5. Перейти в «Планировка зала» — там должно автоматически отображаться 3 новых созданных столика.
6. В БД проверить, что создалась запись в `restaurants` и новый сотрудник в `staff` с привязкой к этому ресторану.
7. Проверить безопасность: попробовать сделать API-запрос к столам нового ресторана, передав JWT-токен старого админа (`admin` из демо-данных) — бэкенд должен вернуть ошибку доступа 403 Forbidden.
