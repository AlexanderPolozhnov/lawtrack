# TASK: ИИ-анализ тональности отзывов и умные рекомендации блюд (AI Sentiment & Recommendations)

**Дата создания:** 2026-07-07  
**Приоритет:** High  
**Фаза:** Phase 4  
**Автор плана:** Claude 3.5 Sonnet / Gemini 3.5 Flash (High)  
**Рекомендуемый исполнитель:** Gemini 3.1 Pro (High)

---

## Цель

Интегрировать бэкенд с Google Gemini API через нативный HTTP-клиент, реализовать автоматический анализ тональности (Sentiment Analysis) отзывов гостей при сохранении в БД и умные рекомендации сопутствующих блюд (Upsell) в корзине гостя на основе текущего содержимого корзины.

---

## Контекст

- **Зависит от:** TASK_05 (Menu PWA), TASK_17 (Reviews & Ratings)
- **Затрагивает:** Backend + Frontend
- **Связанный контракт:** docs/FRONTEND_BACKEND_CONTRACT.md — Guest API: `POST /menu/recommendations`

## Документация для обязательного ознакомления перед началом:
- `GEMINI.md` — архитектурные правила.
- `docs/CONTEXT_BACKUP.md` — текущий статус.
- `ROADMAP.md` — Фаза 4, «AI sentiment analysis отзывов» и «AI-рекомендации (upsell)».

---

## Затронутые файлы

### Создать новые

**Backend:**
- `backend/src/main/java/com/qtab/api/analytics/GeminiClient.java` — HTTP-клиент для работы с Google Gemini API (через `WebClient` или `RestTemplate`) с использованием API ключа из переменных окружения.
- `backend/src/main/java/com/qtab/api/analytics/dto/GeminiRequest.java` — DTO для запроса к Gemini API.
- `backend/src/main/java/com/qtab/api/analytics/dto/GeminiResponse.java` — DTO для ответа от Gemini API.
- `backend/src/main/java/com/qtab/api/menu/dto/RecommendationRequest.java` — DTO запроса рекомендаций от фронтенда (список UUID в корзине).

### Изменить существующие

**Backend:**
- `backend/src/main/java/com/qtab/api/review/ReviewService.java` — При создании отзыва вызывать `GeminiClient` для определения тональности (`sentiment`) комментария и записывать результат в сущность перед сохранением в БД.
- `backend/src/main/java/com/qtab/api/menu/MenuController.java` — Добавить публичный эндпоинт `POST /api/v1/menu/recommendations` для выдачи рекомендаций.
- `backend/src/main/java/com/qtab/api/menu/MenuService.java` — Добавить метод `getRecommendations(UUID restaurantId, List<UUID> cartItemIds)` с отправкой запроса в Gemini и маппингом рекомендуемых ID блюд в список DTO-ответов.

**Frontend:**
- `frontend/src/components/guest/CartDrawer.tsx` — Интегрировать блок «Рекомендуем попробовать» внизу корзины. Запрашивать рекомендации при изменении состава корзины (с дебаунсом), отображать слайдер карточек блюд с возможностью добавить их в корзину в один клик.
- `frontend/src/app/(admin)/reviews/page.tsx` — Отображать цветные бейджи тональности отзыва (`POSITIVE` — зеленый, `NEUTRAL` — серый, `NEGATIVE` — красный) и добавить фильтрацию отзывов по тональности.

---

## Точная реализация (Technical Design)

### 1. Интеграция с Gemini API (REST)

Мы отправляем прямой POST-запрос на Google Gemini API без использования тяжелых SDK.
API URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
Переменная окружения `GEMINI_API_KEY` должна быть добавлена на бэкенде.

#### GeminiClient.java
```java
@Component
@Slf4j
public class GeminiClient {
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String modelName;

    public String generateContent(String systemInstruction, String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key is not set! Fallback to default response.");
            return "";
        }
        
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

        try {
            Map<String, Object> requestBody = new HashMap<>();
            
            if (systemInstruction != null && !systemInstruction.isBlank()) {
                requestBody.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
            }
            
            requestBody.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error communicating with Gemini API", e);
        }
        return "";
    }
}
```

### 2. Sentiment Analysis отзывов
В `ReviewService.java` перед сохранением отзыва:
- Если поле `comment` не пустое, вызываем `GeminiClient.generateContent()`:
  - System instruction: `You are an AI that classifies customer reviews. Classify the review sentiment into exactly one of these categories: POSITIVE, NEUTRAL, or NEGATIVE. Respond with ONLY the category name word.`
  - Prompt: `Review text: "[текст комментария]"`
- Полученную строку очищаем (`.trim().toUpperCase()`) и, если она соответствует enum-значениям, записываем в поле `sentiment` Entity.

### 3. AI Recommendations (Upsell)
В `MenuService.java`:
- Принимаем `List<UUID> cartItemIds`.
- Загружаем все активные блюда ресторана.
- Названия блюд в корзине форматируем в список. Названия блюд всего меню (только ID + Название + Цена) форматируем во второй список.
- Вызываем `GeminiClient`:
  - System instruction: `You are a professional restaurant waiter. Recommend exactly 2 items from the menu that pair perfectly with the items in the guest's cart to upsell and increase average bill size. Respond ONLY with a JSON object containing the recommended menu item IDs: {"recommendedIds": ["id1", "id2"]}`.
  - Prompt: `Cart items: [корзина]. Available Menu: [меню].`
- Парсим JSON ответа, находим сущности `MenuItem` по полученным ID и возвращаем список `MenuItemResponse` (не более 2 штук).

---

## Риски и подводные камни (Edge Cases)

- **Отсутствие API ключа:** Если API ключ не задан в переменных окружения, сервис должен работать без сбоев (возвращать `NEUTRAL` для sentiment, и выдавать дефолтные рекомендации, например, 2 самых популярных блюда из меню).
- **Невалидный JSON от ИИ:** Модель может иногда вернуть текст с разметкой markdown (например, ```json ... ```). Перед парсингом JSON очищайте строку от лишних символов и триггеров markdown.
- **Таймауты запросов:** Запросы к ИИ могут длиться 1-3 секунды. Sentiment analysis лучше делать асинхронно (`@Async`) в фоновом режиме, чтобы гость не ждал ответа API при отправке отзыва. Запросы рекомендаций в корзине делать на фронтенде с дебаунсом при изменении состава корзины.

---

## Порядок реализации для агента

### Backend
- [x] 1. Создать `GeminiClient.java` с обработкой fallback (если ключ пустой).
- [x] 2. Реализовать асинхронный метод анализа тональности отзывов в `ReviewService.java` с помощью `@Async` (включить `@EnableAsync` в главном классе бэкенда).
- [x] 3. Реализовать логику AI-рекомендаций в `MenuService.java`.
- [x] 4. Создать DTO запроса рекомендаций и эндпоинт `POST /api/v1/menu/recommendations` в `MenuController.java`.
- [x] 5. Написать интеграционные тесты для проверки sentiment и рекомендаций с заглушкой (mock) для `GeminiClient`.
- [x] 6. Выполнить `.\mvnw.cmd clean compile -q -DskipTests`.

### Frontend
- [x] 7. Создать карусель рекомендаций в `CartDrawer.tsx` с вызовом API рекомендации.
- [x] 8. При клике на рекомендованное блюдо добавлять его в корзину и перезапрашивать рекомендации.
- [x] 9. Обновить страницу отзывов `/reviews` в админке: раскрасить отзывы по тональности (зеленый, серый, красный) и добавить фильтр по тональности.
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

1. Прописать `GEMINI_API_KEY` в файл конфигурации или в переменные окружения бэкенда (или проверить логику заглушки при пустом ключе).
2. Зайти гостем в меню, положить в корзину «Пиццу Маргарита».
3. Открыть корзину. Внизу должен появиться блок «Рекомендуем попробовать» с блюдами (например, «Кока-Кола» или «Соус чесночный»).
4. Нажать на «Кока-Колу» — она должна добавиться в корзину, а блок рекомендаций обновиться.
5. Оплатить заказ и перейти на страницу `/thankyou`.
6. Оставить плохой отзыв: «Все сгорело, ужасно, долго ждали».
7. Открыть админку, перейти в «Отзывы». Отзыв должен отображаться с красным бейджем `Негативный` (или `NEGATIVE`).
8. Оставить хороший отзыв: «Все супер, пицца огонь!». В админке он должен подсветиться зеленым `Позитивный` (или `POSITIVE`).
9. В фильтре тональностей выбрать «Позитивные 😊» — должен остаться только хороший отзыв. Выбрать «Негативные 😞» — только плохой отзыв.
