package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * CafeService — Dịch vụ (đồ ăn / nước uống), tên bảng DB: Services
 * Lưu ý: không đặt tên class là "Service" vì trùng với @Service annotation
 */
@Entity
@jakarta.persistence.Table(name = "Services")
@Data
@NoArgsConstructor
@AllArgsConstructor
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
}
