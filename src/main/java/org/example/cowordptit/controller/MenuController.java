package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.MenuRequestDto;
import org.example.cowordptit.dto.response.ApiResponse;
import org.example.cowordptit.service.MenuService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAll()));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAvailable() {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAvailable()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getById(@PathVariable Long id) {
        return menuService.getById(id)
                .map(item -> ResponseEntity.ok(ApiResponse.success(item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy món")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody MenuRequestDto req) {
        Map<String, Object> item = menuService.create(req.getName(), req.getType(), req.getPrice());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo món thành công", item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable Long id,
            @RequestBody MenuRequestDto req) {
        return menuService.update(id, req.getName(), req.getType(), req.getStatus(), req.getPrice())
                .map(item -> ResponseEntity.ok(ApiResponse.success("Cập nhật món thành công", item)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy món")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> delete(@PathVariable Long id) {
        if (!menuService.delete(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy món"));
        }
        return ResponseEntity.ok(ApiResponse.success("Xóa món thành công", null));
    }
}
