package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.*;
import org.example.cowordptit.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ServiceRequestController — Yêu cầu gọi dịch vụ hoặc mua gói giờ
 *
 * POST /api/requests → user tạo yêu cầu
 * GET /api/requests → tất cả (admin)
 * GET /api/requests/pending → yêu cầu chờ duyệt
 * GET /api/requests/customer/{id} → yêu cầu theo khách
 * PATCH /api/requests/{id}/approve → admin duyệt (PENDING → APPROVED), nạp giờ
 * nếu là gói
 * PATCH /api/requests/{id}/cancel → huỷ yêu cầu
 */
@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestRepository requestRepository;
    private final CustomerRepository customerRepository;
    private final CafeSessionRepository sessionRepository;
    private final CafeServiceRepository cafeServiceRepository;
    private final PackageRepository packageRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(requestRepository.findAll().stream()
                .map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Map<String, Object>>> getPending() {
        return ResponseEntity.ok(
                requestRepository.findByStatus(ServiceRequest.RequestStatus.PENDING)
                        .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Map<String, Object>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(requestRepository.findByCustomer_UsersId(customerId)
                .stream().map(this::toMap).collect(Collectors.toList()));
    }

    /** Tạo yêu cầu mới (user gọi) */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRequestBody req) {
        Customer customer = customerRepository.findById(req.getUsersId()).orElse(null);
        if (customer == null)
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Khách hàng không tồn tại"));

        ServiceRequest serviceRequest = new ServiceRequest();
        serviceRequest.setCustomer(customer);
        serviceRequest.setQuantity(req.getQuantity() != null ? req.getQuantity() : 1);
        serviceRequest.setCreatedAt(LocalDateTime.now());
        serviceRequest.setStatus(ServiceRequest.RequestStatus.PENDING);

        // Gắn phiên nếu có
        if (req.getSessionsId() != null) {
            sessionRepository.findById(req.getSessionsId())
                    .ifPresent(serviceRequest::setSession);
        }

        // Tính total_price và gắn dịch vụ / gói giờ
        if (req.getServicesId() != null) {
            CafeService svc = cafeServiceRepository.findById(req.getServicesId()).orElse(null);
            if (svc == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Dịch vụ không tồn tại"));
            serviceRequest.setService(svc);
            serviceRequest.setTotalPrice(svc.getPrice().multiply(BigDecimal.valueOf(serviceRequest.getQuantity())));
        } else if (req.getPackagesId() != null) {
            TimePackage pkg = packageRepository.findById(req.getPackagesId()).orElse(null);
            if (pkg == null)
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Gói giờ không tồn tại"));
            serviceRequest.setTimePackage(pkg);
            serviceRequest.setTotalPrice(pkg.getPrice().multiply(BigDecimal.valueOf(serviceRequest.getQuantity())));
        } else {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Cần chọn dịch vụ hoặc gói giờ"));
        }

        ServiceRequest saved = requestRepository.save(serviceRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("success", true, "request", toMap(saved)));
    }

    /**
     * Admin duyệt yêu cầu:
     * - Nếu là gói giờ: cộng giờ vào remaining_hours của khách
     * - Đổi status → APPROVED
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        return requestRepository.findById(id).map(req -> {
            if (req.getStatus() != ServiceRequest.RequestStatus.PENDING) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Yêu cầu phải ở trạng thái PENDING"));
            }

            req.setStatus(ServiceRequest.RequestStatus.APPROVED);

            // Nếu là gói giờ → nạp giờ vào tài khoản
            if (req.getTimePackage() != null) {
                Customer customer = req.getCustomer();
                BigDecimal addHours = req.getTimePackage().getHoursAmount()
                        .multiply(BigDecimal.valueOf(req.getQuantity()));
                customer.setRemainingHours(customer.getRemainingHours().add(addHours));
                customerRepository.save(customer);
            }

            ServiceRequest saved = requestRepository.save(req);
            return ResponseEntity.ok(Map.of("success", true, "request", toMap(saved)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Huỷ yêu cầu */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        return requestRepository.findById(id).map(req -> {
            req.setStatus(ServiceRequest.RequestStatus.CANCELLED);
            return ResponseEntity.ok(Map.of("success", true, "request", toMap(requestRepository.save(req))));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== Helper =====
    private Map<String, Object> toMap(ServiceRequest r) {
        Map<String, Object> map = new HashMap<>();
        map.put("serviceRequestsId", r.getServiceRequestsId());
        map.put("usersId", r.getCustomer().getUsersId());
        map.put("customerName", r.getCustomer().getName());
        map.put("sessionsId", r.getSession() != null ? r.getSession().getSessionsId() : null);
        map.put("servicesId", r.getService() != null ? r.getService().getServicesId() : null);
        map.put("serviceName", r.getService() != null ? r.getService().getName() : null);
        map.put("packagesId", r.getTimePackage() != null ? r.getTimePackage().getPackagesId() : null);
        map.put("packageName", r.getTimePackage() != null ? r.getTimePackage().getName() : null);
        map.put("quantity", r.getQuantity());
        map.put("totalPrice", r.getTotalPrice());
        map.put("status", r.getStatus().name());
        map.put("createdAt", r.getCreatedAt().toString());
        return map;
    }

    // ===== Inner Request Class =====
    public static class CreateRequestBody {
        private Long usersId, sessionsId, servicesId, packagesId;
        private Integer quantity;

        public Long getUsersId() {
            return usersId;
        }

        public Long getSessionsId() {
            return sessionsId;
        }

        public Long getServicesId() {
            return servicesId;
        }

        public Long getPackagesId() {
            return packagesId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setUsersId(Long id) {
            this.usersId = id;
        }

        public void setSessionsId(Long id) {
            this.sessionsId = id;
        }

        public void setServicesId(Long id) {
            this.servicesId = id;
        }

        public void setPackagesId(Long id) {
            this.packagesId = id;
        }

        public void setQuantity(Integer q) {
            this.quantity = q;
        }
    }
}
