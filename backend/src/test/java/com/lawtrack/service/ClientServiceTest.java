package com.lawtrack.service;

import com.lawtrack.dto.request.CreateClientRequest;
import com.lawtrack.dto.response.ClientResponse;
import com.lawtrack.dto.response.ClientEventResponse;
import com.lawtrack.dto.response.StatusCountResponse;
import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientEvent;
import com.lawtrack.entity.ClientEventType;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.exception.ClientNotFoundException;
import com.lawtrack.mapper.ClientMapper;
import com.lawtrack.mapper.ClientEventMapper;
import com.lawtrack.repository.ClientRepository;
import com.lawtrack.repository.ClientEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private ClientMapper clientMapper;

    @Mock
    private ClientEventRepository clientEventRepository;

    @Mock
    private ClientEventMapper clientEventMapper;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    @InjectMocks
    private ClientService clientService;

    @Test
    void getClients_ShouldReturnResponseList() {
        Client client = new Client();
        List<Client> clients = List.of(client);
        ClientResponse response = new ClientResponse();
        List<ClientResponse> expectedResponses = List.of(response);

        when(clientRepository.findAllByFilter(ClientStatus.NEW, "Иван")).thenReturn(clients);
        when(clientMapper.toResponseList(clients)).thenReturn(expectedResponses);

        List<ClientResponse> result = clientService.getClients(ClientStatus.NEW, "Иван");

        assertThat(result).isEqualTo(expectedResponses);
        verify(clientRepository).findAllByFilter(ClientStatus.NEW, "Иван");
        verify(clientMapper).toResponseList(clients);
    }

    @Test
    void getClient_ExistingId_ShouldReturnClient() {
        Long id = 1L;
        Client client = new Client();
        ClientResponse response = new ClientResponse();

        when(clientRepository.findById(id)).thenReturn(Optional.of(client));
        when(clientMapper.toResponse(client)).thenReturn(response);

        ClientResponse result = clientService.getClient(id);

        assertThat(result).isEqualTo(response);
    }

    @Test
    void getClient_NonExistingId_ShouldThrowException() {
        Long id = 1L;
        when(clientRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.getClient(id))
                .isInstanceOf(ClientNotFoundException.class)
                .hasMessageContaining("Client not found with id: " + id);
    }

    @Test
    void createClient_ShouldSanitizeInputsSaveAndNotify() {
        CreateClientRequest request = new CreateClientRequest(
                "<script>alert('hack')</script>Иван",
                "+79991112233",
                "<b>Описание</b>",
                LocalDate.now()
        );

        Client client = Client.builder()
                .name("<script>alert('hack')</script>Иван")
                .caseDescription("<b>Описание</b>")
                .build();

        Client savedClient = Client.builder()
                .id(1L)
                .name("alert('hack')Иван")
                .caseDescription("Описание")
                .status(ClientStatus.NEW)
                .build();

        ClientResponse response = new ClientResponse();

        when(clientMapper.toEntity(request)).thenReturn(client);
        when(clientRepository.save(client)).thenReturn(savedClient);
        when(clientMapper.toResponse(savedClient)).thenReturn(response);

        ClientResponse result = clientService.createClient(request);

        assertThat(result).isEqualTo(response);
        assertThat(client.getName()).isEqualTo("alert('hack')Иван");
        assertThat(client.getCaseDescription()).isEqualTo("Описание");
        assertThat(client.getStatus()).isEqualTo(ClientStatus.NEW);

        verify(clientEventRepository).save(argThat(event -> 
            event.getClient().equals(savedClient) &&
            event.getEventType() == ClientEventType.CREATED &&
            event.getDescription().equals("Клиент создан")
        ));
        verify(telegramNotificationService).notifyNewClient(savedClient);
    }

    @Test
    void updateStatus_StatusChanged_ShouldSaveEventAndNotify() {
        Long id = 1L;
        Client client = Client.builder()
                .id(id)
                .name("Иван")
                .status(ClientStatus.NEW)
                .build();

        Client updatedClient = Client.builder()
                .id(id)
                .name("Иван")
                .status(ClientStatus.IN_PROGRESS)
                .build();

        ClientResponse response = new ClientResponse();

        when(clientRepository.findById(id)).thenReturn(Optional.of(client));
        when(clientRepository.save(client)).thenReturn(updatedClient);
        when(clientMapper.toResponse(updatedClient)).thenReturn(response);

        ClientResponse result = clientService.updateStatus(id, ClientStatus.IN_PROGRESS);

        assertThat(result).isEqualTo(response);
        assertThat(client.getStatus()).isEqualTo(ClientStatus.IN_PROGRESS);

        verify(clientEventRepository).save(argThat(event ->
            event.getClient().equals(updatedClient) &&
            event.getEventType() == ClientEventType.STATUS_CHANGED &&
            event.getDescription().equals("Статус изменен с Новый на В работе")
        ));
        verify(telegramNotificationService).notifyStatusChanged(updatedClient, ClientStatus.NEW);
    }

    @Test
    void updateStatus_StatusNotChanged_ShouldDoNothing() {
        Long id = 1L;
        Client client = Client.builder()
                .id(id)
                .name("Иван")
                .status(ClientStatus.NEW)
                .build();

        ClientResponse response = new ClientResponse();

        when(clientRepository.findById(id)).thenReturn(Optional.of(client));
        when(clientMapper.toResponse(client)).thenReturn(response);

        ClientResponse result = clientService.updateStatus(id, ClientStatus.NEW);

        assertThat(result).isEqualTo(response);
        verify(clientRepository, never()).save(any());
        verify(clientEventRepository, never()).save(any());
        verify(telegramNotificationService, never()).notifyStatusChanged(any(), any());
    }

    @Test
    void updateStatus_NonExistingClient_ShouldThrowException() {
        Long id = 1L;
        when(clientRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.updateStatus(id, ClientStatus.IN_PROGRESS))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void deleteClient_ExistingClient_ShouldDelete() {
        Long id = 1L;
        Client client = new Client();
        when(clientRepository.findById(id)).thenReturn(Optional.of(client));

        clientService.deleteClient(id);

        verify(clientRepository).delete(client);
    }

    @Test
    void deleteClient_NonExistingClient_ShouldThrowException() {
        Long id = 1L;
        when(clientRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.deleteClient(id))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void getStatusCounts_ShouldReturnCounts() {
        StatusCountResponse counts = new StatusCountResponse(1L, 2L, 3L, 4L);
        when(clientRepository.getStatusCounts()).thenReturn(counts);

        StatusCountResponse result = clientService.getStatusCounts();

        assertThat(result).isEqualTo(counts);
    }

    @Test
    void addNote_ExistingClient_ShouldSanitizeSaveAndReturnResponse() {
        Long clientId = 1L;
        String note = "<p>Важное примечание</p>";
        Client client = new Client();
        ClientEvent event = new ClientEvent();
        ClientEventResponse response = new ClientEventResponse();

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(client));
        when(clientEventRepository.save(any(ClientEvent.class))).thenReturn(event);
        when(clientEventMapper.toResponse(event)).thenReturn(response);

        ClientEventResponse result = clientService.addNote(clientId, note);

        assertThat(result).isEqualTo(response);
        verify(clientEventRepository).save(argThat(ev ->
            ev.getClient().equals(client) &&
            ev.getEventType() == ClientEventType.NOTE_ADDED &&
            ev.getDescription().equals("Важное примечание")
        ));
    }

    @Test
    void addNote_NonExistingClient_ShouldThrowException() {
        Long clientId = 1L;
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.addNote(clientId, "тест"))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void getEvents_ExistingClient_ShouldReturnEvents() {
        Long clientId = 1L;
        ClientEvent event = new ClientEvent();
        List<ClientEvent> events = List.of(event);
        ClientEventResponse response = new ClientEventResponse();
        List<ClientEventResponse> expectedResponses = List.of(response);

        when(clientRepository.existsById(clientId)).thenReturn(true);
        when(clientEventRepository.findAllByClientIdOrderByCreatedAtAsc(clientId)).thenReturn(events);
        when(clientEventMapper.toResponseList(events)).thenReturn(expectedResponses);

        List<ClientEventResponse> result = clientService.getEvents(clientId);

        assertThat(result).isEqualTo(expectedResponses);
    }

    @Test
    void getEvents_NonExistingClient_ShouldThrowException() {
        Long clientId = 1L;
        when(clientRepository.existsById(clientId)).thenReturn(false);

        assertThatThrownBy(() -> clientService.getEvents(clientId))
                .isInstanceOf(ClientNotFoundException.class);
    }
}
