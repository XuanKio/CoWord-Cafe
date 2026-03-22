package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.CafeService;
import org.example.cowordptit.repository.CafeServiceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * MenuController — Quản lý đồ ăn / nước uống
 * GET /api/menu → tất cả dịch vụ
 * GET /api/menu/available → chỉ những món AVAILABLE
 * POST /api/menu → tạo món mới
 * PUT /api/menu/{id} → cập nhật
 * DELETE /api/menu/{id}
 */
@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
public class MenuController {

    private final CafeServiceRepository cafeServiceRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(cafeServiceRepository.findAll().stream()
                .map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailable() {
        return ResponseEntity.ok(
                cafeServiceRepository.findByStatus(CafeService.ServiceStatus.AVAILABLE)
                        .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return cafeServiceRepository.findById(id)
                .map(s -> ResponseEntity.ok(toMap(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody MenuRequest req) {
        CafeService s = new CafeService();
        s.setName(req.getName());
        s.setType(CafeService.ServiceType.valueOf(req.getType()));
        s.setPrice(req.getPrice());
        s.setStatus(CafeService.ServiceStatus.AVAILABLE);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(cafeServiceRepository.save(s)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody MenuRequest req) {
        return cafeServiceRepository.findById(id).map(s -> {
            if (req.getName() != null)
                s.setName(req.getName());
            if (req.getPrice() != null)
                s.setPrice(req.getPrice());
            if (req.getType() != null) {
                try {
                    s.setType(CafeService.ServiceType.valueOf(req.getType()));
                } catch (Exception ignored) {
                }
            }
            if (req.getStatus() != null) {
                try {
                    s.setStatus(CafeService.ServiceStatus.valueOf(req.getStatus()));
                } catch (Exception ignored) {
                }
            }
            return ResponseEntity.ok(toMap(cafeServiceRepository.save(s)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!cafeServiceRepository.existsById(id))
            return ResponseEntity.notFound().build();
        cafeServiceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(CafeService s) {
        return Map.of(
                "servicesId", s.getServicesId(),
                "name", s.getName(),
                "type", s.getType().name(),
                "price", s.getPrice(),
                "status", s.getStatus().name());
    }

    public static class MenuRequest {
        private String name, type, status;
        private BigDecimal price;

        public String getName() {
            return name;
        }

        public String getType() {
            return type;
        }

        public String getStatus() {
            return status;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public void setName(String n) {
            this.name = n;
        }

        public void setType(String t) {
            this.type = t;
        }

        public void setStatus(String s) {
            this.status = s;
        }

        public void setPrice(BigDecimal p) {
            this.price = p;
        }
    }
}
