package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.CreateServiceRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.ServiceRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    public ServiceRequestController(ServiceRequestService serviceRequestService) {
        this.serviceRequestService = serviceRequestService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(serviceRequestService.getAll()));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPending() {
        return ResponseEntity.ok(ApiResponse.success(serviceRequestService.getPending()));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(serviceRequestService.getByCustomer(customerId)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Map<String, Object>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false, defaultValue = "false") boolean namesOnly,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long usersId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.success(
                serviceRequestService.search(q, keyword, customerName, namesOnly, status, usersId, type)));
    }

    /** Tạo yêu cầu mới (user gọi) */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody CreateServiceRequestDto req) {
        Map<String, Object> item = serviceRequestService.create(
                req.getUsersId(),
                req.getSessionsId(),
                req.getServicesId(),
                req.getPackagesId(),
                req.getQuantity());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo yêu cầu thành công", item));
    }

    /**
     * Admin duyệt yêu cầu:
     * - Nếu là gói giờ: cộng giờ vào remaining_hours của khách
     * - Đổi status → APPROVED
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(@PathVariable Long id) {
        return serviceRequestService.approve(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success("Duyệt yêu cầu thành công", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy yêu cầu")));
    }

    /** Huỷ yêu cầu */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancel(@PathVariable Long id) {
        return serviceRequestService.cancel(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success("Hủy yêu cầu thành công", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy yêu cầu")));
    }
}
