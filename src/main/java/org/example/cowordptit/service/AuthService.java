package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.Admin;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.repository.AdminRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AdminRepository adminRepository;
    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public Map<String, Object> adminLogin(String username, String password) {
        Admin admin = adminRepository.findByUsername(username).orElse(null);
        if (admin == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Tên đăng nhập không tồn tại");
        }

        if (!password.equals(admin.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Mật khẩu không đúng");
        }

        String token = jwtUtil.generateToken(admin.getUsername(), "ADMIN");
        return Map.of(
                "token", token,
                "admin", Map.of(
                        "adminId", admin.getAdminId(),
                        "username", admin.getUsername(),
                        "phone", admin.getPhone(),
                        "role", "ADMIN"));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> userLogin(String phone, String password) {
        Customer customer = customerRepository.findByPhone(phone).orElse(null);
        if (customer == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Số điện thoại không tồn tại");
        }

        if (!password.equals(customer.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Mật khẩu không đúng");
        }

        Customer.CustomerStatus status = customer.getStatus();
        BigDecimal remainingHours = customer.getRemainingHours() == null
                ? BigDecimal.ZERO
                : customer.getRemainingHours();

        boolean isAllowedStatus = status != Customer.CustomerStatus.UNACTIVE
                && status != Customer.CustomerStatus.INACTIVE;
        boolean hasRemainingHours = remainingHours.compareTo(BigDecimal.ZERO) > 0;

        if (!isAllowedStatus) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản của bạn đang bị khóa hoặc không hoạt động");
        }

        if (!hasRemainingHours) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn đã hết thời gian sử dụng dịch vụ, hãy ra quầy để nạp");
        }

        String token = jwtUtil.generateToken(customer.getPhone(), "USER");
        return Map.of(
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
                        "role", "USER"));
    }
}
