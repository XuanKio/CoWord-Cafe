package org.example.cowordptit.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HomeController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> home() {
        return ResponseEntity.ok(Map.of(
                "message", "CoWorking Cafe API v2.0",
                "timestamp", LocalDateTime.now().toString(),
                "status", "running",
                "endpoints", Map.of(
                        "adminLogin", "POST /api/auth/admin",
                        "userLogin", "POST /api/auth/user",
                        "customers", "/api/customers",
                        "packages", "/api/packages",
                        "menu", "/api/menu",
                        "sessions", "/api/sessions",
                        "requests", "/api/requests",
                        "payments", "/api/payments")));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now().toString()));
    }
}
