package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(sessionRepository.findAll().stream()
                .map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActive() {
        return ResponseEntity.ok(
                sessionRepository.findByStatus(CafeSession.SessionStatus.ONGOING)
                        .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Map<String, Object>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(sessionRepository.findByCustomer_UsersId(customerId)
                .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest req) {
        Customer customer = customerRepository.findById(req.getUsersId()).orElse(null);
        if (customer == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Không tìm thấy khách hàng"));
        }

        // Chỉ chặn khi tài khoản bị khóa
        if (customer.getStatus() == Customer.CustomerStatus.UNACTIVE
                || customer.getStatus() == Customer.CustomerStatus.INACTIVE) {
            String reason = "Tài khoản đã bị khóa";
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", reason));
        }

        if (customer.getRemainingHours() == null || customer.getRemainingHours().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false,
                            "message", "Bạn đã hết thời gian sử dụng dịch vụ, hãy ra quầy để nạp"));
        }

        // Kiểm tra đã có phiên ongoing chưa (bảo vệ tầng 2)
        boolean hasActive = sessionRepository
                .findByCustomer_UsersIdAndStatus(req.getUsersId(), CafeSession.SessionStatus.ONGOING)
                .isPresent();
        if (hasActive) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Khách hàng đang có phiên chưa kết thúc"));
        }

        CafeSession session = new CafeSession();
        session.setCustomer(customer);
        session.setCheckIn(LocalDateTime.now());
        session.setStatus(CafeSession.SessionStatus.ONGOING);

        CafeSession saved = sessionRepository.save(session);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("success", true, "session", toMap(saved)));
    }

    /**
     * Check-out: kết thúc phiên, tính giờ đã dùng và trừ vào remaining_hours
     */
    @PutMapping("/{id}/checkout")
    public ResponseEntity<?> checkOut(@PathVariable Long id) {
        return sessionRepository.findById(id).map(session -> {
            if (session.getStatus() == CafeSession.SessionStatus.COMPLETED) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Phiên đã kết thúc rồi"));
            }

            LocalDateTime now = LocalDateTime.now();
            session.setCheckOut(now);
            session.setStatus(CafeSession.SessionStatus.COMPLETED);

            // Tính so gio da dung (tinh theo don vi gio, lam tron 2 chu so thap phan)
            long minutes = Duration.between(session.getCheckIn(), now).toMinutes();
            BigDecimal hoursUsed = BigDecimal.valueOf(minutes)
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            session.setHoursUsed(hoursUsed);

            // Tru gio con lai cua khach
            Customer customer = session.getCustomer();
            BigDecimal remaining = customer.getRemainingHours().subtract(hoursUsed);
            if (remaining.compareTo(BigDecimal.ZERO) < 0)
                remaining = BigDecimal.ZERO;
            customer.setRemainingHours(remaining);

            customerRepository.save(customer);

            CafeSession saved = sessionRepository.save(session);
            return ResponseEntity.ok(Map.of("success", true, "session", toMap(saved)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== Helper =====
    private Map<String, Object> toMap(CafeSession s) {
        Map<String, Object> map = new HashMap<>();
        map.put("sessionsId", s.getSessionsId());
        map.put("usersId", s.getCustomer().getUsersId());
        map.put("customerName", s.getCustomer().getName());
        map.put("checkIn", s.getCheckIn().toString());
        map.put("checkOut", s.getCheckOut() != null ? s.getCheckOut().toString() : null);
        map.put("hoursUsed", s.getHoursUsed());
        map.put("status", s.getStatus().name());
        return map;
    }

    public static class CheckInRequest {
        private Long usersId;

        public Long getUsersId() {
            return usersId;
        }

        public void setUsersId(Long id) {
            this.usersId = id;
        }
    }
}
