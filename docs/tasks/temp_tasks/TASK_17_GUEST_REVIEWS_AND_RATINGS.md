# TASK: Система отзывов и оценок гостей (Guest Reviews & Ratings)

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 4  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Реализовать систему сбора отзывов от гостей после оплаты визита: создание таблицы отзывов в БД, REST API эндпоинты для отправки отзыва гостем и просмотра отзывов администратором, а также интерактивную форму оценки в Guest PWA и таблицу отзывов в Admin Panel.

---

## Контекст

- **Зависит от:** TASK_10 (Payments), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend + DB
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Guest API: `POST /review`, Admin API: `GET /admin/reviews`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 4, «Система отзывов и оценок после оплаты визита».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/resources/db/migration/V9__create_reviews_table.sql` — Таблица отзывов.
- `backend/src/main/java/com/qtab/api/review/ReviewEntity.java` — Сущность отзыва.
- `backend/src/main/java/com/qtab/api/review/ReviewRepository.java` — Репозиторий.
- `backend/src/main/java/com/qtab/api/review/ReviewService.java` — Бизнес-логика сохранения и чтения отзывов.
- `backend/src/main/java/com/qtab/api/review/GuestReviewController.java` — Публичный REST-контроллер для гостей (`POST /api/v1/review`).
- `backend/src/main/java/com/qtab/api/review/AdminReviewController.java` — REST-контроллер для просмотра отзывов в админке.
- `backend/src/main/java/com/qtab/api/review/dto/CreateReviewRequest.java` — DTO для отправки отзыва гостем.
- `backend/src/main/java/com/qtab/api/review/dto/ReviewResponse.java` — DTO для ответа с деталями отзыва.

**Frontend:**
- `frontend/src/app/(admin)/reviews/page.tsx` — Страница отзывов в админ-панели: список отзывов, средняя оценка, распределение звезд, фильтрация по оценкам.
- `frontend/src/components/guest/ReviewForm.tsx` — Интерактивная форма отзыва со звездами и полем комментария.

### Изменить существующие

**Frontend:**
- `frontend/src/app/(guest)/thankyou/page.tsx` — Внедрить компонент `ReviewForm` вместо статичного текста. Позволить гостю отправить отзыв один раз.
- `frontend/src/components/admin/AdminSidebar.tsx` — Добавить вкладку «Отзывы» (`/reviews`) в сайдбар.

---

## Точная реализация (Technical Design)

### 1. БД и Entity

#### V9__create_reviews_table.sql
```sql
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    restaurant_id UUID NOT NULL,
    guest_name VARCHAR(255),
    overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    food_rating INT NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
    comment TEXT,
    sentiment VARCHAR(50) NOT NULL DEFAULT 'NEUTRAL', -- POSITIVE, NEUTRAL, NEGATIVE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
```

#### ReviewEntity.java
```java
@Entity
@Table(name = "reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewEntity {
    @Id
    private UUID id;
    
    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;
    
    @Column(name = "restaurant_id", nullable = false)
    private UUID restaurantId;
    
    private String guestName;
    private int overallRating;
    private int foodRating;
    private int serviceRating;
    private String comment;
    private String sentiment; // Временно по дефолту 'NEUTRAL', ИИ прикрутим в следующей задаче
    private LocalDateTime createdAt;
}
```

### 2. Backend эндпоинты

#### CreateReviewRequest.java
```java
public record CreateReviewRequest(
    @NotNull UUID orderId,
    String guestName,
    @Min(1) @Max(5) int overallRating,
    @Min(1) @Max(5) int foodRating,
    @Min(1) @Max(5) int serviceRating,
    String comment
) {}
```

#### GuestReviewController.java (Публичный)
```java
@RestController
@RequestMapping("/api/v1/review")
@RequiredArgsConstructor
public class GuestReviewController {
    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(@Valid @RequestBody CreateReviewRequest req) {
        // Проверка: заказ должен существовать и иметь статус PAID
        // Сохранить отзыв
        ReviewResponse response = reviewService.createReview(req);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

#### AdminReviewController.java (JWT ADMIN/MANAGER)
```java
@RestController
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {
    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviews(@RequestParam UUID restaurantId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByRestaurant(restaurantId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }
}
```

### 3. Frontend Review Form в PWA гостя
- На странице `/thankyou` отображать форму `ReviewForm` с анимацией.
- Три категории звезд: «Общая оценка», «Качество еды», «Обслуживание» (анимированные золотые звезды на Framer Motion с ховером).
- Текстовое поле для ввода отзыва.
- После отправки отзыва плавно скрывать форму и выводить сообщение: «Спасибо за ваш отзыв! Вы помогаете нам стать лучше 🌟» с дождем из конфетти.

### 4. Admin Reviews UI
- Сетка метрик: Средняя общая оценка, Средняя оценка еды, Средняя оценка сервиса.
- Таблица или список карточек отзывов: имя гостя, дата, оценки по трем параметрам, текст отзыва.
- Цветовой бейдж тональности (пока все `NEUTRAL` серым цветом).

---

## Риски и подводные камни (Edge Cases)

- **Повторная отправка отзыва:** Один заказ (`orderId`) может иметь только один отзыв. В БД на поле `order_id` наложен `UNIQUE` индекс. На бэкенде делать проверку `existsByOrderId()` и бросать `ConflictException` (HTTP 409) при попытке повторной отправки. На фронтенде сохранять флаг `reviewedOrderIds` в localStorage.
- **Оценка неоплаченного заказа:** Разрешать оставлять отзывы только для заказов со статусом `PAID`. Проверять статус заказа в бэкенд сервисе перед созданием.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать Flyway миграцию `V9__create_reviews_table.sql`.
- [x] 2. Создать сущность `ReviewEntity.java` и репозиторий `ReviewRepository.java`.
- [x] 3. Написать сервис `ReviewService.java` с проверками на `PAID` статус заказа и уникальность `orderId`.
- [x] 4. Реализовать контроллеры `GuestReviewController.java` и `AdminReviewController.java`.
- [x] 5. Разрешить публичный доступ к `/api/v1/review` в `SecurityConfig.java`.
- [x] 6. Написать Unit-тест на создание отзывов.
- [x] 7. Выполнить `.\mvnw.cmd clean compile -q -DskipTests` (проверить миграцию и тесты).

### Frontend
- [x] 8. Создать интерактивный компонент `ReviewForm.tsx` со звездами и отправкой данных.
- [x] 9. Внедрить форму в `thankyou/page.tsx` с сохранением состояния отправки.
- [x] 10. Создать страницу отзывов админки `reviews/page.tsx` и обновить `AdminSidebar.tsx`.
- [x] 11. Выполнить `cd frontend && pnpm run build`.

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

1. Оформить заказ гостем, перевести его в статус `PAID` через панель официанта (оплата наличными/картой).
2. Гость должен автоматически перенаправиться на страницу `/thankyou` (или перейти на нее вручную).
3. На странице благодарности заполнить форму отзыва:
   - Общая оценка: 5 звезд
   - Еда: 5 звезд
   - Сервис: 4 звезды
   - Комментарий: «Очень вкусная пицца, но официант шел долго»
   - Нажать «Отправить».
4. Убедиться, что форма скрылась, отобразилось конфетти. При обновлении страницы форма отзыва не должна появляться повторно.
5. Войти под администратором, перейти в раздел «Отзывы».
6. Убедиться, что отзыв отображается в списке с оценками и комментарием.
