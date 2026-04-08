package org.example.cowordptit.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * TimePackage — Gói giờ (tên bảng DB: Packages)
 * Lưu ý: không đặt tên class là "Package" vì đó là từ khoá của Java
 */
@Entity
@jakarta.persistence.Table(name = "Packages")
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

    public TimePackage() {
    }

    public TimePackage(Long packagesId, String name, BigDecimal hoursAmount, BigDecimal price,
            PackageStatus status) {
        this.packagesId = packagesId;
        this.name = name;
        this.hoursAmount = hoursAmount;
        this.price = price;
        this.status = status;
    }

    public Long getPackagesId() {
        return packagesId;
    }

    public void setPackagesId(Long packagesId) {
        this.packagesId = packagesId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getHoursAmount() {
        return hoursAmount;
    }

    public void setHoursAmount(BigDecimal hoursAmount) {
        this.hoursAmount = hoursAmount;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public PackageStatus getStatus() {
        return status;
    }

    public void setStatus(PackageStatus status) {
        this.status = status;
    }
}
