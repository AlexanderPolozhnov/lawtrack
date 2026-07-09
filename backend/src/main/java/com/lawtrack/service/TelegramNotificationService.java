package com.lawtrack.service;

import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.chat.id:}")
    private String chatId;

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
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            log.info("Telegram notification skipped: bot token or chat ID is not configured.");
            return;
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "Markdown"
            );
            restTemplate.postForEntity(url, body, String.class);
            log.info("Telegram notification sent successfully.");
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
