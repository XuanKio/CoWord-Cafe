package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.dto.request.PackageRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.PackageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    private final PackageService packageService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(packageService.getAll()));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAvailable() {
        return ResponseEntity.ok(ApiResponse.success(packageService.getAvailable()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getById(@PathVariable Long id) {
        return packageService.getById(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success(item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy gói giờ")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody PackageRequestDto req) {
        Map<String, Object> item = packageService.create(req.getName(), req.getHoursAmount(), req.getPrice());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo gói giờ thành công", item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable Long id,
            @RequestBody PackageRequestDto req) {
        return packageService.update(id, req.getName(), req.getStatus(), req.getHoursAmount(), req.getPrice())
                .map(item -> ResponseEntity.ok(ApiResponse.success("Cập nhật gói giờ thành công", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy gói giờ")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> delete(@PathVariable Long id) {
        if (!packageService.delete(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy gói giờ"));
        }
        return ResponseEntity.ok(ApiResponse.success("Xóa gói giờ thành công", null));
    }
}
