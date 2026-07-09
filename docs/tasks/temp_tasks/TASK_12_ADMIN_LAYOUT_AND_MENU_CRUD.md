# TASK: Глобальный макет админки и CRUD редактор меню

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 3  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Создать базовую структуру (Layout + Sidebar) для панели администратора, реализовать backend/frontend CRUD операции для управления категориями (`MenuCategory`) и блюдами (`MenuItem`), а также сервис локальной загрузки изображений с интерфейсом для будущего перехода на S3-совместимое хранилище.

---

## Контекст

- **Зависит от:** TASK_02 (Auth), TASK_05 (Menu API)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/menu/categories`, `/admin/menu/items`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- **Выжимка из KNOWN_ISSUES:**
  - Tailwind v4: стили через переменные в `globals.css`.
  - `'use client'` для компонентов с интерактивностью.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 3, «CRUD категорий и блюд».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/common/service/StorageService.java` — Интерфейс для хранения файлов (загрузка, удаление).
- `backend/src/main/java/com/qtab/api/common/service/LocalStorageService.java` — Реализация хранения файлов на локальном диске (в папку статики бэкенда).
- `backend/src/main/java/com/qtab/api/menu/AdminMenuController.java` — REST-контроллер для CRUD меню (категории, блюда, загрузка картинок).
- `backend/src/main/java/com/qtab/api/menu/dto/CreateCategoryRequest.java` — DTO для создания/обновления категории.
- `backend/src/main/java/com/qtab/api/menu/dto/CreateMenuItemRequest.java` — DTO для создания/обновления блюда.

**Frontend:**
- `frontend/src/app/(admin)/layout.tsx` — Макет панели администратора с адаптивным сайдбаром (Sidebar) и верхней панелью.
- `frontend/src/app/(admin)/menu-editor/page.tsx` — Страница редактора меню: вкладки категорий с drag-and-drop сортировкой, список блюд с карточками, кнопка stop-list.
- `frontend/src/components/admin/CategoryModal.tsx` — Модальное окно создания/редактирования категории.
- `frontend/src/components/admin/MenuItemModal.tsx` — Модальное окно создания/редактирования блюда (загрузка фото, добавление размеров/модификаторов).
- `frontend/src/components/admin/AdminSidebar.tsx` — Боковая панель навигации для администратора.

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Настроить раздачу статических ресурсов из папки `/uploads/**`.
- `backend/src/main/java/com/qtab/api/menu/MenuCategory.java` — Добавить setter/update методы для полей.
- `backend/src/main/java/com/qtab/api/menu/MenuItem.java` — Добавить setter/update методы для полей.
- `backend/src/main/java/com/qtab/api/menu/MenuService.java` — Добавить CRUD-методы и логику инвалидации Redis-кэша (`evictMenuCache`).

---

## Точная реализация (Technical Design)

### 1. Загрузка файлов (File Storage)

Для разработки реализуем хранение на локальном диске, но с абстракцией. Папка загрузки: `backend/uploads/`.
В `SecurityConfig.java` нужно настроить раздачу статики:
```java
@Override
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/uploads/**")
            .addResourceLocations("file:uploads/");
}
```

#### StorageService.java
```java
public interface StorageService {
    String store(MultipartFile file);
    void delete(String fileUrl);
}
```

#### LocalStorageService.java
```java
@Service
@Slf4j
public class LocalStorageService implements StorageService {
    private final Path rootLocation = Paths.get("uploads");

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("Failed to store empty file.");
            }
            String filename = UUID.randomUUID() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, this.rootLocation.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/uploads/")) return;
        try {
            String filename = fileUrl.replace("/uploads/", "");
            Path file = rootLocation.resolve(filename);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete file: " + fileUrl, e);
        }
    }
}
```

### 2. DTO и эндпоинты CRUD

#### CreateCategoryRequest.java
```java
public record CreateCategoryRequest(
    @NotBlank String nameRu,
    @NotBlank String nameEn,
    @NotBlank String iconEmoji,
    @NotNull Integer sortOrder,
    @NotNull Boolean isActive
) {}
```

#### CreateMenuItemRequest.java
```java
public record CreateMenuItemRequest(
    @NotBlank String nameRu,
    @NotBlank String nameEn,
    String descriptionRu,
    String descriptionEn,
    @NotNull BigDecimal basePrice,
    @NotNull Integer cookingTimeMinutes,
    @NotNull Integer calories,
    @NotNull Boolean isVegetarian,
    @NotNull Boolean isSpicy,
    @NotNull Boolean isHit,
    @NotNull Boolean isNew,
    @NotNull Boolean isActive,
    @NotNull Integer sortOrder,
    Map<String, BigDecimal> sizeVariants,
    List<MenuItem.Modifier> modifiers,
    List<String> badges
) {}
```

#### AdminMenuController.java (JWT с ролями ADMIN/MANAGER)
```java
@RestController
@RequestMapping("/api/v1/admin/menu")
@RequiredArgsConstructor
public class AdminMenuController {
    private final MenuService menuService;
    private final StorageService storageService;

    // Categories
    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<MenuCategoryResponse>> createCategory(
            @RequestParam UUID restaurantId, @Valid @RequestBody CreateCategoryRequest req);

    @PutMapping("/categories/{categoryId}")
    public ResponseEntity<ApiResponse<MenuCategoryResponse>> updateCategory(
            @PathVariable UUID categoryId, @RequestParam UUID restaurantId, @Valid @RequestBody CreateCategoryRequest req);

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable UUID categoryId, @RequestParam UUID restaurantId);

    // Items
    @PostMapping("/categories/{categoryId}/items")
    public ResponseEntity<ApiResponse<MenuItemResponse>> createItem(
            @PathVariable UUID categoryId, @RequestParam UUID restaurantId, @Valid @RequestBody CreateMenuItemRequest req);

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<MenuItemResponse>> updateItem(
            @PathVariable UUID itemId, @RequestParam UUID restaurantId, @Valid @RequestBody CreateMenuItemRequest req);

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable UUID itemId, @RequestParam UUID restaurantId);

    // Image Upload
    @PostMapping("/items/upload-image")
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = storageService.store(file);
        return ResponseEntity.ok(ApiResponse.success(url));
    }
}
```

### 3. Frontend Layout & Sidebar

В `frontend/src/app/(admin)/layout.tsx` создать общую обертку для админки:
- Сайдбар слева: логотип, ссылки на разделы (Меню-редактор, Столы, Персонал, Промо-акции, Аналитика, Настройки, Выйти).
- Главная панель справа: шапка с текущим рестораном, именем пользователя, кнопкой переключения темы.

Использовать Lucide React иконки:
- Редактор Меню: `UtensilsCrossed`
- Столики / Карта зала: `LayoutGrid`
- Персонал: `Users`
- Акции / Промо: `Percent`
- Аналитика / Выручка: `BarChart3`
- Настройки: `Settings`

### 4. Menu Editor UI

Страница `/menu-editor` должна содержать:
1. Вкладки (Tabs) со списком категорий. Кнопка «Добавить категорию» и «Редактировать выбранную».
2. Внутри выбранной категории — список карточек блюд. Кнопка «Добавить блюдо».
3. На карточке блюда: превью фото, название, цена, значки (Острое, Вег), переключатель «В наличии» (Stop-list). При выключении статуса `isActive` отправляется PATCH/PUT запрос на бэкенд и сбрасывается Redis-кэш меню.

---

## Риски и подводные камни (Edge Cases)

- **Redis Cache:** Любые CRUD операции админа над категориями или блюдами ОБЯЗАНЫ вызывать `menuService.evictMenuCache(restaurantId)` для сброса кэша. Иначе гости будут видеть старое меню в течение 15 минут.
- **Безопасность директории загрузок:** Убедитесь, что загружаемые файлы проверяются на тип (только image/png, image/jpeg, image/webp). На бэкенде сделать простую валидацию расширения.
- **Удаление сущностей:** При удалении категории нужно либо удалять все связанные блюда каскадно (JPA cascade), либо запрещать удаление, если в категории есть блюда (более безопасный подход).

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать интерфейс `StorageService` и реализацию `LocalStorageService`.
- [x] 2. Добавить `addResourceHandlers` в конфигурацию Spring MVC (в WebConfig или SecurityConfig).
- [x] 3. Реализовать методы CRUD категорий и блюд в `MenuService` с вызовом `evictMenuCache()`.
- [x] 4. Создать `AdminMenuController.java` с эндпоинтами для категорий, блюд и загрузки картинок.
- [x] 5. Добавить необходимые эндпоинты в `SecurityConfig.java` для ролей ADMIN/MANAGER.
- [x] 6. Написать Unit-тест для `AdminMenuController` и убедиться, что всё компилируется.
- [x] 7. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 8. Создать сайдбар `AdminSidebar.tsx` и макет `(admin)/layout.tsx`.
- [x] 9. Создать модалки `CategoryModal.tsx` и `MenuItemModal.tsx` с валидацией полей.
- [x] 10. Создать страницу `menu-editor/page.tsx` с полной интеграцией API (React Query мутации для добавления/редактирования/удаления/переключения stop-list).
- [x] 11. Запустить `cd frontend && pnpm run build` для проверки сборки Next.js.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` in root of the project.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md`.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ручного тестирования ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Зайти в панель администратора по адресу `/auth/login` с логином `admin` и паролем `password`.
2. Убедиться, что произошло перенаправление в админку, отображается сайдбар.
3. Перейти в «Редактор Меню».
4. Создать новую категорию «Напитки» (добавить эмодзи, нажать сохранить). Категория должна появиться на вкладках.
5. Нажать «Добавить блюдо» внутри категории:
   - Заполнить название «Домашний Лимонад», описание, цену.
   - Загрузить картинку через форму.
   - Добавить модификатор «С мятой» (+1.0 BYN).
   - Нажать сохранить.
6. Убедиться, что блюдо отображается в списке.
7. Открыть мобильное меню гостя (например, `/menu/qtab-cafe/table-1`) и проверить, что новая категория и блюдо появились там мгновенно.
8. В админке переключить тумблер активности блюда (Stop-list) в положение «Выключено».
9. Обновить меню гостя — блюдо должно пропасть из видимого списка.
