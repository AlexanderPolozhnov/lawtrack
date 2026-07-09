# TASK: TASK_03_TELEGRAM_NOTIFICATIONS (Интеграция с Telegram Bot API для уведомлений)

**Дата создания:** 2026-07-09  
**Приоритет:** Medium  
**Фаза:** Phase 2  
**Автор плана:** Gemini 3.5 Flash (High)
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Интегрирована отправка асинхронных уведомлений в Telegram при создании клиента и при изменении его статуса с использованием Telegram Bot API без внешних тяжелых библиотек.

---

## Контекст

- **Зависит от:** TASK_02_CLIENTS_BACKEND
- **Затрагивает:** Backend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md

## Документация для обязательного ознакомления перед началом:
- `TZ_LawTrack_CRM.md` — раздел 3.5 (Telegram-уведомления) и раздел 6 (настройка бота).
- `docs/TELEGRAM_BOT_GUIDE.md` и `docs/TELEGRAM_BOT_SETUP.md` (если присутствуют).

---

## Затронутые файлы

### Создать новые
- `backend/src/main/java/com/lawtrack/config/RestTemplateConfig.java` — конфигурация RestTemplate.
- `backend/src/main/java/com/lawtrack/service/TelegramNotificationService.java` — сервис отправки уведомлений.

### Изменить существующие
- `backend/src/main/java/com/lawtrack/service/ClientService.java` — вызов уведомлений при создании и смене статуса.
- `backend/src/main/resources/application.yml` — конфигурационные свойства Telegram.
- `backend/src/main/java/com/lawtrack/LawtrackApplication.java` — добавить `@EnableAsync` для асинхронной работы.

---

## Точная реализация (Technical Design)

### Асинхронность
Добавить `@EnableAsync` над `LawtrackApplication` классом, чтобы включить поддержку асинхронности. В `TelegramNotificationService` повесить аннотацию `@Async` на методы отправки.

### RestTemplate Config
```java
@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### Telegram Notification Service
Реализовать методы:
- `public void notifyNewClient(Client client)`: Отправка сообщения формата `🆕 *Новый клиент добавлен*\n\n👤 %s\n📞 %s\n📋 Статус: %s`.
- `public void notifyStatusChanged(Client client, ClientStatus oldStatus)`: Отправка сообщения формата `🔄 *Статус изменён*\n\n👤 %s\n%s → %s`.
- Спецификация URL: `https://api.telegram.org/bot<token>/sendMessage`.
- Передавать `chat_id`, `text`, `parse_mode="Markdown"`.
- Добавить обработку исключений `try-catch`, чтобы падение Telegram API не ломало основную транзакцию создания клиента (просто логировать `log.warn("Не удалось отправить Telegram-уведомление: {}", e.getMessage())`).
- Если `token` или `chatId` пусты/отсутствуют — пропускать отправку с логом INFO (fallback для локального запуска без бота).

---

## Риски и подводные камни (Edge Cases)

- **Блокирующий ввод/вывод:** Асинхронность `@Async` критически важна, чтобы HTTP-запросы к серверам Telegram не задерживали ответ REST API клиенту.
- **Специальные символы:** Markdown в Telegram чувствителен к экранированию символов (например, знаков `_`, `*`, `[`). Убедиться, что имя или телефон не ломают разметку Telegram.

---

## Порядок реализации для агента

### Backend
- [x] 1. Добавить `@EnableAsync` в `LawtrackApplication.java`.
- [x] 2. Добавить `RestTemplateConfig.java` с объявлением бина `RestTemplate`.
- [x] 3. Обновить `application.yml`, добавив структуру:
  ```yaml
  telegram:
    bot:
      token: ${TELEGRAM_BOT_TOKEN:}
    chat:
      id: ${TELEGRAM_CHAT_ID:}
  ```
- [x] 4. Создать `TelegramNotificationService.java` с аннотацией `@Service`, инжектированием `@Value` токена и чата, а также `@Async` методами `notifyNewClient` и `notifyStatusChanged`.
- [x] 5. Изменить `ClientService.java`: внедрить `TelegramNotificationService` и вызвать `notifyNewClient` после сохранения нового клиента, а также `notifyStatusChanged` при успешном изменении статуса.
- [x] 6. Написать Unit-тест для `TelegramNotificationService` с использованием MockRestServiceServer для симуляции Telegram API.
- [x] 7. Проверить сборку бэкенда: `cd backend && .\mvnw.cmd clean test`.

---

## ⚠️ Обязательный финальный чек-лист

ОБЯЗАТЕЛЬНО перед завершением задачи:
1. [x] Выполни локальную валидацию `.\verify-all.ps1` in корне проекта. Если скрипт выдает ошибки — исправляй их!
2. [x] Синхронизируй `docs/CONTEXT_BACKUP.md` — добавь блок `## Update YYYY-MM-DD: [Суть]` в самый конец файла. Запись должна быть СТРОГО в UTF-8.
3. [x] Запусти `.\rotate-backup.ps1` для очистки старых логов.
4. [x] Синхронизируй `ROADMAP.md` — отметь выполненное `[x]` для Telegram-уведомлений.
5. [x] Перемести файл этой задачи из `docs/tasks/new_tasks/` в `docs/tasks/temp_tasks/`.
6. [x] Протестируй фичу руками и напиши гайд ниже.

---

## Ручная проверка (Гайд для пользователя/разработчика)

1. Создать Telegram бота через `@BotFather`, получить токен. Начать диалог с ботом. Получить свой `chat_id` (например, через `getUpdates`).
2. В файле `.env` прописать:
   ```env
   TELEGRAM_BOT_TOKEN=ваш_токен
   TELEGRAM_CHAT_ID=ваш_chat_id
   ```
3. Запустить приложение. Добавить нового клиента через REST-запрос.
4. Убедиться, что в Telegram пришло сообщение о создании клиента.
5. Изменить статус клиента. Убедиться, что пришло сообщение об изменении статуса.
