package org.example.cowordptit.repository;

import org.example.cowordptit.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByCustomer_UsersId(Long customerId);

    List<ServiceRequest> findByStatus(ServiceRequest.RequestStatus status);

    List<ServiceRequest> findByCustomer_UsersIdAndStatus(Long customerId, ServiceRequest.RequestStatus status);
}
