package org.example.cowordptit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;


@Entity
@jakarta.persistence.Table(name = "Transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transactions_id")
    private Long transactionsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_requests_id", nullable = false)
    private ServiceRequest serviceRequest;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 10)
    private PaymentMethod paymentMethod;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum PaymentMethod {
        CASH, BANK, MOMO
    }
}
