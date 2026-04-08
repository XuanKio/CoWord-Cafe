package org.example.cowordptit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/**
 * Admin — Quản trị viên (chỉ có duy nhất 1 bản ghi với admin_id = 1)
 * Đăng nhập bằng username + password (lưu dạng BCrypt hash)
 */
@Entity
@jakarta.persistence.Table(name = "Admin")
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

    public Admin() {
    }

    public Admin(Integer adminId, String username, String phone, String passwordHash) {
        this.adminId = adminId;
        this.username = username;
        this.phone = phone;
        this.passwordHash = passwordHash;
    }

    public Integer getAdminId() {
        return adminId;
    }

    public void setAdminId(Integer adminId) {
        this.adminId = adminId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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
}
