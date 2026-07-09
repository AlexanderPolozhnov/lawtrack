# TASK: Backend Unit Tests + Playwright E2E Setup

**Дата создания:** 2026-07-09  
**Приоритет:** Medium  
**Фаза:** Phase 6 (Полировка)  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)  
**Порядок выполнения:** 5 из 5

---

## Цель

После выполнения: все ключевые сервисы бэкенда покрыты unit-тестами (особенно OrderService — полный lifecycle заказа + item status transitions). Playwright настроен и содержит базовые E2E smoke-тесты для демо-среды (меню, создание заказа, кухня, статусы).

---

## Контекст

- **Зависит от:** TASK_34, TASK_35, TASK_36, TASK_37 (все баги должны быть исправлены перед написанием тестов на корректное поведение)
- **Затрагивает:** Backend (тесты) + Frontend (Playwright config + E2E тесты)
- **Связанный контракт:** `docs/FRONTEND_BACKEND_CONTRACT.md` — все секции

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.

### Текущее состояние тестов

**Backend:** 21 тест-файл, но 10/19 сервисов без тестов:
| Сервис | Тесты |
|---|---|
| `OrderService` | ✅ Есть, но не покрывает item status transitions |
| `FinanceService` | ❌ Нет |
| `StaffService` | ❌ Нет (только controller) |
| `TableService` | ❌ Нет (только controller) |
| `RestaurantService` | ❌ Нет |
| `TokenBlacklistService` | ❌ Нет |
| `NotificationService` | ❌ Нет |
| `PromptShieldService` | ❌ Нет |
| `DeliveryFeedbackService` | ❌ Нет |
| `QrCodeService` | ❌ Нет |

**Frontend:** 0 тестов, 0 инфраструктуры.

**Паттерны тестов:** JUnit 5 + Mockito, два стиля:
- Pattern A: Plain unit tests с `mock()` (без Spring context)
- Pattern B: `@WebMvcTest` + MockMvc (controller slice tests)

---

## Затронутые файлы

### Создать новые

#### Backend Tests:
- `backend/src/test/java/com/qtab/api/order/OrderServiceItemStatusTest.java` — тесты item status transitions (PENDING → PREPARING → READY) + auto-recalculate order status + 404 на несуществующий itemId
- `backend/src/test/java/com/qtab/api/order/KitchenControllerTest.java` — тесты KDS endpoints (GET /kitchen/orders, POST /take, PATCH /items/{id}/status)
- `backend/src/test/java/com/qtab/api/notification/NotificationServiceTest.java` — тесты отправки WS событий (notifyStaff, notifyKitchen, notifyOrderSubscribers)
- `backend/src/test/java/com/qtab/api/auth/TokenBlacklistServiceTest.java` — тесты blacklist (add, check, Redis failure fallback)
- `backend/src/test/java/com/qtab/api/analytics/PromptShieldServiceTest.java` — тесты Prompt Injection detection

#### Playwright E2E:
- `frontend/playwright.config.ts` — конфигурация Playwright
- `frontend/e2e/menu.spec.ts` — smoke-тест: загрузка меню, отображение блюд, цены
- `frontend/e2e/order-flow.spec.ts` — smoke-тест: создание заказа, подтверждение кодом, трекинг
- `frontend/e2e/kitchen.spec.ts` — smoke-тест: авторизация, KDS отображение, смена статуса

### Изменить существующие
- `frontend/package.json` — добавить `@playwright/test` в devDependencies, добавить script `"test:e2e": "playwright test"`
- `backend/src/test/java/com/qtab/api/order/OrderServiceTest.java` — дополнить тестами на item status update (добавить test methods, не переписывать существующие)

---

## Точная реализация (Technical Design)

### Backend Tests

#### 1. OrderServiceItemStatusTest.java

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceItemStatusTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private NotificationService notificationService;
    @Mock private MenuItemRepository menuItemRepository;
    // ... другие mocks по необходимости
    
    @InjectMocks private OrderService orderService;

    @Test
    void updateItemStatus_withValidItemId_changesStatus() {
        // Given: order with item in PENDING status
        // When: updateItemStatus(orderId, itemId, PREPARING)
        // Then: item.status == PREPARING, item.statusUpdatedAt != null
    }

    @Test
    void updateItemStatus_withInvalidItemId_throws404() {
        // Given: order exists but itemId doesn't match any order item
        // When: updateItemStatus(orderId, wrongItemId, PREPARING)
        // Then: ResponseStatusException 404 "Item not found"
    }

    @Test
    void updateItemStatus_allItemsReady_autoRecalculatesToReady() {
        // Given: order with 2 items, item1=READY, item2=PREPARING
        // When: updateItemStatus(orderId, item2Id, READY)
        // Then: order.status auto-recalculated to READY
    }

    @Test
    void updateItemStatus_firstItemPreparing_autoRecalculatesToPreparing() {
        // Given: order CONFIRMED, all items PENDING
        // When: updateItemStatus(orderId, item1Id, PREPARING)
        // Then: order.status auto-recalculated to PREPARING
    }

    @Test
    void updateItemStatus_sendsWebSocketNotifications() {
        // Given: order with item
        // When: updateItemStatus
        // Then: verify notificationService.notifyOrderSubscribers() called
        //       verify notificationService.notifyStaff() called
        //       verify notificationService.notifyKitchen() called
    }

    @Test
    void updateItemStatus_invalidTransition_throwsException() {
        // Given: item in READY status
        // When: updateItemStatus(orderId, itemId, PENDING) — обратный переход
        // Then: throws exception (invalid transition)
    }
}
```

#### 2. KitchenControllerTest.java

```java
@WebMvcTest(controllers = KitchenController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class KitchenControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private OrderService orderService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean(required = false) private TokenBlacklistService tokenBlacklistService;

    @Test
    void getKitchenOrders_returnsConfirmedOrders() { ... }

    @Test
    void takeOrder_changesAllItemsToPreparing() { ... }

    @Test
    void updateItemStatus_withValidRequest_returnsUpdatedOrder() { ... }

    @Test
    void updateItemStatus_withInvalidItemId_returns404() { ... }
}
```

#### 3. NotificationServiceTest.java

```java
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private SimpMessagingTemplate messagingTemplate;
    @InjectMocks private NotificationService notificationService;

    @Test
    void notifyStaff_sendsToRestaurantOrdersTopic() {
        // verify messagingTemplate.convertAndSend("/topic/restaurant/{id}/orders", ...)
    }

    @Test
    void notifyKitchen_sendsToKitchenTopic() {
        // verify messagingTemplate.convertAndSend("/topic/restaurant/{id}/kitchen", ...)
    }

    @Test
    void notifyOrderSubscribers_sendsToOrderTopic() {
        // verify messagingTemplate.convertAndSend("/topic/order/{id}", ...)
    }
}
```

#### 4. TokenBlacklistServiceTest.java

```java
@ExtendWith(MockitoExtension.class)
class TokenBlacklistServiceTest {

    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @InjectMocks private TokenBlacklistService tokenBlacklistService;

    @Test
    void blacklist_addsTokenToRedis() { ... }

    @Test
    void isBlacklisted_returnsTrueForBlacklistedToken() { ... }

    @Test
    void isBlacklisted_returnsFalseOnRedisFailure() {
        // fail-open: Redis down → return false (не блокировать пользователя)
    }
}
```

#### 5. PromptShieldServiceTest.java

```java
@ExtendWith(MockitoExtension.class)
class PromptShieldServiceTest {

    private PromptShieldService promptShieldService;

    @BeforeEach
    void setUp() {
        promptShieldService = new PromptShieldService();
    }

    @Test
    void validate_cleanPrompt_passes() { ... }

    @Test
    void validate_promptInjection_throws() {
        // "Ignore all previous instructions" → exception
    }

    @Test
    void validate_htmlInjection_throws() {
        // "<script>alert('xss')</script>" → exception
    }
}
```

### Playwright E2E

#### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://www.qtab.space',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

#### menu.spec.ts (smoke test)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Guest Menu', () => {
  test('should display menu with categories and dishes', async ({ page }) => {
    await page.goto('/menu/qtab-demo/t1111111-1111-1111-1111-111111111111');
    
    // Ожидание загрузки меню
    await expect(page.locator('[data-testid="menu-category"]').first()).toBeVisible({ timeout: 10000 });
    
    // Проверка что хотя бы одно блюдо отображается
    await expect(page.locator('[data-testid="menu-item-card"]').first()).toBeVisible();
    
    // Проверка что цена отображается (не 0.00)
    const priceText = await page.locator('[data-testid="menu-item-card"] .text-primary').first().textContent();
    expect(parseFloat(priceText!)).toBeGreaterThan(0);
  });
  
  test('should open dish detail and show correct price', async ({ page }) => {
    await page.goto('/menu/qtab-demo/t1111111-1111-1111-1111-111111111111');
    await page.locator('[data-testid="menu-item-card"]').first().click();
    
    // Модалка должна открыться
    await expect(page.locator('[data-testid="menu-item-modal"]')).toBeVisible();
    
    // Цена в модалке > 0
    const modalPrice = await page.locator('[data-testid="menu-item-price"]').textContent();
    expect(parseFloat(modalPrice!)).toBeGreaterThan(0);
  });
});
```

> ⚠️ Для E2E тестов потребуется добавить `data-testid` атрибуты в компоненты. Добавлять минимально — только для тестируемых элементов.

---

## Риски и подводные камни

- **MockitoExtension vs @MockitoBean:** В unit тестах (без Spring context) использовать `@ExtendWith(MockitoExtension.class)` + `@Mock`/`@InjectMocks`. В @WebMvcTest использовать `@MockitoBean`.
- **OrderService dependencies:** `OrderService` может иметь 10+ зависимостей. Нужно мокировать все через конструктор. Проверить через grep конструктор OrderService.
- **Playwright на CI:** Playwright требует headless browsers. На CI (GitHub Actions) потребуется `npx playwright install --with-deps`. В рамках этой задачи — только локальная настройка.
- **E2E на production:** Тесты используют `https://www.qtab.space` — это демо-среда. Тесты НЕ должны модифицировать критические данные. Создание заказов в E2E допустимо (демо-данные).

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend Tests
- [x] 1. Создать `OrderServiceItemStatusTest.java` — 6 тестов на item status lifecycle.
- [x] 2. `.\mvnw.cmd test -pl backend -Dtest=OrderServiceItemStatusTest` — проверить тесты.
- [x] 3. Создать `KitchenControllerTest.java` — 4 теста на KDS endpoints.
- [x] 4. `.\mvnw.cmd test -pl backend -Dtest=KitchenControllerTest` — проверить.
- [x] 5. Создать `NotificationServiceTest.java` — 3 теста на WS dispatch.
- [x] 6. Создать `TokenBlacklistServiceTest.java` — 3 теста на Redis blacklist.
- [x] 7. Создать `PromptShieldServiceTest.java` — 3 теста на injection detection.
- [x] 8. `.\mvnw.cmd test` — прогнать ВСЕ тесты.

### Frontend Playwright
- [x] 9. Добавить `@playwright/test` в devDependencies: `cd frontend && pnpm add -D @playwright/test`.
- [x] 10. Добавить script `"test:e2e": "playwright test"` в package.json.
- [x] 11. Создать `playwright.config.ts`.
- [x] 12. Создать `frontend/e2e/menu.spec.ts` — 2 smoke-теста.
- [x] 13. Создать `frontend/e2e/order-flow.spec.ts` — базовый тест order flow (если возможно без реального backend).
- [x] 14. Создать `frontend/e2e/kitchen.spec.ts` — базовый тест KDS.
- [x] 15. Добавить минимальные `data-testid` атрибуты в компоненты для E2E тестов.
- [x] 16. `cd frontend && pnpm run build` — проверить сборку.
- [x] 17. Запустить `npx playwright install` для установки браузеров.

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Любое добавление или редактирование текстовой информации во всех файлах проекта должно производиться **СТРОГО в кодировке UTF-8**.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` в корне проекта.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update 2026-07-09: Backend Unit Tests + Playwright E2E Setup`.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь `[x] E2E тесты (Playwright)`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. **Backend тесты:**
   ```bash
   cd backend
   .\mvnw.cmd test
   ```
   Все тесты должны пройти (26+ тестов).

2. **Playwright E2E:**
   ```bash
   cd frontend
   npx playwright install
   npx playwright test --ui
   ```
   Откроется Playwright UI с тестами. Все smoke-тесты должны пройти на https://www.qtab.space.

3. **CI/CD:** Для интеграции в GitHub Actions добавить step:
   ```yaml
   - name: Run Playwright tests
     run: cd frontend && npx playwright test
   ```
