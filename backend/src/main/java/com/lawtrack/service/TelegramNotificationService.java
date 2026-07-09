package com.lawtrack.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lawtrack.dto.response.StatusCountResponse;
import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.entity.TelegramChat;
import com.lawtrack.repository.ClientRepository;
import com.lawtrack.repository.TelegramChatRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class TelegramNotificationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ClientRepository clientRepository;
    private final TelegramChatRepository telegramChatRepository;

    @Value("${telegram.bot.token:}")
    private String botToken;

    private final String defaultChatId;
    private long lastUpdateId = 0;

    public TelegramNotificationService(RestTemplate restTemplate, ObjectMapper objectMapper,
                                       ClientRepository clientRepository,
                                       TelegramChatRepository telegramChatRepository,
                                       @Value("${telegram.chat.id:}") String chatId) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.clientRepository = clientRepository;
        this.telegramChatRepository = telegramChatRepository;
        this.defaultChatId = chatId;
    }

    @Scheduled(fixedRate = 5000)
    public void pollUpdates() {
        if (botToken == null || botToken.isBlank() || "dummy_token_for_local_tests".equals(botToken)) {
            return;
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/getUpdates";
            if (lastUpdateId > 0) {
                url += "?offset=" + lastUpdateId;
            }

            String responseJson = restTemplate.getForObject(url, String.class);
            if (responseJson == null) {
                return;
            }

            JsonNode root = objectMapper.readTree(responseJson);
            if (root.path("ok").asBoolean()) {
                JsonNode result = root.path("result");
                for (JsonNode update : result) {
                    long updateId = update.path("update_id").asLong();
                    lastUpdateId = updateId + 1;

                    JsonNode message = update.path("message");
                    if (message.isMissingNode()) {
                        continue;
                    }

                    long cid = message.path("chat").path("id").asLong();
                    String text = message.path("text").asText();
                    String cidStr = String.valueOf(cid);

                    // Dynamically save registered chat ID to database
                    if (!telegramChatRepository.existsById(cidStr)) {
                        telegramChatRepository.save(TelegramChat.builder().chatId(cidStr).build());
                        log.info("Telegram: Registered new chat ID: {}", cidStr);
                    }

                    if (text != null) {
                        String cleanText = text.trim();
                        if (cleanText.startsWith("/start")) {
                            sendDirectMessage(cidStr, 
                                "👋 *Привет! Добро пожаловать в LawTrack CRM!*\n\n" +
                                "Вы успешно подключили уведомления! Бот будет присылать вам информацию о новых клиентах и движении по делам.\n\n" +
                                "📍 Ваш Chat ID зарегистрирован в системе.\n\n" +
                                "Используйте /help для списка команд.");
                        } else if (cleanText.startsWith("/help")) {
                            sendDirectMessage(cidStr, 
                                "📖 *Доступные команды CRM LawTrack:*\n\n" +
                                "• /start — Проверить статус подключения\n" +
                                "• /status — Показать сводную статистику по делам\n" +
                                "• /help — Показать этот список команд");
                        } else if (cleanText.startsWith("/status")) {
                            StatusCountResponse stats = clientRepository.getStatusCounts();
                            sendDirectMessage(cidStr, 
                                "📊 *Сводка дел LawTrack CRM:*\n\n" +
                                "• Всего дел: *" + stats.getTotal() + "*\n" +
                                "• Новые заявки: *" + stats.getNewCount() + "*\n" +
                                "• В работе: *" + stats.getInProgressCount() + "*\n" +
                                "• Закрытые дела: *" + stats.getClosedCount() + "*");
                        }
                    }
                }
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            if (e.getStatusCode().value() == 409) {
                log.debug("Telegram polling conflict (webhook active or multiple instances running): {}", e.getMessage());
            } else {
                log.warn("HTTP error polling Telegram updates: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Error polling Telegram updates: {}", e.getMessage());
        }
    }

    @Async
    public void notifyNewClient(Client client) {
        String name = escapeMarkdown(client.getName());
        String phone = escapeMarkdown(client.getPhone());
        String status = escapeMarkdown(client.getStatus().getDisplayName());
        String caseDesc = client.getCaseDescription() != null ? escapeMarkdown(client.getCaseDescription()) : "—";

        String text = String.format(
            "🆕 *Новый клиент добавлен*\n\n" +
            "👤 *ФИО:* %s\n" +
            "📞 *Телефон:* %s\n" +
            "📝 *Суть дела:* %s\n" +
            "📋 *Начальный статус:* %s",
            name, phone, caseDesc, status
        );
        sendMessageToAll(text);
    }

    @Async
    public void notifyStatusChanged(Client client, ClientStatus oldStatus) {
        String name = escapeMarkdown(client.getName());
        String oldStatusStr = escapeMarkdown(oldStatus.getDisplayName());
        String newStatusStr = escapeMarkdown(client.getStatus().getDisplayName());
        String caseDesc = client.getCaseDescription() != null ? escapeMarkdown(client.getCaseDescription()) : "—";

        String text = String.format(
            "🔄 *Статус изменён*\n\n" +
            "👤 *Клиент:* %s\n" +
            "📝 *Суть дела:* %s\n" +
            "📈 *Движение по делу:* %s → %s",
            name, caseDesc, oldStatusStr, newStatusStr
        );
        sendMessageToAll(text);
    }

    private void sendMessageToAll(String text) {
        // Automatically ensure the default chat ID from properties is registered
        if (defaultChatId != null && !defaultChatId.isBlank()) {
            if (!telegramChatRepository.existsById(defaultChatId)) {
                telegramChatRepository.save(TelegramChat.builder().chatId(defaultChatId).build());
            }
        }

        List<TelegramChat> chats = telegramChatRepository.findAll();
        if (chats.isEmpty()) {
            log.info("Telegram notification skipped: No chat IDs registered yet.");
            return;
        }

        for (TelegramChat chat : chats) {
            sendDirectMessage(chat.getChatId(), text);
        }
    }

    private void sendDirectMessage(String targetChatId, String text) {
        if (botToken == null || botToken.isBlank() || "dummy_token_for_local_tests".equals(botToken)) {
            return;
        }
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            Map<String, Object> body = Map.of(
                "chat_id", targetChatId,
                "text", text,
                "parse_mode", "Markdown"
            );
            restTemplate.postForEntity(url, body, String.class);
            log.info("Telegram notification sent successfully to chat ID: {}", targetChatId);
        } catch (Exception e) {
            log.warn("Не удалось отправить Telegram-уведомление к {}: {}", targetChatId, e.getMessage());
        }
    }

    private String escapeMarkdown(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("_", "\\_")
                   .replace("*", "\\*")
                   .replace("[", "\\[")
                   .replace("`", "\\`")
                   .replace("]", "\\]");
    }
}
