package com.lawtrack.controller;

import com.lawtrack.dto.request.CreateClientRequest;
import com.lawtrack.dto.request.CreateNoteRequest;
import com.lawtrack.dto.request.UpdateStatusRequest;
import com.lawtrack.dto.response.ClientResponse;
import com.lawtrack.dto.response.ClientEventResponse;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<List<ClientResponse>> getClients(
            @RequestParam(value = "status", required = false) ClientStatus status,
            @RequestParam(value = "search", required = false) String search) {
        List<ClientResponse> clients = clientService.getClients(status, search);
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientResponse> getClient(@PathVariable("id") Long id) {
        ClientResponse client = clientService.getClient(id);
        return ResponseEntity.ok(client);
    }

    @PostMapping
    public ResponseEntity<ClientResponse> createClient(@Valid @RequestBody CreateClientRequest request) {
        ClientResponse created = clientService.createClient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ClientResponse> updateStatus(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateStatusRequest request) {
        ClientResponse updated = clientService.updateStatus(id, request.getStatus());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClient(@PathVariable("id") Long id) {
        clientService.deleteClient(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<List<ClientEventResponse>> getEvents(@PathVariable("id") Long id) {
        List<ClientEventResponse> events = clientService.getEvents(id);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<ClientEventResponse> addNote(
            @PathVariable("id") Long id,
            @Valid @RequestBody CreateNoteRequest request) {
        ClientEventResponse noteEvent = clientService.addNote(id, request.getNote());
        return ResponseEntity.status(HttpStatus.CREATED).body(noteEvent);
    }
}
