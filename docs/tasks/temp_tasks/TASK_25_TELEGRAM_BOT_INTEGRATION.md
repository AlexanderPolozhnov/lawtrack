# TASK: Интеграция с Telegram-ботом для алертов и сводки продаж (Telegram Bot API)

**Дата создания:** 2026-07-07  
**Приоритет:** Medium  
**Фаза:** Phase 6  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.5 Flash (High)

---

## Цель

Реализовать интеграцию бэкенда с Telegram Bot API: отправка мгновенных алертов сотрудникам в групповой чат ресторана (о вызовах официанта, запросах счета, новых заказах) и обработка входящих команд бота (команды `/start` для получения Chat ID группы и `/status` для выдачи финансовой сводки продаж за текущие сутки).

---

## Контекст

- **Зависит от:** TASK_06 (WebSocket & Orders), TASK_09 (Floor Map), TASK_10 (Payments)
- **Затрагивает:** Backend only
- **Связанный контракт:** —

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила (внешние интеграции).
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 6, «Telegram-бот для владельцев (дневные сводки и оперативные алерты)».
- `docs/TELEGRAM_BOT_GUIDE.md` (или аналогичный) — настройки Telegram Bot в YAML.

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/notification/TelegramBotService.java` — Сервис отправки сообщений в Telegram и лонг-поллинга (или Webhook) входящих команд.
- `backend/src/main/java/com/qtab/api/notification/dto/TelegramSendMessageRequest.java` — DTO для отправки сообщений.

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/table/TableService.java` — При вызове официанта гостем отправлять мгновенный алерт в Telegram.
- `backend/src/main/java/com/qtab/api/order/OrderService.java` — При создании заказа гостем и при запросе счета отправлять уведомления в Telegram.
- `backend/src/main/java/com/qtab/api/payment/PaymentService.java` — При фиксации оплат отправлять сообщение в Telegram с указанием метода оплаты.

---

## Точная реализация (Technical Design)

### 1. Telegram Service (TelegramBotService.java)
Реализуем отправку сообщений через `RestTemplate` POST-запросом к Telegram API.
Конфигурация токена берется из `telegram.bot.token`, а ID чата — из базы данных ресторана (добавим поле `telegram_chat_id` в сущность `Restaurant`, в миграции или в дефолтной структуре, либо будем использовать `telegram.admin.chat-id` как глобальный дефолт). У нас в `V1__init_schema.sql` в таблице `restaurants` уже ЕСТЬ колонка `telegram_chat_id` (или в spec, давай проверим — в `V1` ее может не быть, но в сущности Restaurant можно добавить или использовать `telegram.admin.chat-id` из YAML).

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramBotService {
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.admin.chat-id:}")
    private String defaultChatId;

    public void sendMessage(String chatId, String text) {
        if (botToken == null || botToken.isBlank() || "dummy_token_for_local_tests".equals(botToken)) {
            log.warn("Telegram Bot token is not configured. Msg: {}", text);
            return;
        }
        
        String targetChatId = (chatId != null && !chatId.isBlank()) ? chatId : defaultChatId;
        if (targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram Chat ID is not configured. Cannot send msg: {}", text);
            return;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        Map<String, String> body = Map.of(
            "chat_id", targetChatId,
            "text", text,
            "parse_mode", "HTML"
        );
        
        try {
            restTemplate.postForObject(url, body, String.class);
        } catch (Exception e) {
            log.error("Failed to send Telegram message", e);
        }
    }
}
```

### 2. Лонг-поллинг входящих команд
Для локальных тестов запустим фоновый поток (через `@Scheduled` каждые 5 секунд), который опрашивает `https://api.telegram.org/bot{token}/getUpdates?offset={lastUpdateId}`.
При получении команд:
- `/start` — бот отвечает: `Привет! ID этого чата: <code>{chatId}</code>. Пропишите этот ID в настройках ресторана QTab для получения уведомлений.`
- `/status` — бот считает выручку за сегодня:
  - Ищет заказы ресторана, по которому привязан данный `chatId`.
  - Считает сумму оплат, количество чеков, активные столики.
  - Возвращает красивую сводку:
    `📊 <b>Сводка продаж за сегодня:</b> \n • Выручка: <b>{revenue} BYN</b> \n • Оплачено чеков: <b>{ordersCount}</b> \n • Занятых столов: <b>{occupiedTables}</b>`

### 3. Триггеры алертов

Внедрить `TelegramBotService` в сервисы бэкенда:
- **Вызов официанта** (`OrderService.callWaiter` или `TableService`):
  `🔔 <b>Вызов официанта!</b>\nСтолик №<b>{tableNumber}</b> просит подойти.`
- **Запрос счета** (`OrderService.requestBill`):
  `💵 <b>Запрос счета!</b>\nСтолик №<b>{tableNumber}</b> просит расчет.\nСумма к оплате: <b>{total} BYN</b>`
- **Новый заказ** (`OrderService.createOrder`):
  `🛍 <b>Новый заказ!</b>\nСтолик №<b>{tableNumber}</b> отправил заказ на сумму <b>{total} BYN</b>.\nКомментарий гостя: <i>{comment}</i>`

---

## Риски и подводные камни (Edge Cases)

- **Лимиты Telegram API (Rate Limits):** Telegram разрешает слать не более 30 сообщений в секунду в один чат. Для обычного ресторана этого лимита более чем достаточно, но в коде все равно обернуть отправку в try-catch, чтобы ошибки API не ломали основную транзакцию заказа (отправлять асинхронно или в блоке try-catch).
- **Разделение чат-айди по ресторанам:** Если в системе много ресторанов (SaaS), бот должен понимать, от какого чата пришел запрос `/status` (сравнивать `chatId` in `restaurants` table).

---

## Порядок реализации для агента

### Backend
- [x] 1. Добавить поле `telegramChatId` (String) в сущность `Restaurant.java` (если еще нет) и создать SQL-миграцию `V12__add_restaurant_telegram_field.sql` для добавления колонки `telegram_chat_id` в БД.
- [x] 2. Создать `TelegramBotService.java` с методами `sendMessage` и scheduled-методом `pollUpdates` для чтения входящих команд.
- [x] 3. Обновить `OrderService.java` для вызова алертов о новом заказе и запросе счета.
- [x] 4. Обновить `TableService.java` для вызова алертов о вызове официанта к столу.
- [x] 5. Обновить `PaymentService.java` для отправки алертов о зафиксированных оплатах.
- [x] 6. Написать Unit-тест на генерацию сообщений алертов.
- [x] 7. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

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

1. Создать Telegram-бота через `@BotFather`, получить токен.
2. Прописать токен в `.env.local` бэкенда (`TELEGRAM_BOT_TOKEN=...`).
3. Добавить бота в тестовую группу Telegram, отправить сообщение `/start`. Бот должен ответить и прислать ID группы (например, `-100123456789`).
4. В базе данных прописать этот `telegram_chat_id` в запись демо-ресторана `qtab-cafe`.
5. Зайти на гостевую страницу, нажать «Вызвать официанта». В группу Telegram должен прийти алерт с номером столика.
6. Сделать заказ — в группу должен прийти алерт с перечнем заказа и итоговой суммой.
7. Отправить боту в чат команду `/status` — бот должен ответить сообщением с финансовой сводкой за сегодня.
