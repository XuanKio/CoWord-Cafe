package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.PaymentRecord;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.repository.PaymentRepository;
import org.example.cowordptit.repository.ServiceRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PaymentController — Quản lý thanh toán
 * GET /api/payments → tất cả giao dịch
 * GET /api/payments/request/{id} → giao dịch theo yêu cầu
 * POST /api/payments → tạo giao dịch thanh toán (admin dùng sau khi APPROVED)
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final ServiceRequestRepository requestRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(paymentRepository.findAll().stream()
                .map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<List<Map<String, Object>>> getByRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(
                paymentRepository.findByServiceRequest_ServiceRequestsId(requestId)
                        .stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PaymentRequest req) {
        ServiceRequest serviceRequest = requestRepository.findById(req.getServiceRequestsId()).orElse(null);
        if (serviceRequest == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Yêu cầu không tồn tại"));
        }

        PaymentRecord payment = new PaymentRecord();
        payment.setServiceRequest(serviceRequest);
        payment.setAmount(req.getAmount());
        payment.setPaymentMethod(PaymentRecord.PaymentMethod.valueOf(req.getPaymentMethod()));
        payment.setCreatedAt(LocalDateTime.now());

        // Đổi trạng thái yêu cầu → PAID
        serviceRequest.setStatus(ServiceRequest.RequestStatus.PAID);
        requestRepository.save(serviceRequest);

        PaymentRecord saved = paymentRepository.save(payment);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("success", true, "payment", toMap(saved)));
    }

    private Map<String, Object> toMap(PaymentRecord p) {
        Map<String, Object> map = new HashMap<>();
        map.put("transactionsId", p.getTransactionsId());
        map.put("serviceRequestsId", p.getServiceRequest().getServiceRequestsId());
        map.put("amount", p.getAmount());
        map.put("paymentMethod", p.getPaymentMethod().name());
        map.put("createdAt", p.getCreatedAt().toString());
        return map;
    }

    public static class PaymentRequest {
        private Long serviceRequestsId;
        private BigDecimal amount;
        private String paymentMethod;

        public Long getServiceRequestsId() {
            return serviceRequestsId;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setServiceRequestsId(Long id) {
            this.serviceRequestsId = id;
        }

        public void setAmount(BigDecimal a) {
            this.amount = a;
        }

        public void setPaymentMethod(String m) {
            this.paymentMethod = m;
        }
    }
}
