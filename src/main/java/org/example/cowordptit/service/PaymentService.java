package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.PaymentRecord;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.repository.PaymentRepository;
import org.example.cowordptit.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ServiceRequestRepository requestRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll() {
        return paymentRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getByRequest(Long requestId) {
        return paymentRepository.findByServiceRequest_ServiceRequestsId(requestId).stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> create(Long serviceRequestId, BigDecimal amount, String paymentMethod) {
        ServiceRequest serviceRequest = requestRepository.findById(serviceRequestId).orElse(null);
        if (serviceRequest == null) {
            throw new IllegalArgumentException("Yêu cầu không tồn tại");
        }

        PaymentRecord.PaymentMethod parsedMethod;
        try {
            parsedMethod = PaymentRecord.PaymentMethod.valueOf(paymentMethod.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ. Dùng: CASH, BANK, MOMO");
        }

        PaymentRecord payment = new PaymentRecord();
        payment.setServiceRequest(serviceRequest);
        payment.setAmount(amount);
        payment.setPaymentMethod(parsedMethod);
        payment.setCreatedAt(LocalDateTime.now());

        serviceRequest.setStatus(ServiceRequest.RequestStatus.PAID);
        requestRepository.save(serviceRequest);

        return toMap(paymentRepository.save(payment));
    }

    private Map<String, Object> toMap(PaymentRecord payment) {
        Map<String, Object> map = new HashMap<>();
        map.put("transactionsId", payment.getTransactionsId());
        map.put("serviceRequestsId", payment.getServiceRequest().getServiceRequestsId());
        map.put("amount", payment.getAmount());
        map.put("paymentMethod", payment.getPaymentMethod().name());
        map.put("createdAt", payment.getCreatedAt().toString());
        return map;
    }
}
