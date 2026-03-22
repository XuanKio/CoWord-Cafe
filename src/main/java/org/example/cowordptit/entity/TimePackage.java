package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * TimePackage — Gói giờ (tên bảng DB: Packages)
 * Lưu ý: không đặt tên class là "Package" vì đó là từ khoá của Java
 */
@Entity
@jakarta.persistence.Table(name = "Packages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimePackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "packages_id")
    private Long packagesId;

    @Column(nullable = false, length = 100)
    private String name;

    /** So gio mua duoc khi chon goi nay */
    @Column(name = "hours_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal hoursAmount;

    /** Gia tien (VND) */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private PackageStatus status = PackageStatus.AVAILABLE;

    public enum PackageStatus {
        AVAILABLE, DISABLED
    }
}
