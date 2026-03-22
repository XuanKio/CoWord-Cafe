package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ServiceRequest — Yêu cầu gọi dịch vụ hoặc mua gói giờ của khách
 * services_id và packages_id là nullable — chỉ 1 trong 2 được đặt tùy loại yêu
 * cầu
 */
@Entity
@jakarta.persistence.Table(name = "Service_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "service_requests_id")
    private Long serviceRequestsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "users_id", nullable = false)
    private Customer customer;

    /** Phiên đang ngồi (null nếu là yêu cầu mua gói không gắn với phiên) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sessions_id")
    private CafeSession session;

    /** Dịch vụ đồ ăn/nước (null nếu là yêu cầu mua gói giờ) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "services_id")
    private CafeService service;

    /** Gói giờ (null nếu là yêu cầu gọi đồ ăn/nước) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "packages_id")
    private TimePackage timePackage;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(name = "total_price", precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RequestStatus {
        PENDING, APPROVED, PAID, CANCELLED
    }
}
