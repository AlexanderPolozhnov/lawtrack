# TASK: Исправление бесконечной сессии, CORS и конфликта Telegram Bot при деплое

**Дата создания:** 2026-07-09  
**Приоритет:** High  
**Фаза:** Phase 4 (Integration & Polish)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Устранить три бага, выявленных на продакшене:
1. **Бесконечный ререндеринг и тосты:** при переходе по ссылке стола бесконечно крутится восстановление сессии и выводятся тосты.
2. **CORS Блокировка:** при переходе с мобильного устройства запросы блокируются CORS, так как заголовок `X-Session-Id` отсутствует в разрешенных CORS заголовках бэкенда.
3. **Telegram 409 Conflict:** во время деплоя на Render запускается несколько инстансов, что вызывает конфликт `getUpdates` и забивает логи ошибками `ERROR`.

---

## Затронутые файлы

### Изменить существующие

#### 1. backend/src/main/java/com/qtab/api/config/SecurityConfig.java
- Обновить список разрешенных заголовков CORS. Добавить туда `"X-Session-Id"` и `"X-Restaurant-Id"`.
```java
configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "X-Session-Id", "X-Restaurant-Id"));
```

#### 2. frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx
- В начале `useEffect` для инициализации сессии `initSession()` добавить прерывание, если сессия уже успешно инициализирована/восстановлена в рамках текущего монтирования компонента:
```typescript
useEffect(() => {
  if (!mounted) return;
  if (status === 'success') return; // Предотвращает бесконечный цикл при обновлении Zustand стейта
  ...
```

#### 3. backend/src/main/java/com/qtab/api/notification/TelegramBotService.java
- Перехватывать `HttpClientErrorException` со статусом `409` (Conflict) и логировать её как `WARN` вместо `ERROR`, чтобы не засорять логи деплоя на Render при роллинг-апдейтах.
```java
} catch (org.springframework.web.client.HttpClientErrorException e) {
    if (e.getStatusCode().value() == 409) {
        log.warn("Telegram polling conflict (likely multiple instances running during deploy): {}", e.getMessage());
    } else {
        log.error("HTTP error polling Telegram updates: {}", e.getMessage());
    }
} catch (Exception e) {
    log.error("Error polling Telegram updates: {}", e.getMessage());
}
```

---

## Порядок реализации для агента

> ⚠️ После каждого Java-класса — `.\mvnw.cmd clean compile -q -DskipTests`
> ⚠️ После изменения фронтенда — `cd frontend && pnpm run build`
> ⚠️ Отмечайте [x] по мере выполнения

- [x] 1. Добавить `"X-Session-Id"` и `"X-Restaurant-Id"` в CORS заголовки в `SecurityConfig.java`.
- [x] 2. Скомпилировать бэкенд и проверить компиляцию: `.\mvnw.cmd clean compile -q -DskipTests`.
- [x] 3. Добавить `if (status === 'success') return;` в `useEffect` инициализации сессии в `frontend/src/app/(guest)/menu/[restaurantSlug]/[tableId]/page.tsx`.
- [x] 4. Выполнить сборку фронтенда `pnpm run build` для проверки отсутствия ошибок.
- [x] 5. Обработать `HttpClientErrorException` с кодом 409 в `TelegramBotService.java`, логируя как `WARN`.
- [x] 6. Скомпилировать бэкенд заново.
- [x] 7. Запустить полную верификацию `.\verify-all.ps1`.
- [x] 8. Переместить файл плана из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
- [x] 9. Обновить `docs/CONTEXT_BACKUP.md`.
- [x] 10. Запустить `.\rotate-backup.ps1`.
