package com.lawtrack.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lawtrack.dto.request.CreateClientRequest;
import com.lawtrack.dto.request.UpdateStatusRequest;
import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ClientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        clientRepository.deleteAll();
    }

    @Test
    void shouldCreateClient() throws Exception {
        CreateClientRequest request = new CreateClientRequest(
                "Иван Иванов",
                "+79991112233",
                "Описание дела",
                LocalDate.now().plusDays(10)
        );

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Иван Иванов")))
                .andExpect(jsonPath("$.phone", is("+79991112233")))
                .andExpect(jsonPath("$.status", is("NEW")))
                .andExpect(jsonPath("$.statusDisplayName", is("Новый")))
                .andExpect(jsonPath("$.caseDescription", is("Описание дела")));
    }

    @Test
    void shouldGetClientsFiltered() throws Exception {
        Client c1 = Client.builder().name("Иван").phone("+79991112233").status(ClientStatus.NEW).build();
        Client c2 = Client.builder().name("Петр").phone("+79992223344").status(ClientStatus.IN_PROGRESS).build();
        clientRepository.save(c1);
        clientRepository.save(c2);

        // Find by status
        mockMvc.perform(get("/api/clients").param("status", "NEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Иван")));

        // Find by search string
        mockMvc.perform(get("/api/clients").param("search", "петр"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Петр")));
    }

    @Test
    void shouldUpdateClientStatus() throws Exception {
        Client client = Client.builder().name("Иван").phone("+79991112233").status(ClientStatus.NEW).build();
        Client saved = clientRepository.save(client);

        UpdateStatusRequest request = new UpdateStatusRequest(ClientStatus.IN_PROGRESS);

        mockMvc.perform(patch("/api/clients/" + saved.getId() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.statusDisplayName", is("В работе")));
    }

    @Test
    void shouldReturnValidationErrors() throws Exception {
        CreateClientRequest request = new CreateClientRequest("", "invalid-phone", null, null);

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name", notNullValue()))
                .andExpect(jsonPath("$.phone", notNullValue()));
    }
}
