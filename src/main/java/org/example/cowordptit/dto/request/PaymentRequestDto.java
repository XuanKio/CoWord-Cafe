package org.example.cowordptit.dto.request;

import java.math.BigDecimal;

public class PaymentRequestDto {
    private Long serviceRequestsId;
    private BigDecimal amount;
    private String paymentMethod;

    public Long getServiceRequestsId() {
        return serviceRequestsId;
    }

    public void setServiceRequestsId(Long serviceRequestsId) {
        this.serviceRequestsId = serviceRequestsId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}
