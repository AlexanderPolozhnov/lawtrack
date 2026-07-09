# TASK: Онлайн-бронирование столиков с интерактивной картой зала (Online Table Booking)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 5  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать систему онлайн-бронирования столиков для гостей: создание таблицы бронирований в БД, эндпоинты проверки занятости столов на выбранное время и создания брони, публичный интерфейс бронирования с визуальным выбором стола на 2D-карте зала, а также панель управления бронированиями для администратора.

---

## Контекст

- **Зависит от:** TASK_09 (Floor Map & Table positions), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend + DB
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Guest API: `/booking/**`, Admin API: `/admin/bookings/**`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 5, «Онлайн-бронирование столиков с визуальным выбором стола».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/resources/db/migration/V11__create_bookings_table.sql` — Таблица бронирований.
- `backend/src/main/java/com/qtab/api/booking/BookingEntity.java` — Сущность бронирования.
- `backend/src/main/java/com/qtab/api/booking/BookingRepository.java` — Репозиторий.
- `backend/src/main/java/com/qtab/api/booking/BookingService.java` — Логика проверки доступности столов и создания брони.
- `backend/src/main/java/com/qtab/api/booking/GuestBookingController.java` — Публичный REST-контроллер для гостей (`GET /api/v1/booking/{restaurantSlug}/availability`, `POST /api/v1/booking`).
- `backend/src/main/java/com/qtab/api/booking/AdminBookingController.java` — REST-контроллер администрирования бронирований.
- `backend/src/main/java/com/qtab/api/booking/dto/CreateBookingRequest.java` — DTO создания брони.
- `backend/src/main/java/com/qtab/api/booking/dto/TableAvailabilityResponse.java` — DTO доступности стола для брони.
- `backend/src/main/java/com/qtab/api/booking/dto/BookingResponse.java` — DTO ответа.

**Frontend:**
- `frontend/src/app/(public)/booking/[slug]/page.tsx` — Публичный экран бронирования стола в ресторане: календарь, выбор времени, интерактивная карта зала с подсвеченными свободными столами (зелеными) и кнопка отправки формы.
- `frontend/src/app/(admin)/bookings/page.tsx` — Страница управления бронированиями в админке: таблица броней, фильтрация по дате, кнопки «Подтвердить» и «Отменить» бронь.

### Изменить существующие

**Frontend:**
- `frontend/src/components/admin/AdminSidebar.tsx` — Добавить пункт «Бронирования» (`/bookings`) в сайдбар.

---

## Точная реализация (Technical Design)

### 1. БД миграция

#### V11__create_bookings_table.sql
```sql
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    table_id UUID NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    guest_count INT NOT NULL,
    booking_datetime TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED, CANCELLED, COMPLETED
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant ON bookings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(booking_datetime);
```

### 2. Логика занятости стола (BookingService.java)
Стол считается **занятым** на указанное время `bookingDateTime`, если существует другое подтвержденное (`CONFIRMED`) бронирование этого же столика, попадающее в интервал `bookingDateTime - 2 часа` и `bookingDateTime + 2 часа`.

```java
public List<TableAvailabilityResponse> getTableAvailability(UUID restaurantId, LocalDateTime dateTime) {
    List<TableEntity> tables = tableRepository.findByRestaurantId(restaurantId);
    
    // Временной интервал пересечения
    LocalDateTime start = dateTime.minusHours(2);
    LocalDateTime end = dateTime.plusHours(2);
    
    List<BookingEntity> activeBookings = bookingRepository.findConflictingBookings(restaurantId, start, end);
    Set<UUID> reservedTableIds = activeBookings.stream()
            .map(BookingEntity::getTableId)
            .collect(Collectors.toSet());
            
    return tables.stream()
            .map(table -> new TableAvailabilityResponse(
                table.getId(),
                table.getNumber(),
                table.getCapacity(),
                table.getShape(),
                table.getPositionX(),
                table.getPositionY(),
                table.getWidth(),
                table.getHeight(),
                !reservedTableIds.contains(table.getId()) // isAvailable
            ))
            .collect(Collectors.toList());
}
```

#### Метод JPQL в BookingRepository:
```java
@Query("SELECT b FROM BookingEntity b WHERE b.restaurantId = :restaurantId " +
       "AND b.status = 'CONFIRMED' AND b.bookingDatetime BETWEEN :start AND :end")
List<BookingEntity> findConflictingBookings(
    @Param("restaurantId") UUID restaurantId, 
    @Param("start") LocalDateTime start, 
    @Param("end") LocalDateTime end
);
```

### 3. Публичный UI Бронирования (`app/(public)/booking/[slug]/page.tsx`)
- Шапка с названием ресторана.
- Шаг 1: Форма (Дата, Время, Кол-во человек, Имя, Телефон).
- Шаг 2: После выбора даты/времени отправляется запрос к API availability. На экране отображается интерактивный план зала.
  - Столы с `isAvailable = true` и вместимостью `>= guest_count` красятся в зеленый и кликабельны.
  - Занятые столы (`isAvailable = false`) красятся в серый и некликабельны.
  - При клике на зеленый стол — он обводится золотой рамкой (активный выбор).
- Шаг 3: Нажать «Подтвердить бронирование» -> создается запись. Отображается экран успеха.

---

## Риски и подводные камни (Edge Cases)

- **Конкурентное бронирование одного стола:** Если два гостя одновременно выбирают один столик на одно время. На бэкенде в методе `createBooking` использовать `@Transactional` и перед записью в БД делать повторную проверку занятости стола. Если стол успели занять — бросать ошибку `IllegalStateException` («Стол уже забронирован на это время»).
- **Синхронизация часовых поясов:** Все даты-время бронирований сохранять в бэкенд в UTC (LocalDateTime), фронтенд должен передавать время в формате ISO-8601 с суффиксом UTC.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать Flyway миграцию `V11__create_bookings_table.sql`.
- [x] 2. Создать сущность `BookingEntity.java` и репозиторий `BookingRepository.java`.
- [x] 3. Реализовать бизнес-логику проверки занятости и создания брони в `BookingService.java`.
- [x] 4. Создать публичный контроллер `GuestBookingController.java`.
- [x] 5. Создать защищенный `AdminBookingController.java`.
- [x] 6. Обновить `SecurityConfig.java` (разрешить публичный доступ к гостевому бронированию).
- [x] 7. Написать Unit-тест проверки пересечений времени бронирования.
- [x] 8. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 9. Создать страницу бронирования гостя `(public)/booking/[slug]/page.tsx` с календарем и холстом выбора столов.
- [x] 10. Создать страницу управления бронями `(admin)/bookings/page.tsx` с фильтрами по дате и изменением статуса.
- [x] 11. Добавить пункт в `AdminSidebar.tsx`.
- [x] 12. Выполнить `cd frontend && pnpm run build`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [ ] Выполни локальную валидацию `.\verify-all.ps1`.
2. [ ] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [ ] Запусти `.\rotate-backup.ps1`.
4. [ ] Синхронизируй `ROADMAP.md`.
5. [ ] Перемести файл этой задачи в `docs/tasks/temp_tasks/`.
6. [ ] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Открыть публичную страницу бронирования: `http://localhost:3000/booking/qtab-cafe`.
2. Заполнить форму: дата (завтра), время (18:00), гостей: 2, имя: «Михаил», телефон: `+375297778899`.
3. После заполнения времени должен отрисоваться холст зала. Столики 1, 2, 3 подсвечены зеленым.
4. Выбрать кликом Столик №1 (он должен обвестись золотой рамкой) и нажать «Забронировать». Должен открыться экран успеха.
5. Попробовать забронировать Столик №1 повторно на то же время (завтра в 18:30) — Столик №1 на карте зала должен отображаться серым (занятым) и быть некликабельным.
6. Войти в админку, перейти в «Бронирования».
7. Убедиться, что бронь Михаила отображается в списке на завтрашнюю дату со статусом `CONFIRMED`.
8. Нажать кнопку «Отменить бронирование» на строке Михаила.
9. Снова зайти на гостевую страницу бронирования на то же время — Столик №1 должен снова стать зеленым (доступным).
