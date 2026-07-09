package com.lawtrack.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lawtrack.dto.response.StatusCountResponse;
import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.repository.ClientRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
public class TelegramNotificationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ClientRepository clientRepository;

    @Value("${telegram.bot.token:}")
    private String botToken;

    private String chatId;
    private long lastUpdateId = 0;

    public TelegramNotificationService(RestTemplate restTemplate, ObjectMapper objectMapper,
                                       ClientRepository clientRepository,
                                       @Value("${telegram.chat.id:}") String chatId) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.clientRepository = clientRepository;
        this.chatId = chatId;
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

                    // If Chat ID is not configured yet, dynamically bind it to the first active user chat!
                    if (chatId == null || chatId.isBlank()) {
                        log.info("Telegram: Auto-detected Chat ID: {}", cid);
                        this.chatId = String.valueOf(cid);
                    }

                    if (text != null) {
                        String cleanText = text.trim();
                        if (cleanText.startsWith("/start")) {
                            sendDirectMessage(String.valueOf(cid), 
                                "👋 *Привет! Добро пожаловать в LawTrack CRM!*\n\n" +
                                "Этот бот предназначен для мгновенного информирования о новых заявках клиентов и изменении их статусов.\n\n" +
                                "📍 Ваш Chat ID успешно зарегистрирован: `" + cid + "`\n\n" +
                                "Используйте команду /help для просмотра доступных опций.");
                        } else if (cleanText.startsWith("/help")) {
                            sendDirectMessage(String.valueOf(cid), 
                                "📖 *Доступные команды CRM LawTrack:*\n\n" +
                                "• /start — Проверить статус подключения бота\n" +
                                "• /status — Показать сводную статистику по делам\n" +
                                "• /help — Показать этот список команд");
                        } else if (cleanText.startsWith("/status")) {
                            StatusCountResponse stats = clientRepository.getStatusCounts();
                            sendDirectMessage(String.valueOf(cid), 
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
        String text = String.format(
            "🆕 *Новый клиент добавлен*\n\n" +
            "👤 %s\n📞 %s\n📋 Статус: %s",
            name, phone, status
        );
        sendMessage(text);
    }

    @Async
    public void notifyStatusChanged(Client client, ClientStatus oldStatus) {
        String name = escapeMarkdown(client.getName());
        String oldStatusStr = escapeMarkdown(oldStatus.getDisplayName());
        String newStatusStr = escapeMarkdown(client.getStatus().getDisplayName());
        String text = String.format(
            "🔄 *Статус изменён*\n\n👤 %s\n%s → %s",
            name, oldStatusStr, newStatusStr
        );
        sendMessage(text);
    }

    private void sendMessage(String text) {
        if (chatId == null || chatId.isBlank()) {
            log.info("Telegram notification skipped: Chat ID is not yet resolved. Send a message to the bot first.");
            return;
        }
        sendDirectMessage(chatId, text);
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
            log.warn("Не удалось отправить Telegram-уведомление: {}", e.getMessage());
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
