# TASK: Интерактивный редактор планировки зала (Floor Plan Editor)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 3  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Реализовать интерактивный Drag-and-drop конструктор планировки зала для администратора на фронтенде и bulk-обновление координат/размеров столиков на бэкенде.

---

## Контекст

- **Зависит от:** TASK_09 (Floor Map), TASK_12 (Admin Layout)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `/admin/tables`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 3, «Drag-and-drop редактор планировки зала».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/table/dto/CreateTableRequest.java` — DTO для создания нового столика.
- `backend/src/main/java/com/qtab/api/table/dto/BulkUpdateTablesRequest.java` — DTO для массового изменения координат/размеров столиков.
- `backend/src/main/java/com/qtab/api/table/AdminTableController.java` — REST-контроллер для управления столиками (создание, удаление, bulk-обновление координат).

**Frontend:**
- `frontend/src/app/(admin)/tables/page.tsx` — Страница редактора планировки зала: интерактивный холст (Grid), панель элементов (столы разных форм, стены, декор), режим редактирования/сохранения.
- `frontend/src/components/admin/FloorPlanCanvas.tsx` — Холст с сеткой (grid) и drag-and-drop логикой позиционирования.
- `frontend/src/components/admin/TableSettingsModal.tsx` — Модальное окно редактирования свойств стола (номер, вместимость, форма).

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/table/TableService.java` — Добавить методы создания, удаления и массового обновления позиций столов с отправкой WebSocket-события.

---

## Точная реализация (Technical Design)

### 1. Backend API

Нам нужен эндпоинт для создания стола, удаления, а также bulk-сохранения, когда админ меняет планировку и нажимает кнопку «Сохранить».

#### CreateTableRequest.java
```java
public record CreateTableRequest(
    @NotNull Integer number,
    @NotNull Integer capacity,
    @NotBlank String shape, // ROUND, SQUARE, RECTANGLE
    @NotNull Integer positionX,
    @NotNull Integer positionY,
    @NotNull Integer width,
    @NotNull Integer height
) {}
```

#### BulkUpdateTablesRequest.java
```java
public record BulkUpdateTablesRequest(
    @NotEmpty List<TablePositionUpdate> tables
) {
    public record TablePositionUpdate(
        @NotNull UUID id,
        @NotNull Integer positionX,
        @NotNull Integer positionY,
        @NotNull Integer width,
        @NotNull Integer height
    ) {}
}
```

#### AdminTableController.java
```java
@RestController
@RequestMapping("/api/v1/admin/tables")
@RequiredArgsConstructor
public class AdminTableController {
    private final TableService tableService;

    @PostMapping
    public ResponseEntity<ApiResponse<TableResponse>> createTable(
            @RequestParam UUID restaurantId, @Valid @RequestBody CreateTableRequest req) {
        TableResponse created = tableService.createTable(restaurantId, req);
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    @PutMapping("/bulk-positions")
    public ResponseEntity<ApiResponse<List<TableResponse>>> updateTablePositions(
            @RequestParam UUID restaurantId, @Valid @RequestBody BulkUpdateTablesRequest req) {
        List<TableResponse> updated = tableService.updateTablePositions(restaurantId, req);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{tableId}")
    public ResponseEntity<ApiResponse<Void>> deleteTable(
            @PathVariable UUID tableId, @RequestParam UUID restaurantId) {
        tableService.deleteTable(restaurantId, tableId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

### 2. TableService.java логика
При создании столика по умолчанию ему присваивается статус `FREE`. При удалении столика нужно проверять, нет ли на нём активных сессий или заказов (если есть — кидать ошибку `IllegalStateException`).
После каждого изменения столика отправлять WebSocket-нотификацию на топик `/topic/restaurant/{restaurantId}/tables` через `sendTableEvent()` (существующий метод), чтобы у официантов на карте зала живые данные обновлялись в реальном времени!

### 3. Frontend Floor Plan Designer
- Использовать холст с CSS-сеткой (например, 20px x 20px).
- Поддерживать drag-and-drop с помощью Framer Motion (`drag`, `dragConstraints`, `dragElastic={0}`, `dragMomentum={false}`) или pointer events для позиционирования столов.
- В режиме «Редактирование»:
  - Слева/сверху панель с кнопками: «+ Круглый стол», «+ Квадратный стол», «+ Прямоугольный стол». При нажатии добавляется новый стол со статусом `FREE` в центр холста.
  - Двойной клик на стол открывает `TableSettingsModal` для изменения номера или вместимости.
  - Кнопка «Удалить» на столе.
  - Кнопки «Сохранить» (вызывает API bulk-positions) и «Отмена» (сброс к исходному состоянию).
- Дизайн столов должен быть консистентным с `TableNode.tsx`, но с визуальной рамкой/сеткой перемещения.

---

## Риски и подводные камни (Edge Cases)

- **Наложение столиков (Collision):** На фронтенде можно сделать простую визуальную валидацию (рамка стола становится красной, если он пересекается с другим столом), но жестко не ограничивать, чтобы дать свободу расстановки.
- **Удаление стола с активной сессией:** На бэкенде обязательно делать проверку: `existsByTableIdAndStatusIn` в `OrderRepository` для заказов со статусами `CREATED`, `COOKING`, `READY`, `SERVED`, `BILL_REQUESTED`. Не позволять удалять столик, пока заказ не оплачен или не отменен!
- **WebSocket рассылка:** При bulk-сохранении рассылать одно суммарное WebSocket событие или по одному для каждого измененного столика, чтобы у персонала не лагал UI. Лучше сделать один общий тип события `TABLES_BULK_UPDATED`.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать DTO-классы `CreateTableRequest` и `BulkUpdateTablesRequest`.
- [x] 2. Добавить методы в `TableService.java`: `createTable`, `deleteTable`, `updateTablePositions`.
- [x] 3. Реализовать `AdminTableController.java`.
- [x] 4. Написать unit-тесты для новых эндпоинтов.
- [x] 5. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 6. Создать `TableSettingsModal.tsx` для ввода номера и вместимости столика.
- [x] 7. Создать компонент `FloorPlanCanvas.tsx` с drag-and-drop перетаскиванием столов по сетке холста.
- [x] 8. Создать страницу `tables/page.tsx` с панелью инструментов (добавить стол, сохранить, отменить).
- [x] 9. Протестировать E2E связку: перетащить стол в админке -> нажать сохранить -> проверить, что на `/dashboard` официанта стол тоже сдвинулся в реальном времени по WebSocket.
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

1. Войти в админку и перейти в меню «Столики» (Floor Plan Editor).
2. Нажать «Редактировать планировку».
3. Перетащить существующий столик №1 в другой угол экрана.
4. Нажать «Добавить столик» -> Выбрать круглую форму, указать №4, вместимость 4 человека. Спозиционировать его на холсте.
5. Нажать «Сохранить».
6. Открыть параллельно в другой вкладке панель официанта `/dashboard` — там должен появиться новый столик №4 в указанной позиции, а столик №1 должен переместиться без перезагрузки страницы (live WebSocket обновление).
7. Попробовать удалить столик, за которым сидит гость (активный заказ) — система должна выдать ошибку «Нельзя удалить стол с активным заказом».
