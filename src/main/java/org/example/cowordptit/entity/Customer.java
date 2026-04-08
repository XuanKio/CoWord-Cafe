package org.example.cowordptit.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Customer — Khách hàng (tên bảng DB: Users)
 * Đăng nhập bằng số điện thoại + password
 */
@Entity
@jakarta.persistence.Table(name = "Users")
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

    public Customer() {
    }

    public Customer(Long usersId, String name, String phone, String passwordHash, BigDecimal remainingHours,
            CustomerStatus status, LocalDateTime createdAt) {
        this.usersId = usersId;
        this.name = name;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.remainingHours = remainingHours;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getUsersId() {
        return usersId;
    }

    public void setUsersId(Long usersId) {
        this.usersId = usersId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public BigDecimal getRemainingHours() {
        return remainingHours;
    }

    public void setRemainingHours(BigDecimal remainingHours) {
        this.remainingHours = remainingHours;
    }

    public CustomerStatus getStatus() {
        return status;
    }

    public void setStatus(CustomerStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
