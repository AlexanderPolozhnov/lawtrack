package com.lawtrack.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, String> getStatus() {
        return Map.of(
            "status", "UP",
            "app", "LawTrack CRM API",
            "version", "1.0.0"
        );
    }
}
