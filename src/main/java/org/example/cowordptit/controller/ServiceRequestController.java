package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.CreateServiceRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.ServiceRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;

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

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody CreateServiceRequestDto req) {
        BigDecimal resolvedPrice = req.getPrice();
        if (resolvedPrice == null) {
            resolvedPrice = req.getUnitPrice();
        }
        if (resolvedPrice == null) {
            resolvedPrice = req.getHiddenPrice();
        }

        Map<String, Object> item = serviceRequestService.create(
                req.getUsersId(),
                req.getSessionsId(),
                req.getServicesId(),
                req.getPackagesId(),
                req.getQuantity(),
                resolvedPrice);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tao yeu cau thanh cong", item));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(@PathVariable Long id) {
        return serviceRequestService.approve(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success("Duyet yeu cau thanh cong", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay yeu cau")));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancel(@PathVariable Long id) {
        return serviceRequestService.cancel(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success("Huy yeu cau thanh cong", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khong tim thay yeu cau")));
    }
}
