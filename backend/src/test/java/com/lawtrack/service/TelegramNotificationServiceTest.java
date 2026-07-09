package com.lawtrack.service;

import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest(properties = {
        "telegram.bot.token=test-token",
        "telegram.chat.id=test-chat-id"
})
@ActiveProfiles("test")
public class TelegramNotificationServiceTest {

    @Autowired
    private TelegramNotificationService telegramNotificationService;

    @Autowired
    private RestTemplate restTemplate;

    private MockRestServiceServer mockServer;

    @BeforeEach
    public void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    public void shouldSendNewClientNotification() {
        Client client = Client.builder()
                .name("Иван Иванов")
                .phone("+79991112233")
                .status(ClientStatus.NEW)
                .build();

        mockServer.expect(requestTo("https://api.telegram.org/bottest-token/sendMessage"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.chat_id").value("test-chat-id"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Новый клиент добавлен")))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Иван Иванов")))
                .andExpect(jsonPath("$.parse_mode").value("Markdown"))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));

        telegramNotificationService.notifyNewClient(client);

        // Since the call is @Async, wait for execution
        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> mockServer.verify());
    }

    @Test
    public void shouldSendStatusChangedNotification() {
        Client client = Client.builder()
                .name("Иван Иванов")
                .phone("+79991112233")
                .status(ClientStatus.IN_PROGRESS)
                .build();

        mockServer.expect(requestTo("https://api.telegram.org/bottest-token/sendMessage"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.chat_id").value("test-chat-id"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Статус изменён")))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Новый → В работе")))
                .andExpect(jsonPath("$.parse_mode").value("Markdown"))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));

        telegramNotificationService.notifyStatusChanged(client, ClientStatus.NEW);

        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> mockServer.verify());
    }
}
