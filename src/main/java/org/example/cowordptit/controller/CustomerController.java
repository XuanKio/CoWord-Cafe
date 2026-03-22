package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * CustomerController — CRUD quản lý khách hàng
 * GET /api/customers → danh sách tất cả
 * GET /api/customers/{id} → thông tin 1 khách
 * POST /api/customers → tạo khách mới (admin dùng)
 * PUT /api/customers/{id} → cập nhật thông tin
 * DELETE /api/customers/{id} → xoá khách
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final CafeSessionRepository cafeSessionRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Map<String, Object>> list = customerRepository.findAll()
                .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(c -> ResponseEntity.ok(toMap(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateCustomerRequest req) {
        if (customerRepository.existsByPhone(req.getPhone())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Số điện thoại đã tồn tại"));
        }

        Customer c = new Customer();
        c.setName(req.getName());
        c.setPhone(req.getPhone());
        c.setPasswordHash(req.getPassword());
        c.setRemainingHours(BigDecimal.ZERO);
        c.setStatus(Customer.CustomerStatus.ACTIVE);
        c.setCreatedAt(LocalDateTime.now());

        Customer saved = customerRepository.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdateCustomerRequest req) {
        return customerRepository.findById(id).map(c -> {
            if (req.getName() != null)
                c.setName(req.getName());
            if (req.getPhone() != null)
                c.setPhone(req.getPhone());
            if (req.getRemainingHours() != null)
                c.setRemainingHours(req.getRemainingHours());
            if (req.getStatus() != null) {
                try {
                    String normalizedStatus = "INACTIVE".equalsIgnoreCase(req.getStatus())
                            ? "UNACTIVE"
                            : req.getStatus();
                    c.setStatus(Customer.CustomerStatus.valueOf(normalizedStatus));
                } catch (Exception ignored) {
                }
            }
            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                c.setPasswordHash(req.getPassword());
            }
            return ResponseEntity.ok(toMap(customerRepository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!customerRepository.existsById(id))
            return ResponseEntity.notFound().build();
        customerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Admin nạp giờ trực tiếp (không qua service_request)
     * PATCH /api/customers/{id}/add-hours
     * Body: { "hours": 10.0, "note": "Nạp thủ công" }
     */
    @PatchMapping("/{id}/add-hours")
    public ResponseEntity<?> addHours(@PathVariable Long id, @RequestBody AddHoursRequest req) {
        return customerRepository.findById(id).map(c -> {
            if (req.getHours() == null || req.getHours().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Số giờ phải lớn hơn 0"));
            }
            c.setRemainingHours(c.getRemainingHours().add(req.getHours()));
            Customer saved = customerRepository.save(c);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "customer", toMap(saved),
                    "message", "Đã nạp " + req.getHours() + "h cho " + saved.getName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== Helper =====
    private Map<String, Object> toMap(Customer c) {
        BigDecimal remaining = c.getRemainingHours();

        // Dynamically compute effective remaining time if they're actively checkin-ed
        c.setStatus(c.getStatus()); // explicitly showing status
        if (cafeSessionRepository != null) {
            cafeSessionRepository.findByCustomer_UsersIdAndStatus(c.getUsersId(), CafeSession.SessionStatus.ONGOING)
                    .ifPresent(session -> {
                        long mins = Duration.between(session.getCheckIn(), LocalDateTime.now()).toMinutes();
                        BigDecimal used = BigDecimal.valueOf(mins).divide(BigDecimal.valueOf(60), 2,
                                RoundingMode.HALF_UP);
                        BigDecimal eff = remaining.subtract(used);
                        if (eff.compareTo(BigDecimal.ZERO) < 0) {
                            eff = BigDecimal.ZERO;
                        }
                        c.setRemainingHours(eff);
                    });
        }

        // Status chỉ quản lý trạng thái tài khoản (ACTIVE/UNACTIVE),
        // không phụ thuộc phiên đang ngồi hay số giờ còn lại.

        return Map.of(
                "usersId", c.getUsersId(),
                "name", c.getName(),
                "phone", c.getPhone(),
                "remainingHours", c.getRemainingHours(),
                "status", normalizeStatus(c.getStatus()).name(),
                "createdAt", c.getCreatedAt().toString());
    }

    private Customer.CustomerStatus normalizeStatus(Customer.CustomerStatus status) {
        if (status == null) {
            return Customer.CustomerStatus.ACTIVE;
        }
        if (status == Customer.CustomerStatus.UNACTIVE || status == Customer.CustomerStatus.INACTIVE) {
            return Customer.CustomerStatus.UNACTIVE;
        }
        return Customer.CustomerStatus.ACTIVE;
    }

    // ===== Inner Request Classes =====
    public static class CreateCustomerRequest {
        private String name, phone, password;

        public String getName() {
            return name;
        }

        public String getPhone() {
            return phone;
        }

        public String getPassword() {
            return password;
        }

        public void setName(String n) {
            this.name = n;
        }

        public void setPhone(String p) {
            this.phone = p;
        }

        public void setPassword(String p) {
            this.password = p;
        }
    }

    public static class UpdateCustomerRequest {
        private String name, phone, password, status;
        private BigDecimal remainingHours;

        public String getName() {
            return name;
        }

        public String getPhone() {
            return phone;
        }

        public String getPassword() {
            return password;
        }

        public String getStatus() {
            return status;
        }

        public BigDecimal getRemainingHours() {
            return remainingHours;
        }

        public void setName(String n) {
            this.name = n;
        }

        public void setPhone(String p) {
            this.phone = p;
        }

        public void setPassword(String p) {
            this.password = p;
        }

        public void setStatus(String s) {
            this.status = s;
        }

        public void setRemainingHours(BigDecimal h) {
            this.remainingHours = h;
        }
    }

    public static class AddHoursRequest {
        private BigDecimal hours;
        private String note;

        public BigDecimal getHours() {
            return hours;
        }

        public String getNote() {
            return note;
        }

        public void setHours(BigDecimal h) {
            this.hours = h;
        }

        public void setNote(String n) {
            this.note = n;
        }
    }
}
