# ТЗ: LawTrack — мини-CRM для юриста

> Техническое задание для реализации AI-агентом (Gemini 3.5 Flash High / Claude Code).
> Цель: рабочий прототип за 24 часа, задеплоенный и доступный по ссылке.

---

## 0. Контекст и цель

Делаем мини-CRM для юриста: список клиентов, добавление, смена статуса дела, счётчики по статусам. Это тестовое задание на вакансию AI Product Builder — важна не сложность архитектуры, а скорость сборки, вкус в UX и продуктовое мышление. Поэтому берём знакомый мне стек (Spring Boot + Next.js), но урезаем его до необходимого: без Kafka, без OAuth2, без мультитенантности, без лишней инфраструктуры. Задача — чистый, быстрый, красиво оформленный MVP, который решает сценарий из задания и добавляет пару фич, которые показывают понимание домена юриста.

**Обязательный сценарий (must have):**
1. Юрист заходит на страницу (дашборд).
2. Видит таблицу со списком клиентов.
3. Может добавить клиента (имя, телефон, статус дела).
4. Может изменить статус клиента («Новый» → «В работе» → «Закрыт»).
5. Видит счётчик: сколько клиентов в каждом статусе.

**Бонус из задания:**
- Автоматическое уведомление при добавлении клиента (Telegram).

**Дополнительные фичи от себя (nice to have, если время позволяет — см. приоритеты в разделе 8):**
- Карточка клиента с заметками и хронологией событий (таймлайн действий по делу).
- Поиск и фильтрация клиентов по статусу.
- Дедлайн по делу с визуальной индикацией просрочки.
- Тёмная тема.

---

## 1. Стек технологий

### Backend

- **Java 21**
- **Spring Boot 4**
- **Spring Web MVC** — REST API
- **Spring Data JPA / Hibernate** — работа с БД
- **PostgreSQL 16** — основная БД (в проде), **H2** — опционально для локальной разработки без поднятия Postgres
- **Flyway** — версионирование схемы БД
- **Bean Validation (Jakarta Validation)** — валидация DTO (`@NotBlank`, `@Pattern` для телефона)
- **Lombok** — сокращение boilerplate (`@Data`, `@Builder`)
- **MapStruct** — маппинг Entity ↔ DTO
- **springdoc-openapi (Swagger)** — автодокументация API
- **Telegram Bot API** (через простой `RestTemplate`/`WebClient` вызов `sendMessage`, без отдельной библиотеки — это избыточно для одной функции уведомлений)
- **Spring Boot Actuator** — health-check эндпоинт для проверки живости сервиса

### Frontend

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** — компоненты таблицы, диалогов, форм, бейджей статуса
- **TanStack Query v5** — работа с API, кэширование, инвалидация после мутаций
- **React Hook Form + Zod** — форма добавления клиента с валидацией
- **Recharts** — мини-график/донат для счётчиков по статусам (опционально, см. приоритеты)
- **lucide-react** — иконки
- **date-fns** — форматирование дат

### Инфраструктура и деплой

- **Docker + Docker Compose** — локальный запуск backend + Postgres одной командой
- **Backend деплой:** Render.com (free tier) или Railway.app — оба поддерживают Docker-контейнер Spring Boot бесплатно, деплой за 10-15 минут
- **Frontend деплой:** Vercel — нативная поддержка Next.js, деплой в 2 клика через GitHub
- **GitHub** — публичный или приватный репозиторий с двумя папками: `backend/` и `frontend/`

> **Важно:** не переусложнять деплой. Задача — чтобы работало по ссылке за минимальное время, а не чтобы было "production-grade". Render/Railway free tier достаточно, даже если засыпает после простоя — для демо-проверки это не критично.

---

## 2. Дизайн и UX-концепция

Тема — LegalTech, аудитория — юристы и юрфирмы. Дизайн должен транслировать: надёжность, порядок, доверие, но не быть скучным казённым интерфейсом старых юридических CRM.

### Направление стиля

- **Общее ощущение:** современный SaaS-дашборд, чистый, с воздухом, но не стерильный. Что-то между Linear, Notion и современными LegalTech-продуктами (Clio, PandaDoc) — минимализм с чёткой иерархией, а не перегруженная админка.
- **Цветовая палитра:** тёмно-синий/индиго как основной акцентный цвет (ассоциация с доверием, юриспруденцией, стабильностью) + нейтральные серые для фона и текста. Один яркий акцент (например, тёплый янтарный или зелёный) — только для позитивных состояний (статус «Закрыт», успешные действия).
  - Пример палитры: фон `#FAFAFA` / карточки `#FFFFFF` / текст `#18181B` / акцент `#4F46E5` (indigo-600) / успех `#16A34A` / предупреждение `#D97706`.
  - Тёмная тема (если успеваем): фон `#0A0A0F`, карточки `#141420`, акцент чуть светлее `#6366F1`.
- **Типографика:** без засечек, современный гротеск. Рекомендация — `Inter` или `Geist` (шрифт Vercel, отлично сочетается с Next.js) для интерфейса. Для заголовков можно взять чуть более выразительный вес (600-700), для тела — 400-500.
- **Форма элементов:** скруглённые углы средней величины (8-12px, не капсулы), мягкие тени только на интерактивных элементах (карточки, поповеры), никаких жёстких границ везде подряд.
- **Статус-бейджи:** каждый статус имеет свой цвет и иконку:
  - «Новый» — синий бейдж, иконка `Sparkles` или `Circle`
  - «В работе» — янтарный/оранжевый бейдж, иконка `Clock` или `Loader`
  - «Закрыт» — зелёный бейдж, иконка `CheckCircle2`
- **Микроанимации:** плавные transition при смене статуса (200-300ms), лёгкий fade-in для новых строк таблицы, hover-состояния на строках таблицы и кнопках. Не переусердствовать — анимация должна быть на грани незаметности, а не "вау-эффектом".

### Структура интерфейса (один экран — дашборд)

```
┌─────────────────────────────────────────────────────────┐
│  Header: логотип/название "LawTrack" + кнопка            │
│  "+ Добавить клиента"                                     │
├─────────────────────────────────────────────────────────┤
│  Строка из 3 карточек-счётчиков:                          │
│  [Новых: 5]  [В работе: 12]  [Закрыто: 8]                │
│  (каждая карточка кликабельна — фильтрует таблицу)         │
├─────────────────────────────────────────────────────────┤
│  Панель фильтров/поиска (поиск по имени, фильтр статуса)  │
├─────────────────────────────────────────────────────────┤
│  Таблица клиентов:                                         │
│  Имя | Телефон | Статус (dropdown/select inline) | Дата   │
│  добавления | Действия                                     │
├─────────────────────────────────────────────────────────┤
│  (при клике на строку — открывается side panel/drawer      │
│  с деталями клиента, если есть время на доп. фичу)          │
└─────────────────────────────────────────────────────────┘
```

### Референсная логика UX

- Смена статуса клиента — не отдельная страница, а inline-действие: клик на бейдж статуса в таблице открывает маленький dropdown с тремя опциями, выбор сразу сохраняется (optimistic update через TanStack Query).
- Добавление клиента — модальное окно (shadcn `Dialog`), не отдельная страница — это быстрее для юриста и понятнее в демо.
- Счётчики статусов должны обновляться мгновенно (реактивно) при любом изменении — это первое, что должно "вау"-эффектом сработать при демонстрации.

---

## 3. Backend: детальная структура

### 3.1 Структура проекта

```
backend/
├── src/main/java/com/lawtrack/
│   ├── LawtrackApplication.java
│   ├── config/
│   │   ├── CorsConfig.java              # разрешить запросы с Vercel-домена фронта
│   │   └── RestTemplateConfig.java      # для вызова Telegram API
│   ├── controller/
│   │   ├── ClientController.java        # CRUD клиентов
│   │   └── StatsController.java         # счётчики по статусам
│   ├── dto/
│   │   ├── request/
│   │   │   ├── CreateClientRequest.java
│   │   │   └── UpdateStatusRequest.java
│   │   └── response/
│   │       ├── ClientResponse.java
│   │       └── StatusCountResponse.java
│   ├── entity/
│   │   ├── Client.java
│   │   └── ClientStatus.java            # enum: NEW, IN_PROGRESS, CLOSED
│   ├── repository/
│   │   └── ClientRepository.java
│   ├── service/
│   │   ├── ClientService.java
│   │   └── TelegramNotificationService.java
│   ├── mapper/
│   │   └── ClientMapper.java            # MapStruct
│   └── exception/
│       ├── ClientNotFoundException.java
│       └── GlobalExceptionHandler.java  # @ControllerAdvice
├── src/main/resources/
│   ├── application.yml
│   ├── application-local.yml
│   └── db/migration/
│       └── V1__init_schema.sql
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

### 3.2 Схема БД (Flyway `V1__init_schema.sql`)

```sql
CREATE TABLE clients (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'NEW',
                    -- NEW, IN_PROGRESS, CLOSED
    case_description TEXT,               -- опционально: суть дела
    deadline        DATE,                -- опционально: дедлайн по делу (доп. фича)
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);
```

Если делаем доп. фичу с таймлайном событий по клиенту (см. раздел 8, приоритет P2):

```sql
CREATE TABLE client_events (
    id          BIGSERIAL PRIMARY KEY,
    client_id   BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL,     -- STATUS_CHANGED, NOTE_ADDED, CREATED
    description TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_events_client_id ON client_events(client_id);
```

### 3.3 Entity

```java
@Entity
@Table(name = "clients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ClientStatus status = ClientStatus.NEW;

    @Column(name = "case_description", columnDefinition = "TEXT")
    private String caseDescription;

    private LocalDate deadline;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

```java
public enum ClientStatus {
    NEW("Новый"),
    IN_PROGRESS("В работе"),
    CLOSED("Закрыт");

    private final String displayName;

    ClientStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
```

### 3.4 REST API — контракт эндпоинтов

| Метод | Путь | Описание | Тело запроса | Ответ |
|---|---|---|---|---|
| GET | `/api/clients` | Список всех клиентов, опционально с фильтром | Query: `?status=IN_PROGRESS&search=Иван` | `List<ClientResponse>` |
| POST | `/api/clients` | Создать клиента | `CreateClientRequest` | `ClientResponse` (201) |
| PATCH | `/api/clients/{id}/status` | Изменить статус клиента | `UpdateStatusRequest { status }` | `ClientResponse` |
| GET | `/api/clients/{id}` | Получить одного клиента (для карточки) | — | `ClientResponse` |
| DELETE | `/api/clients/{id}` | Удалить клиента (доп. фича) | — | 204 |
| GET | `/api/stats/status-counts` | Счётчики по статусам | — | `StatusCountResponse` |

**DTO:**

```java
public record CreateClientRequest(
    @NotBlank(message = "Имя обязательно") String name,
    @NotBlank(message = "Телефон обязателен")
    @Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Некорректный формат телефона")
    String phone,
    String caseDescription,
    LocalDate deadline
) {}

public record UpdateStatusRequest(
    @NotNull ClientStatus status
) {}

public record ClientResponse(
    Long id,
    String name,
    String phone,
    ClientStatus status,
    String statusDisplayName,
    String caseDescription,
    LocalDate deadline,
    LocalDateTime createdAt
) {}

public record StatusCountResponse(
    long newCount,
    long inProgressCount,
    long closedCount,
    long total
) {}
```

**Пример GlobalExceptionHandler:**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClientNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ClientNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }
}
```

### 3.5 Telegram-уведомления (бонус-фича из задания)

```java
@Service
@Slf4j
public class TelegramNotificationService {

    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.chat.id}")
    private String chatId;

    public void notifyNewClient(Client client) {
        String text = String.format(
            "🆕 *Новый клиент добавлен*\n\n" +
            "👤 %s\n📞 %s\n📋 Статус: %s",
            client.getName(), client.getPhone(), client.getStatus().getDisplayName()
        );
        sendMessage(text);
    }

    public void notifyStatusChanged(Client client, ClientStatus oldStatus) {
        String text = String.format(
            "🔄 *Статус изменён*\n\n👤 %s\n%s → %s",
            client.getName(), oldStatus.getDisplayName(), client.getStatus().getDisplayName()
        );
        sendMessage(text);
    }

    private void sendMessage(String text) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "Markdown"
            );
            restTemplate.postForEntity(url, body, String.class);
        } catch (Exception e) {
            log.warn("Не удалось отправить Telegram-уведомление: {}", e.getMessage());
            // намеренно не бросаем исключение дальше — уведомление не должно ронять основной флоу
        }
    }
}
```

Вызывать асинхронно (`@Async` на методе сервиса или через `CompletableFuture.runAsync`), чтобы отправка в Telegram не задерживала ответ API клиенту.

### 3.6 application.yml (пример)

```yaml
spring:
  application:
    name: lawtrack-backend
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:lawtrack}
    username: ${DB_USER:lawtrack_user}
    password: ${DB_PASSWORD:lawtrack_pass}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true

telegram:
  bot:
    token: ${TELEGRAM_BOT_TOKEN:}
  chat:
    id: ${TELEGRAM_CHAT_ID:}

cors:
  allowed-origins: ${FRONTEND_URL:http://localhost:3000}

server:
  port: ${PORT:8080}
```

---

## 4. Frontend: детальная структура

### 4.1 Структура проекта

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # главный дашборд
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn компоненты (button, dialog, table, badge, select)
│   ├── client-table.tsx            # таблица клиентов
│   ├── client-row.tsx              # строка таблицы с inline-сменой статуса
│   ├── add-client-dialog.tsx       # модалка добавления клиента
│   ├── status-badge.tsx            # переиспользуемый бейдж статуса
│   ├── stats-cards.tsx             # 3 карточки-счётчика сверху
│   ├── search-filter-bar.tsx       # поиск + фильтр по статусу
│   └── client-details-drawer.tsx   # side panel с деталями (доп. фича)
├── lib/
│   ├── api.ts                      # функции запросов к backend
│   ├── types.ts                    # TS-типы, зеркалящие backend DTO
│   └── query-client-provider.tsx   # обёртка TanStack Query
├── hooks/
│   ├── use-clients.ts              # useQuery для списка клиентов
│   ├── use-create-client.ts        # useMutation
│   └── use-update-status.ts        # useMutation с optimistic update
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### 4.2 Ключевые типы (`lib/types.ts`)

```typescript
export type ClientStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

export interface Client {
  id: number;
  name: string;
  phone: string;
  status: ClientStatus;
  statusDisplayName: string;
  caseDescription?: string;
  deadline?: string;
  createdAt: string;
}

export interface StatusCounts {
  newCount: number;
  inProgressCount: number;
  closedCount: number;
  total: number;
}

export interface CreateClientPayload {
  name: string;
  phone: string;
  caseDescription?: string;
  deadline?: string;
}
```

### 4.3 API-слой (`lib/api.ts`)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchClients(params?: { status?: string; search?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  const res = await fetch(`${API_URL}/api/clients?${query}`);
  if (!res.ok) throw new Error("Не удалось загрузить клиентов");
  return res.json() as Promise<Client[]>;
}

export async function createClient(payload: CreateClientPayload) {
  const res = await fetch(`${API_URL}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Не удалось создать клиента");
  return res.json() as Promise<Client>;
}

export async function updateClientStatus(id: number, status: ClientStatus) {
  const res = await fetch(`${API_URL}/api/clients/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Не удалось изменить статус");
  return res.json() as Promise<Client>;
}

export async function fetchStatusCounts() {
  const res = await fetch(`${API_URL}/api/stats/status-counts`);
  return res.json() as Promise<StatusCounts>;
}
```

### 4.4 Пример хука с optimistic update (`hooks/use-update-status.ts`)

```typescript
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ClientStatus }) =>
      updateClientStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });
      const previous = queryClient.getQueryData<Client[]>(["clients"]);
      queryClient.setQueryData<Client[]>(["clients"], (old) =>
        old?.map((c) => (c.id === id ? { ...c, status } : c))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["clients"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
```

### 4.5 Форма добавления клиента — валидация (Zod)

```typescript
const clientSchema = z.object({
  name: z.string().min(2, "Введите имя").max(150),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, "Некорректный номер телефона"),
  caseDescription: z.string().optional(),
  deadline: z.string().optional(),
});
```

Использовать `react-hook-form` с `zodResolver` внутри shadcn `Dialog` + `Form` компонентов.

---

## 5. Docker и локальный запуск

### `docker-compose.yml` (в корне backend или отдельно для полного стека)

```yaml
services:
  backend:
    build: ./backend
    environment:
      DB_HOST: postgres
      DB_NAME: lawtrack
      DB_USER: lawtrack_user
      DB_PASSWORD: lawtrack_pass
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lawtrack
      POSTGRES_USER: lawtrack_user
      POSTGRES_PASSWORD: lawtrack_pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lawtrack_user"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## 6. Деплой — пошагово

### Backend (Render.com)

1. Запушить `backend/` в GitHub-репозиторий.
2. На Render.com → New → Web Service → подключить репозиторий.
3. Выбрать "Docker" как окружение, Render сам найдёт `Dockerfile`.
4. Добавить environment variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `FRONTEND_URL`.
5. Добавить PostgreSQL инстанс через Render → New → PostgreSQL (free tier), скопировать данные подключения в переменные backend.
6. Деплой запустится автоматически, будет доступен URL вида `https://lawtrack-backend.onrender.com`.

### Frontend (Vercel)

1. Запушить `frontend/` в тот же или отдельный репозиторий.
2. На vercel.com → Import Project → выбрать репозиторий, указать root directory `frontend/`, если монорепо.
3. Добавить environment variable `NEXT_PUBLIC_API_URL` = URL backend с Render.
4. Deploy — Vercel сам определит Next.js и настроит билд.
5. Получаем рабочую ссылку вида `https://lawtrack.vercel.app`.

### Настройка Telegram-бота (для бонусной фичи)

1. Написать `@BotFather` в Telegram → `/newbot` → получить токен.
2. Написать боту `/start` от своего аккаунта.
3. Получить свой `chat_id` через `https://api.telegram.org/bot<TOKEN>/getUpdates`.
4. Прописать `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в переменные окружения backend.

---

## 7. Что положить в README репозитория

Обязательно составить короткий README с разделами:
- Что это и какой сценарий реализует.
- Стек и почему выбран именно такой (см. пункт ниже — заготовка формулировки).
- Как запустить локально (`docker compose up`).
- Ссылки на live-демо (frontend) и backend API (`/swagger-ui.html`).
- Что сделано AI, что руками (для сопроводительного письма и по заданию).

**Заготовка формулировки "почему такой стек" для отклика:**
> Взял тот же стек, что использую во всех текущих продакшн-проектах (Spring Boot 4 + Next.js), чтобы показать не "туториальный" уровень, а реальный рабочий процесс — как я реально собираю продукт от API до интерфейса. Специально не стал усложнять архитектуру под масштаб — никакого лишнего в тестовом задании, только то, что нужно для сценария плюс пара фич, которые бы реально пригодились юристу.

---

## 8. Приоритизация фич (если не хватает времени на всё)

**P0 — обязательно, без этого сценарий не засчитан:**
- Таблица клиентов, добавление, смена статуса, счётчики. Деплой backend + frontend.

**P1 — сильно поднимает впечатление, делать если есть время:**
- Telegram-уведомление при добавлении клиента (это прямой бонус из задания).
- Поиск/фильтр по статусу в таблице.
- Хороший дизайн по разделу 2 — это не опция, это часть P0 фактически, т.к. вакансия про "продуктолога с AI", а не только про код.

**P2 — если время осталось, для впечатления:**
- Side panel с деталями клиента и заметками.
- Дедлайн по делу с цветовой индикацией просрочки (красный бейдж, если дедлайн прошёл, а статус не «Закрыт»).
- Тёмная тема (toggle в шапке).
- Мини-график распределения статусов (Recharts donut chart) рядом со счётчиками.

**Не делать вообще (осознанно урезанный scope):**
- Авторизация/логин — не входит в сценарий, юрист просто заходит на страницу.
- Мультипользовательность — один юрист, один список клиентов.
- Kafka, Redis, сложная асинхронность — избыточно для объёма данных в тестовом.
- Тесты (unit/e2e) — в реальном проекте обязательны, но для 24-часового тестового расставляем приоритет на рабочий функционал и дизайн.

---

## 9. Чеклист перед сдачей

- [ ] Backend задеплоен, `/api/clients` отвечает
- [ ] Frontend задеплоен, открывается по ссылке без ошибок в консоли
- [ ] Можно добавить клиента через форму
- [ ] Можно изменить статус клиента, счётчики обновляются мгновенно
- [ ] Telegram-уведомление приходит при добавлении клиента
- [ ] README с описанием стека и инструкцией запуска
- [ ] Репозиторий публичный или доступ открыт проверяющим
- [ ] Записан краткий лог: что сделано AI, что руками, время начала/окончания работы
