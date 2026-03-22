package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * CafeSession — Phiên ngồi của khách (tên bảng DB: Sessions)
 * Lưu ý: "Sessions" là reserved keyword trong MySQL →
 * globally_quoted_identifiers=true sẽ xử lý
 * Lưu ý: không đặt tên class là "Session" vì trùng với HttpSession của Java
 * Servlet
 */
@Entity
@jakarta.persistence.Table(name = "Sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CafeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sessions_id")
    private Long sessionsId;

    /** Khách hàng đang ngồi */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "users_id", nullable = false)
    private Customer customer;

    @Column(name = "check_in", nullable = false)
    private LocalDateTime checkIn;

    @Column(name = "check_out")
    private LocalDateTime checkOut;

    /** Số giờ đã dùng trong phiên này (tính khi check-out) */
    @Column(name = "hours_used", precision = 10, scale = 2)
    private BigDecimal hoursUsed = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SessionStatus status = SessionStatus.ONGOING;

    public enum SessionStatus {
        ONGOING, COMPLETED
    }
}
