package com.lawtrack.controller;

import com.lawtrack.dto.response.StatusCountResponse;
import com.lawtrack.service.ClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final ClientService clientService;

    @GetMapping("/status-counts")
    public ResponseEntity<StatusCountResponse> getStatusCounts() {
        StatusCountResponse counts = clientService.getStatusCounts();
        return ResponseEntity.ok(counts);
    }
}
