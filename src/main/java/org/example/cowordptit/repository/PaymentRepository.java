package org.example.cowordptit.repository;

import org.example.cowordptit.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRepository extends JpaRepository<PaymentRecord, Long> {
    List<PaymentRecord> findByServiceRequest_ServiceRequestsId(Long requestId);
}
