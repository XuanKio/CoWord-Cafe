package org.example.cowordptit.controller;

import org.example.cowordptit.dto.request.AdminLoginRequest;
import org.example.cowordptit.dto.request.UserLoginRequest;
import org.example.cowordptit.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.example.cowordptit.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AuthController — Xử lý đăng nhập cho 2 loại tài khoản:
 * POST /api/auth/admin → Admin đăng nhập bằng username + password
 * POST /api/auth/user → Khách hàng đăng nhập bằng phone + password
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ===== ADMIN LOGIN =====
    @PostMapping("/admin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminLogin(@RequestBody AdminLoginRequest req) {
        Map<String, Object> data = authService.adminLogin(req.getUsername(), req.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", data));
    }

    // ===== USER (CUSTOMER) LOGIN =====
    @PostMapping("/user")
    public ResponseEntity<ApiResponse<Map<String, Object>>> userLogin(@RequestBody UserLoginRequest req) {
        Map<String, Object> data = authService.userLogin(req.getPhone(), req.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", data));
    }
}
