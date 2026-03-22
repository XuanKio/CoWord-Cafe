package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.TimePackage;
import org.example.cowordptit.repository.PackageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PackageController — Quản lý gói giờ
 * GET /api/packages → danh sách tất cả gói
 * GET /api/packages/available → chỉ lấy gói AVAILABLE
 * GET /api/packages/{id}
 * POST /api/packages → tạo gói mới
 * PUT /api/packages/{id} → cập nhật
 * DELETE /api/packages/{id}
 */
@RestController
@RequestMapping("/api/packages")
@RequiredArgsConstructor
public class PackageController {

    private final PackageRepository packageRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(packageRepository.findAll().stream()
                .map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailable() {
        return ResponseEntity.ok(
                packageRepository.findByStatus(TimePackage.PackageStatus.AVAILABLE)
                        .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return packageRepository.findById(id)
                .map(p -> ResponseEntity.ok(toMap(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PackageRequest req) {
        TimePackage p = new TimePackage();
        p.setName(req.getName());
        p.setHoursAmount(req.getHoursAmount());
        p.setPrice(req.getPrice());
        p.setStatus(TimePackage.PackageStatus.AVAILABLE);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(packageRepository.save(p)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody PackageRequest req) {
        return packageRepository.findById(id).map(p -> {
            if (req.getName() != null)
                p.setName(req.getName());
            if (req.getHoursAmount() != null)
                p.setHoursAmount(req.getHoursAmount());
            if (req.getPrice() != null)
                p.setPrice(req.getPrice());
            if (req.getStatus() != null) {
                try {
                    p.setStatus(TimePackage.PackageStatus.valueOf(req.getStatus()));
                } catch (Exception ignored) {
                }
            }
            return ResponseEntity.ok(toMap(packageRepository.save(p)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!packageRepository.existsById(id))
            return ResponseEntity.notFound().build();
        packageRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMap(TimePackage p) {
        return Map.of(
                "packagesId", p.getPackagesId(),
                "name", p.getName(),
                "hoursAmount", p.getHoursAmount(),
                "price", p.getPrice(),
                "status", p.getStatus().name());
    }

    public static class PackageRequest {
        private String name, status;
        private BigDecimal hoursAmount, price;

        public String getName() {
            return name;
        }

        public String getStatus() {
            return status;
        }

        public BigDecimal getHoursAmount() {
            return hoursAmount;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public void setName(String n) {
            this.name = n;
        }

        public void setStatus(String s) {
            this.status = s;
        }

        public void setHoursAmount(BigDecimal h) {
            this.hoursAmount = h;
        }

        public void setPrice(BigDecimal p) {
            this.price = p;
        }
    }
}
