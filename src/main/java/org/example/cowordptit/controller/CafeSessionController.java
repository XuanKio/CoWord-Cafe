package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.dto.request.CheckInRequest;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.CafeSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CafeSessionController — Quản lý phiên ngồi
 * GET /api/sessions → tất cả phiên (admin)
 * GET /api/sessions/customer/{id} → phiên theo khách
 * GET /api/sessions/active → phiên đang diễn ra
 * POST /api/sessions/checkin → check-in khách
 * PUT /api/sessions/{id}/checkout → check-out, tính giờ
 */
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class CafeSessionController {

    private final CafeSessionService cafeSessionService;

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

    @PostMapping("/checkin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkIn(@RequestBody CheckInRequest req) {
        Map<String, Object> session = cafeSessionService.checkIn(req.getUsersId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Check-in thành công", session));
    }

    /**
     * Check-out: kết thúc phiên, tính giờ đã dùng và trừ vào remaining_hours
     */
    @PutMapping("/{id}/checkout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkOut(@PathVariable Long id) {
        return cafeSessionService.checkOut(id)
                .map(session -> ResponseEntity.ok(ApiResponse.success("Check-out thành công", session)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy phiên ngồi")));
    }
}
