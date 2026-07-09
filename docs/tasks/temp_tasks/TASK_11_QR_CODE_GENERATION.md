# TASK: Генерация QR-кодов для столиков и экспорт в PDF

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 2  
**Автор плана:** Claude Opus 4.6 (Thinking)  
**Рекомендуемый исполнитель:** Claude Sonnet 4.6 (Thinking)

---

## Цель

Реализовать генерацию уникальных QR-кодов для каждого столика ресторана на бэкенде (библиотека ZXing) с возможностью скачивания отдельных QR-кодов и массового экспорта всех QR-кодов ресторана в PDF-документ для печати.

---

## Контекст

- **Зависит от:** TASK_01 (Tables schema), TASK_09 (Table Management)
- **Затрагивает:** Backend + Frontend (Admin section)
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Admin API: `POST /admin/qr/generate`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- **Выжимка из KNOWN_ISSUES:**
  - Tailwind v4: стили через переменные в `globals.css`.
  - `'use client'` для компонентов с интерактивностью.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 2, «Генерация QR-кодов».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/table/QrCodeService.java` — Генерация QR-кодов через ZXing, рендеринг PNG byte[], генерация PDF.
- `backend/src/main/java/com/qtab/api/table/QrCodeController.java` — Эндпоинты: `GET /api/v1/admin/qr/{tableId}` (PNG), `GET /api/v1/admin/qr/restaurant/{restaurantId}/pdf` (PDF всех столиков).

**Frontend:**
- `frontend/src/app/(admin)/qr-generator/page.tsx` — Страница генерации QR-кодов: список столиков с превью QR, кнопки скачивания отдельных и массового PDF.
- `frontend/src/components/admin/QrCodeCard.tsx` — Карточка столика с QR превью.

### Изменить существующие

**Backend:**
- `backend/pom.xml` — Добавить зависимости `com.google.zxing:core` и `com.google.zxing:javase` + `org.apache.pdfbox:pdfbox` для генерации PDF.
- `backend/src/main/java/com/qtab/api/config/SecurityConfig.java` — Добавить `/api/v1/admin/**` → роли `ADMIN`, `MANAGER`.

---

## Точная реализация (Technical Design)

### Backend

#### pom.xml — новые зависимости
```xml
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.3</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.3</version>
</dependency>
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>3.0.4</version>
</dependency>
```

#### QrCodeService.java
```java
@Service
public class QrCodeService {
    private final TableRepository tableRepository;
    private final RestaurantRepository restaurantRepository;
    
    @Value("${app.base-url:https://qtab.by}")
    private String baseUrl;

    // Генерация PNG для одного столика
    public byte[] generateQrCodePng(UUID tableId, int width, int height) {
        // 1. Найти столик + ресторан (slug)
        // 2. URL: {baseUrl}/menu/{restaurantSlug}/{tableId}
        // 3. ZXing: QRCodeWriter → BitMatrix → MatrixToImageWriter → PNG bytes
        // return png bytes
    }
    
    // Генерация PDF со всеми QR для ресторана
    public byte[] generateAllQrCodesPdf(UUID restaurantId) {
        // 1. Получить ресторан (name, slug)
        // 2. Получить все столики ресторана
        // 3. Для каждого столика: generateQrCodePng()
        // 4. PDFBox: создать документ, по 4 QR на страницу (2x2 сетка)
        //    Каждый QR: изображение + подпись «Столик №X»
        // 5. Заголовок на первой странице: «{restaurantName} — QR-коды столиков»
        // return pdf bytes
    }
}
```

#### QrCodeController.java
```java
@RestController
@RequestMapping("/api/v1/admin/qr")
@RequiredArgsConstructor
public class QrCodeController {

    @GetMapping("/{tableId}")
    public ResponseEntity<byte[]> getQrCode(@PathVariable UUID tableId,
            @RequestParam(defaultValue = "300") int size) {
        byte[] png = qrCodeService.generateQrCodePng(tableId, size, size);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=qr-table-" + tableId + ".png")
            .body(png);
    }

    @GetMapping("/restaurant/{restaurantId}/pdf")
    public ResponseEntity<byte[]> getAllQrCodesPdf(@PathVariable UUID restaurantId) {
        byte[] pdf = qrCodeService.generateAllQrCodesPdf(restaurantId);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=qr-codes.pdf")
            .body(pdf);
    }
}
```

### Frontend

#### qr-generator/page.tsx
- Заголовок «Генератор QR-кодов»
- Сетка карточек (2-3 колонки) — по одной на каждый столик
- Каждая карточка: QR-превью (`<img src="/api/v1/admin/qr/{tableId}?size=200">`), номер столика, кнопка «Скачать PNG»
- Общая кнопка сверху: «Скачать все в PDF» → `GET /api/v1/admin/qr/restaurant/{restaurantId}/pdf`
- Индикатор загрузки при генерации PDF

---

## Риски и подводные камни (Edge Cases)

- **ZXing зависимости:** Убедиться, что `javase` модуль ZXing подтягивает все нужные кодеки.
- **PDF генерация:** PDFBox требует аккуратного управления ресурсами (close document). Использовать try-with-resources.
- **Большое количество столиков:** При 100+ столиках PDF может быть большим. Генерировать по 4 QR на страницу.
- **Security:** Admin-эндпоинты защищены JWT с ролью ADMIN/MANAGER.

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После каждого пункта — отметить [x]

### Backend
- [x] 1. Добавить зависимости ZXing и PDFBox в `pom.xml`.
- [x] 2. Создать `QrCodeService.java` — генерация PNG + PDF.
- [x] 3. Создать `QrCodeController.java` — эндпоинты GET PNG и GET PDF.
- [x] 4. Обновить `SecurityConfig.java` — доступ к admin endpoints для ролей ADMIN/MANAGER.
- [x] 5. `.\mvnw.cmd clean compile -q -DskipTests`

### Frontend
- [x] 6. Создать `frontend/src/components/admin/QrCodeCard.tsx`.
- [x] 7. Создать `frontend/src/app/(admin)/qr-generator/page.tsx`.
- [x] 8. `cd frontend && pnpm run build`

---

## ⚠️ Обязательный финальный чек-лист

> [!IMPORTANT]
> **СОХРАНЕНИЕ КОДИРОВКИ UTF-8**: Все файлы — СТРОГО UTF-8.

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни `.\verify-all.ps1`.
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md`.
3. [x] Запусти `.\rotate-backup.ps1`.
4. [x] Синхронизируй `ROADMAP.md` — отметь `[x]`.
5. [x] Перемести задачу в `docs/tasks/temp_tasks/`.
6. [x] Напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Запустить: `docker compose up -d`, `.\mvnw.cmd spring-boot:run`, `cd frontend && pnpm run dev`.
2. Войти как Admin (`admin / password`).
3. Перейти на `/qr-generator`.
4. Должен отобразиться список столиков ресторана с QR-кодами.
5. Нажать «Скачать PNG» на одном столике — должен скачаться файл с QR-кодом (PNG).
6. Отсканировать скачанный QR — должна открыться ссылка `/menu/{slug}/{tableId}`.
7. Нажать «Скачать все в PDF» — должен скачаться PDF с QR-кодами всех столиков (по 4 на страницу).
