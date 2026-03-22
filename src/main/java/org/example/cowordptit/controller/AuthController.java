package org.example.cowordptit.controller;

import org.example.cowordptit.entity.Admin;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.repository.AdminRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * AuthController — Xử lý đăng nhập cho 2 loại tài khoản:
 * POST /api/auth/admin → Admin đăng nhập bằng username + password
 * POST /api/auth/user → Khách hàng đăng nhập bằng phone + password
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    public AuthController(AdminRepository adminRepository, CustomerRepository customerRepository, JwtUtil jwtUtil) {
        this.adminRepository = adminRepository;
        this.customerRepository = customerRepository;
        this.jwtUtil = jwtUtil;
    }

    // ===== ADMIN LOGIN =====
    @PostMapping("/admin")
    public ResponseEntity<?> adminLogin(@RequestBody AdminLoginRequest req) {
        try {
            Admin admin = adminRepository.findByUsername(req.getUsername())
                    .orElse(null);

            if (admin == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Tên đăng nhập không tồn tại"));
            }

            if (!req.getPassword().equals(admin.getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Mật khẩu không đúng"));
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(admin.getUsername(), "ADMIN");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Đăng nhập thành công",
                    "token", token,
                    "admin", Map.of(
                            "adminId", admin.getAdminId(),
                            "username", admin.getUsername(),
                            "phone", admin.getPhone(),
                            "role", "ADMIN")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi hệ thống: " + e.getMessage()));
        }
    }

    // ===== USER (CUSTOMER) LOGIN =====
    @PostMapping("/user")
    public ResponseEntity<?> userLogin(@RequestBody UserLoginRequest req) {
        try {
            Customer customer = customerRepository.findByPhone(req.getPhone())
                    .orElse(null);

            if (customer == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Số điện thoại không tồn tại"));
            }

            if (!req.getPassword().equals(customer.getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Mật khẩu không đúng"));
            }

            Customer.CustomerStatus status = customer.getStatus();
            BigDecimal remainingHours = customer.getRemainingHours() == null
                    ? BigDecimal.ZERO
                    : customer.getRemainingHours();

            boolean isAllowedStatus = status != Customer.CustomerStatus.UNACTIVE
                    && status != Customer.CustomerStatus.INACTIVE;
            boolean hasRemainingHours = remainingHours.compareTo(BigDecimal.ZERO) > 0;

            if (!isAllowedStatus) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false,
                                "message", "Tài khoản của bạn đang bị khóa hoặc không hoạt động"));
            }

            if (!hasRemainingHours) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false,
                                "message", "Bạn đã hết thời gian sử dụng dịch vụ, hãy ra quầy để nạp"));
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(customer.getPhone(), "USER");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Đăng nhập thành công",
                    "token", token,
                    "customer", Map.of(
                            "usersId", customer.getUsersId(),
                            "name", customer.getName(),
                            "phone", customer.getPhone(),
                            "remainingHours", customer.getRemainingHours(),
                            "status", (customer.getStatus() == Customer.CustomerStatus.UNACTIVE
                                    || customer.getStatus() == Customer.CustomerStatus.INACTIVE)
                                            ? Customer.CustomerStatus.UNACTIVE.name()
                                            : Customer.CustomerStatus.ACTIVE.name(),
                            "role", "USER")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Lỗi hệ thống: " + e.getMessage()));
        }
    }

    // ===== Request Body DTOs (inner class) =====
    public static class AdminLoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String u) {
            this.username = u;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String p) {
            this.password = p;
        }
    }

    public static class UserLoginRequest {
        private String phone;
        private String password;

        public String getPhone() {
            return phone;
        }

        public void setPhone(String p) {
            this.phone = p;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String p) {
            this.password = p;
        }
    }
}
