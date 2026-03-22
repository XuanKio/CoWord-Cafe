package org.example.cowordptit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin — Quản trị viên (chỉ có duy nhất 1 bản ghi với admin_id = 1)
 * Đăng nhập bằng username + password (lưu dạng BCrypt hash)
 */
@Entity
@jakarta.persistence.Table(name = "Admin")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Admin {

    @Id
    @Column(name = "admin_id")
    private Integer adminId = 1; // Luon la 1, khong dung @GeneratedValue

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    /** BCrypt hash cua mat khau */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
}
