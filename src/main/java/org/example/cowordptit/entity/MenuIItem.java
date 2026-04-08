package org.example.cowordptit.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * CafeService — Dịch vụ (đồ ăn / nước uống), tên bảng DB: Services
 * Lưu ý: không đặt tên class là "Service" vì trùng với @Service annotation
 */
@Entity
@jakarta.persistence.Table(name = "Services")
public class MenuIItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "services_id")
    private Long servicesId;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ServiceType type;

    /** Gia tien (VND) */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private ServiceStatus status = ServiceStatus.AVAILABLE;

    public enum ServiceType {
        FOOD, DRINK
    }

    public enum ServiceStatus {
        AVAILABLE, OUT_OF_STOCK
    }

    public MenuIItem() {
    }

    public MenuIItem(Long servicesId, String name, ServiceType type, BigDecimal price, ServiceStatus status) {
        this.servicesId = servicesId;
        this.name = name;
        this.type = type;
        this.price = price;
        this.status = status;
    }

    public Long getServicesId() {
        return servicesId;
    }

    public void setServicesId(Long servicesId) {
        this.servicesId = servicesId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ServiceType getType() {
        return type;
    }

    public void setType(ServiceType type) {
        this.type = type;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public ServiceStatus getStatus() {
        return status;
    }

    public void setStatus(ServiceStatus status) {
        this.status = status;
    }
}
