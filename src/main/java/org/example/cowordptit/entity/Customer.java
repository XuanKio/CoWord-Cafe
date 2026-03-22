package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Customer — Khách hàng (tên bảng DB: Users)
 * Đăng nhập bằng số điện thoại + password
 */
@Entity
@jakarta.persistence.Table(name = "Users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "users_id")
    private Long usersId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    /** BCrypt hash cua mat khau */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /** So gio con lai (don vi: gio) */
    @Column(name = "remaining_hours", precision = 10, scale = 2)
    private BigDecimal remainingHours = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum CustomerStatus {
        ACTIVE,
        UNACTIVE,
        INACTIVE,
        IN_SESSION,
        OUT_OF_HOURS
    }
}
