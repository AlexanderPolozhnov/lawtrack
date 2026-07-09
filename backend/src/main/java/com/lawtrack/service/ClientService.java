package com.lawtrack.service;

import com.lawtrack.dto.request.CreateClientRequest;
import com.lawtrack.dto.response.ClientResponse;
import com.lawtrack.dto.response.StatusCountResponse;
import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.exception.ClientNotFoundException;
import com.lawtrack.mapper.ClientMapper;
import com.lawtrack.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClientService {

    private final ClientRepository clientRepository;
    private final ClientMapper clientMapper;

    public List<ClientResponse> getClients(ClientStatus status, String search) {
        List<Client> clients = clientRepository.findAllByFilter(status, search);
        return clientMapper.toResponseList(clients);
    }

    public ClientResponse getClient(Long id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException("Client not found with id: " + id));
        return clientMapper.toResponse(client);
    }

    @Transactional
    public ClientResponse createClient(CreateClientRequest request) {
        Client client = clientMapper.toEntity(request);
        client.setStatus(ClientStatus.NEW);
        Client saved = clientRepository.save(client);
        return clientMapper.toResponse(saved);
    }

    @Transactional
    public ClientResponse updateStatus(Long id, ClientStatus status) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException("Client not found with id: " + id));
        client.setStatus(status);
        Client updated = clientRepository.save(client);
        return clientMapper.toResponse(updated);
    }

    @Transactional
    public void deleteClient(Long id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException("Client not found with id: " + id));
        clientRepository.delete(client);
    }

    public StatusCountResponse getStatusCounts() {
        return clientRepository.getStatusCounts();
    }
}
