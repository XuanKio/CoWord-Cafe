package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.dto.request.AddHoursRequestDto;
import org.example.cowordptit.dto.request.CreateCustomerRequestDto;
import org.example.cowordptit.dto.request.UpdateCustomerRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.CustomerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(customerService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getById(@PathVariable Long id) {
        return customerService.getById(id)
                .map(customer -> ResponseEntity.ok(ApiResponse.success(customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy khách hàng")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody CreateCustomerRequestDto req) {
        Map<String, Object> customer = customerService.create(req.getName(), req.getPhone(), req.getPassword());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo khách hàng thành công", customer));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable Long id,
            @RequestBody UpdateCustomerRequestDto req) {
        return customerService.update(
                id,
                req.getName(),
                req.getPhone(),
                req.getPassword(),
                req.getStatus(),
                req.getRemainingHours())
                .map(customer -> ResponseEntity.ok(ApiResponse.success("Cập nhật khách hàng thành công", customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy khách hàng")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> delete(@PathVariable Long id) {
        if (!customerService.delete(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy khách hàng"));
        }
        return ResponseEntity.ok(ApiResponse.success("Xóa khách hàng thành công", null));
    }

    /**
     * Admin nạp giờ trực tiếp (không qua service_request)
     * PATCH /api/customers/{id}/add-hours
     * Body: { "hours": 10.0, "note": "Nạp thủ công" }
     */
    @PatchMapping("/{id}/add-hours")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addHours(@PathVariable Long id,
            @RequestBody AddHoursRequestDto req) {
        return customerService.addHours(id, req.getHours())
                .map(customer -> ResponseEntity.ok(ApiResponse.success(
                        "Đã nạp " + req.getHours() + "h cho " + customer.get("name"),
                        customer)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy khách hàng")));
    }
}
