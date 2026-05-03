package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.CheckInRequest;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.CafeSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class CafeSessionController {

    private final CafeSessionService cafeSessionService;

    public CafeSessionController(CafeSessionService cafeSessionService) {
        this.cafeSessionService = cafeSessionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(cafeSessionService.getAllSessions()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success(cafeSessionService.getActiveSessions()));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(cafeSessionService.getSessionsByCustomer(customerId)));
    }

    @PostMapping({ "", "/checkin" })
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkIn(@RequestBody CheckInRequest req) {
        Map<String, Object> session = cafeSessionService.checkIn(req.getUsersId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Check-in thanh cong", session));
    }

    @RequestMapping(path = "/{id}/checkout", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkOut(@PathVariable Long id) {
        return cafeSessionService.checkOut(id)
                .map(session -> ResponseEntity.ok(ApiResponse.success("Check-out thanh cong", session)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay phien ngoi")));
    }
}
